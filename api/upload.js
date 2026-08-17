import 'dotenv/config';
import { Readable } from 'stream';

// Vercel serverless functions receive the raw body as a Buffer
// when the content type is multipart/form-data, so we parse it with busboy.
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// ── Rate Limiting (in-memory, resets on cold start) ──
const rateLimit = new Map(); // IP -> { count, resetTime }
const RATE_LIMIT_WINDOW = 3600 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10; // max uploads per IP per window

function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
           || req.headers['x-real-ip']
           || 'unknown';
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ── CORS origin ──
function getAllowedOrigin() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

/**
 * Parse multipart form data from the request.
 * Returns { buffer, mimetype, filename } for the first file field.
 */
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    // Dynamic import so this only loads in the serverless runtime
    import('busboy').then(({ default: Busboy }) => {
      const busboy = Busboy({
        headers: req.headers,
        limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      });

      let fileData = null;

      busboy.on('file', (_fieldname, stream, info) => {
        const { filename, mimeType } = info;

        if (!ALLOWED_MIMETYPES.has(mimeType)) {
          stream.resume(); // drain the stream
          reject(new Error(`Invalid file type: ${mimeType}. Only JPEG, PNG, and WebP are allowed.`));
          return;
        }

        const chunks = [];
        let totalSize = 0;

        stream.on('data', (chunk) => {
          totalSize += chunk.length;
          if (totalSize > MAX_FILE_SIZE) {
            stream.destroy();
            reject(new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB.`));
            return;
          }
          chunks.push(chunk);
        });

        stream.on('end', () => {
          fileData = {
            buffer: Buffer.concat(chunks),
            mimetype: mimeType,
            filename: filename || 'upload.jpg',
          };
        });

        stream.on('limit', () => {
          reject(new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB.`));
        });
      });

      busboy.on('finish', () => {
        if (!fileData) {
          reject(new Error('No image file found in the request.'));
        } else {
          resolve(fileData);
        }
      });

      busboy.on('error', reject);

      // Pipe the request body into busboy
      if (req.body && Buffer.isBuffer(req.body)) {
        const readable = new Readable();
        readable.push(req.body);
        readable.push(null);
        readable.pipe(busboy);
      } else {
        req.pipe(busboy);
      }
    }).catch(reject);
  });
}

async function getDriveClient() {
  const { google } = await import('googleapis');
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    const err = new Error('Google Drive OAuth is not configured.');
    err.statusCode = 401;
    throw err;
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: 'v3', auth });
}

/**
 * POST /api/upload
 *
 * Accepts a multipart/form-data request with a single image file.
 * Uploads it to Google Drive, makes it publicly readable, and
 * returns { success: true, fileId }.
 */
export default async function handler(req, res) {
  // CORS headers — restrict to the actual frontend origin
  const origin = getAllowedOrigin();
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  // Rate limit check
  if (!checkRateLimit(req)) {
    return res.status(429).json({
      success: false,
      error: 'Too many uploads. Please try again later.',
    });
  }

  try {
    // 1. Parse the uploaded file
    const { buffer, mimetype, filename } = await parseMultipart(req);

    // 2. Get Drive client
    const drive = await getDriveClient();

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 3. Upload file to Google Drive
    const timestamp = Date.now();
    const safeName = `memory_${timestamp}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const fileMetadata = { name: safeName };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: mimetype,
      body: Readable.from(buffer),
    };

    const uploaded = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
      supportsAllDrives: true,
    });

    const fileId = uploaded.data.id;

    // 4. Make the file publicly readable
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });

    // 5. Return the file ID
    return res.status(200).json({ success: true, fileId });
  } catch (err) {
    // Log only structured, safe details — never the full error object
    console.error('Upload error:', { message: err.message, code: err.code, status: err.status });

    // Determine user-facing message — never leak internal details or env var values
    let userMessage = 'Upload failed. Please try again later.';
    let statusCode = 500;

    if (err.message?.includes('Invalid file type') || err.message?.includes('exceeds maximum') || err.message?.includes('No image file')) {
      // These are safe, user-caused validation errors
      userMessage = err.message;
      statusCode = 400;
    } else if (err.statusCode === 401) {
      userMessage = 'Google Drive is not connected. Please contact the site owner.';
      statusCode = 401;
    } else if (err.code === 403 && err.errors?.some((e) => e.reason === 'storageQuotaExceeded')) {
      userMessage = 'Upload storage is currently full. Please try again later.';
    } else if (err.status === 403) {
      userMessage = 'Upload failed due to a permissions issue. Please contact the site owner.';
    } else if (err.status === 404) {
      userMessage = 'Upload destination not found. Please contact the site owner.';
    }

    return res.status(statusCode).json({
      success: false,
      error: userMessage,
    });
  }
}
