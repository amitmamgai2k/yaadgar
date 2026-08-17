import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDriveImageUrls } from '../utils/driveImageUrl';

const TOPIC_CHIPS = [
  'Independence Day', 'Cyber Cafe', 'School Days', 'Old Delhi', 'Cricket',
  'Diwali', '90s India', 'College Canteen', 'First Mobile Phone', 'Summer Vacation',
];

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PLAYLIST_REGEX = /[?&]list=([a-zA-Z0-9_-]+)/;
const VALID_DRIVE_FILE_ID = /^[a-zA-Z0-9_-]+$/;
const VALID_PLAYLIST_ID = /^[a-zA-Z0-9_-]+$/;

export default function SetupScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillImgId = searchParams.get('img');
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  // ── State ──
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [topic, setTopic] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistId, setPlaylistId] = useState(null);
  const [imageError, setImageError] = useState('');
  const [playlistError, setPlaylistError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [authNotice, setAuthNotice] = useState(null);
  const [previewUrlIndex, setPreviewUrlIndex] = useState(0);

  // ── Prefill from URL (for "Edit Memory" flow) ──
  useEffect(() => {
    const prefillTopic = searchParams.get('topic');
    const prefillList = searchParams.get('list');
    const prefillImg = searchParams.get('img');

    if (prefillTopic) setTopic(prefillTopic);
    if (prefillList && VALID_PLAYLIST_ID.test(prefillList)) {
      setPlaylistUrl(`https://www.youtube.com/playlist?list=${prefillList}`);
      setPlaylistId(prefillList);
    }
    if (prefillImg && VALID_DRIVE_FILE_ID.test(prefillImg)) {
      // Show the Drive-hosted image as a preview (no file to re-upload)
      setImagePreview(getDriveImageUrls(prefillImg)[0]);
      setPreviewUrlIndex(0);
    }

    // OAuth result from the Google callback redirect
    const oauthResult = searchParams.get('google');
    if (oauthResult === 'connected') {
      setAuthNotice({ type: 'success', message: 'Google Drive connected successfully. You can upload memories now.' });
    } else if (oauthResult === 'error') {
      const reason = searchParams.get('error') || 'unknown';
      setAuthNotice({
        type: 'error',
        message: reason === 'access_denied'
          ? 'Google sign-in was cancelled. You can connect Google Drive when you are ready to upload.'
          : `Google sign-in failed (${reason}). Check the OAuth client ID and redirect URI in your .env.`,
      });
    }
  }, [searchParams]);

  // ── Image Handling ──
  const compressImageFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return file;

    try {
      const imageSource = await new Promise((resolve, reject) => {
        if (typeof createImageBitmap === 'function') {
          createImageBitmap(file)
            .then(resolve)
            .catch(reject);
          return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Unable to read image.'));
        };

        img.src = objectUrl;
      });

      const sourceWidth = imageSource.width || 1;
      const sourceHeight = imageSource.height || 1;
      const maxSourceDimension = Math.max(sourceWidth, sourceHeight);
      const scale = maxSourceDimension > 1920 ? 1920 / maxSourceDimension : 1;
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) return file;

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(imageSource, 0, 0, width, height);

      const qualities = [0.82, 0.72, 0.6, 0.5];
      let bestBlob = null;

      for (const quality of qualities) {
        const blob = await new Promise((resolve) => {
          canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
        });

        if (!blob) continue;

        if (blob.size <= 3.5 * 1024 * 1024) {
          return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
        }

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }
      }

      if (bestBlob) {
        return new File([bestBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }

      return file;
    } catch (error) {
      return file;
    }
  }, []);

  const handleImageFile = useCallback(async (file) => {
    setImageError('');
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      setImageError('Please upload a JPG, PNG, or WebP image.');
      return;
    }

    setIsCompressingImage(true);

    try {
      const processedFile = await compressImageFile(file);
      setImageFile(processedFile);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(processedFile);

      if (processedFile.size > 4 * 1024 * 1024) {
        setImageError('This photo is still too large for upload. Please choose a smaller one.');
      }
    } catch (error) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingImage(false);
    }
  }, [compressImageFile]);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
    setPreviewUrlIndex(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handlePreviewError = useCallback(() => {
    setPreviewUrlIndex((prev) => {
      if (!prefillImgId) return prev;
      const urls = getDriveImageUrls(prefillImgId);
      const next = Math.min(prev + 1, urls.length - 1);
      setImagePreview(urls[next]);
      return next;
    });
  }, [prefillImgId]);

  // ── Playlist Validation ──
  const handlePlaylistChange = useCallback((e) => {
    const url = e.target.value;
    setPlaylistUrl(url);
    setPlaylistError('');

    if (!url.trim()) {
      setPlaylistId(null);
      return;
    }

    const match = url.match(PLAYLIST_REGEX);
    if (match) {
      setPlaylistId(match[1]);
      setPlaylistError('');
    } else {
      setPlaylistId(null);
      if (url.length > 10) {
        setPlaylistError('Could not find a playlist ID. Make sure the URL contains "list=..."');
      }
    }
  }, []);

  // ── Form Validity ──
  const hasImage = !!imageFile || !!prefillImgId;
  const isValid = hasImage && topic.trim().length > 0 && !!playlistId;

  // ── Submit ──
  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      let fileId;

      // If we already have a Drive file ID from prefill and no new file was selected, reuse it
      if (!imageFile && prefillImgId) {
        fileId = prefillImgId;
      } else {
        // Upload the image to the serverless function
        const formData = new FormData();
        formData.append('image', imageFile);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const rawText = await res.text();
        let data = {};

        try {
          data = rawText ? JSON.parse(rawText) : {};
        } catch (parseError) {
          if (res.status === 413) {
            throw new Error('That image is too large even after compression — please try a smaller photo.');
          }

          if (res.status === 504) {
            throw new Error('The upload timed out. Please try again.');
          }

          throw new Error('Upload failed. Please try again in a moment.');
        }

        if (!res.ok || !data.success) {
          if (data.authRequired && data.authUrl) {
            window.location.href = data.authUrl;
            return;
          }
          throw new Error(data.error || 'Upload failed. Please try again.');
        }

        fileId = data.fileId;
      }

      // Navigate to the memory experience
      const params = new URLSearchParams({
        img: fileId,
        topic: topic.trim(),
        list: playlistId,
      });

      navigate(`/view?${params.toString()}`);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="setup-screen">
      <div className="setup-screen__bg" />
      <div className="film-grain" />

      <div className="setup-card glass-card">
        {/* Logo */}
        <div className="setup-card__logo">
          <div className="setup-card__logo-icon" aria-hidden="true">
            <span>🎞️</span>
          </div>
          <h1>Cassette</h1>
          <p>Craft a beautiful interactive website from your memory</p>
        </div>

        {authNotice && (
          <div className={`oauth-banner oauth-banner--${authNotice.type}`} role="status">
            {authNotice.message}
          </div>
        )}

        {/* ── Image Upload ── */}
        <div className="form-section">
          <label className="form-label">Background Image</label>

          {imagePreview ? (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" onError={handlePreviewError} />
              <div className="image-preview__actions">
                <button
                  className="image-preview__btn image-preview__btn--replace"
                  onClick={() => replaceInputRef.current?.click()}
                >
                  Replace
                </button>
                <button
                  className="image-preview__btn image-preview__btn--remove"
                  onClick={removeImage}
                >
                  Remove
                </button>
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          ) : (
            <div
              className={`upload-zone${isDragOver ? ' upload-zone--dragover' : ''}${isCompressingImage ? ' upload-zone--loading' : ''}`}
              onClick={() => !isCompressingImage && fileInputRef.current?.click()}
              onDragOver={(e) => { if (!isCompressingImage) { e.preventDefault(); setIsDragOver(true); } }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { if (!isCompressingImage) handleFileDrop(e); }}
            >
              <div className="upload-zone__icon">📸</div>
              <div className="upload-zone__text">
                {isCompressingImage ? <strong>Optimizing photo…</strong> : <><strong>Click to upload</strong> or drag and drop</>}
              </div>
              <div className="upload-zone__formats">JPG, PNG, or WebP • Large photos are optimized automatically</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {imageError && <div className="field-error">⚠ {imageError}</div>}
        </div>

        {/* ── Topic ── */}
        <div className="form-section">
          <label className="form-label" htmlFor="topic-input">What's the memory?</label>
          <input
            id="topic-input"
            className="text-input"
            type="text"
            placeholder="e.g. Cyber Cafe, Diwali, School Days..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={60}
          />
          <div className="chip-row">
            {TOPIC_CHIPS.map((chip) => (
              <button
                key={chip}
                className={`chip${topic === chip ? ' chip--active' : ''}`}
                onClick={() => setTopic(chip)}
                type="button"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* ── Playlist ── */}
        <div className="form-section">
          <label className="form-label" htmlFor="playlist-input">Paste YouTube Playlist URL</label>
          <input
            id="playlist-input"
            className="text-input"
            type="url"
            placeholder="https://www.youtube.com/playlist?list=PL..."
            value={playlistUrl}
            onChange={handlePlaylistChange}
          />
          {playlistError && <div className="field-error">⚠ {playlistError}</div>}
          {playlistId && !playlistError && (
            <div style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 4 }}>
              ✓ Playlist detected
            </div>
          )}
        </div>

        {/* ── Submit ── */}
        <button
          className={`submit-btn${isSubmitting ? ' submit-btn--loading' : ''}`}
          disabled={!isValid || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Generating website…' : 'Generate Website'}
        </button>

        {submitError && <div className="inline-error">{submitError}</div>}
      </div>
    </div>
  );
}
