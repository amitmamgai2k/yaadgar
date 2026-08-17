// ── Local Development Server Only ──
// This file is NOT used in production. The deployed Vercel app uses api/upload.js.
if (process.env.VERCEL) {
  throw new Error('server.js is for local development only. Production should use the api/ serverless functions.');
}

import 'dotenv/config';
import http from 'http';
import { Readable } from 'stream';
import { Buffer } from 'buffer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import Busboy from 'busboy';

const PORT = Number(process.argv[2] || process.env.PORT || 3001);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, '.google-oauth-token.json');

// ── Rate Limiting (in-memory) ──
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 3600 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10;

function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
           || req.socket.remoteAddress
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

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    });

    let fileData = null;

    busboy.on('file', (_fieldname, stream, info) => {
      const { filename, mimeType } = info;

      if (!ALLOWED_MIMETYPES.has(mimeType)) {
        stream.resume();
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
    req.pipe(busboy);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function getOAuthRedirectUri() {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || `http://localhost:${PORT}/api/auth/google/callback`;
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, getOAuthRedirectUri());
}

async function loadOAuthTokens() {
  if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    return { refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN };
  }

  try {
    return JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function saveOAuthTokens(tokens) {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

async function clearOAuthTokens() {
  try {
    await fs.unlink(TOKEN_PATH);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function getAuthUrl() {
  const auth = getOAuthClient();
  return auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPES,
  });
}

async function getDriveClient() {
  const auth = getOAuthClient();
  const tokens = await loadOAuthTokens();

  if (!tokens?.refresh_token) {
    const err = new Error('Google Drive is not connected. Connect Google Drive with OAuth first.');
    err.statusCode = 401;
    err.authUrl = getAuthUrl();
    throw err;
  }

  auth.setCredentials(tokens);
  return google.drive({ version: 'v3', auth });
}

const server = http.createServer(async (req, res) => {
  const allowedOrigin = getFrontendUrl();
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/auth/status') {
      const tokens = await loadOAuthTokens();
      let configured = true;

      try {
        getOAuthClient();
      } catch {
        configured = false;
      }

      sendJson(res, 200, {
        configured,
        authenticated: Boolean(tokens?.refresh_token),
        authUrl: configured ? getAuthUrl() : null,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/google') {
      res.statusCode = 302;
      res.setHeader('Location', getAuthUrl());
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/google/callback') {
      const code = url.searchParams.get('code');
      const oauthError = url.searchParams.get('error');

      // Google redirects here without a code when the user denies consent
      // (or when the OAuth client / redirect URI is misconfigured). Never 500.
      if (!code) {
        const reason = oauthError || 'missing_code';
        res.statusCode = 302;
        res.setHeader('Location', `${getFrontendUrl()}/?google=error&error=${encodeURIComponent(reason)}`);
        res.end();
        return;
      }

      const auth = getOAuthClient();
      const { tokens } = await auth.getToken(code);
      await saveOAuthTokens(tokens);

      res.statusCode = 302;
      res.setHeader('Location', `${getFrontendUrl()}/?google=connected`);
      res.end();
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      await clearOAuthTokens();
      sendJson(res, 200, { success: true });
      return;
    }

    if (req.method !== 'POST' || url.pathname !== '/api/upload') {
      sendJson(res, 404, { success: false, error: 'Not found.' });
      return;
    }

    // Rate limit upload requests
    if (!checkRateLimit(req)) {
      sendJson(res, 429, { success: false, error: 'Too many uploads. Please try again later.' });
      return;
    }

    const { buffer, mimetype, filename } = await parseMultipart(req);
    const drive = await getDriveClient();

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const timestamp = Date.now();
    const safeName = `memory_${timestamp}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const requestBody = { name: safeName };

    if (folderId) {
      requestBody.parents = [folderId];
    }

    const uploaded = await drive.files.create({
      requestBody,
      media: { mimeType: mimetype, body: Readable.from(buffer) },
      fields: 'id',
      supportsAllDrives: true,
    });

    const fileId = uploaded.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    sendJson(res, 200, { success: true, fileId });
  } catch (err) {
    // Log only structured, safe details — never the full error object
    console.error('API error:', { message: err.message, code: err.code, status: err.status });

    // Determine user-facing message — never leak internal details or env var values
    let userMessage = 'An unexpected error occurred.';
    let statusCode = 500;

    if (err.message?.includes('Invalid file type') || err.message?.includes('exceeds maximum') || err.message?.includes('No image file')) {
      userMessage = err.message;
      statusCode = 400;
    } else if (err.statusCode === 401) {
      userMessage = 'Google Drive is not connected. Please connect via OAuth first.';
      statusCode = 401;
    } else if (err.code === 403 && err.errors?.some((e) => e.reason === 'storageQuotaExceeded')) {
      userMessage = 'Upload storage is currently full. Please try again later.';
    } else if (err.status === 403) {
      userMessage = 'Upload failed due to a permissions issue. Check server configuration.';
    } else if (err.status === 404) {
      userMessage = 'Upload destination not found. Check server configuration.';
    }

    sendJson(res, statusCode, {
      success: false,
      error: userMessage,
      authRequired: statusCode === 401,
      authUrl: err.authUrl,
    });
  }
});

server.listen(PORT, () => {
  console.log(`Local API running on http://localhost:${PORT}`);
});
