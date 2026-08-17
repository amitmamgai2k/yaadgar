import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getTopicProfile } from '../utils/topicProfiles';
import { getDriveImageUrls } from '../utils/driveImageUrl';
import MusicPlayer from './MusicPlayer';

// Validation patterns for URL params
const VALID_DRIVE_FILE_ID = /^[a-zA-Z0-9_-]+$/;
const VALID_PLAYLIST_ID = /^[a-zA-Z0-9_-]+$/;

// ── Particle System ──
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 4 + 2;
    this.speedX = (Math.random() - 0.5) * 8;
    this.speedY = (Math.random() - 0.5) * 8;
    this.gravity = 0.1;
    this.opacity = 1;
    this.decay = Math.random() * 0.02 + 0.01;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.speedY += this.gravity;
    this.speedX *= 0.98;
    this.opacity -= this.decay;
    this.rotation += this.rotationSpeed;
    this.size *= 0.99;
    return this.opacity > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;

    // Draw a small diamond/sparkle shape
    ctx.beginPath();
    const s = this.size;
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.6, 0);
    ctx.moveTo(0, -s);
    ctx.lineTo(-s * 0.6, 0);
    ctx.moveTo(0, s);
    ctx.lineTo(s * 0.6, 0);
    ctx.moveTo(0, s);
    ctx.lineTo(-s * 0.6, 0);
    ctx.closePath();
    ctx.fill();

    // Draw a filled circle too for a softer look
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function useParticleSystem() {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const animFrame = useRef(null);
  const isAnimating = useRef(false);

  const startLoop = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) { isAnimating.current = false; return; }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current = particles.current.filter((p) => {
        const alive = p.update();
        if (alive) p.draw(ctx);
        return alive;
      });

      if (particles.current.length > 0) {
        animFrame.current = requestAnimationFrame(loop);
      } else {
        isAnimating.current = false;
      }
    };

    animFrame.current = requestAnimationFrame(loop);
  }, []);

  const burst = useCallback((x, y, primaryColor, accentColor) => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const count = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.4 ? primaryColor : accentColor;
      particles.current.push(new Particle(x, y, color));
    }
    startLoop();
  }, [startLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrame.current);
    };
  }, []);

  return { canvasRef, burst };
}

// ── Live Clock ──
function useClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

// ── Animated Online Count ──
function useOnlineCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Start with a random "online" count and fluctuate
    const base = Math.floor(Math.random() * 150) + 50;
    setCount(base);

    const id = setInterval(() => {
      setCount((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        return Math.max(10, prev + delta);
      });
    }, 3000);

    return () => clearInterval(id);
  }, []);

  return count;
}

// ── Main Component ──
export default function MemoryExperience() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const img = searchParams.get('img');
  const topic = searchParams.get('topic');
  const list = searchParams.get('list');

  // Validate URL params to prevent injection via crafted links
  const imgValid = img && VALID_DRIVE_FILE_ID.test(img);
  const listValid = list && VALID_PLAYLIST_ID.test(list);

  const profile = useMemo(() => getTopicProfile(topic), [topic]);
  const clock = useClock();
  const onlineCount = useOnlineCount();
  const { canvasRef, burst } = useParticleSystem();

  // ── Rotating Quotes ──
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);

  useEffect(() => {
    if (!profile?.quotes?.length) return;

    const interval = setInterval(() => {
      setQuoteFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % profile.quotes.length);
        setQuoteFading(false);
      }, 600);
    }, 4500);

    return () => clearInterval(interval);
  }, [profile]);

  // ── Central Visual Click ──
  const centralRef = useRef(null);

  const handleVisualClick = useCallback(() => {
    const el = centralRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    burst(x, y, profile.particleColor, profile.particleAccent);
  }, [burst, profile]);

  // ── Keyboard trigger (Space/Enter on the page) ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        // Don't trigger if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        handleVisualClick();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleVisualClick]);

  // ── Missing params guard ──
  if (!imgValid || !topic || !listValid) {
    return (
      <div className="error-state">
        <div className="error-state__icon">🔗</div>
        <h2 className="error-state__title">This memory link looks incomplete</h2>
        <p className="error-state__text">
          Some information is missing or invalid in the URL. Try creating a new memory or check that the link wasn't truncated.
        </p>
        <button className="error-state__btn" onClick={() => navigate('/')}>
          Create a Memory
        </button>
      </div>
    );
  }

  const [bgUrlIndex, setBgUrlIndex] = useState(0);
  const imageUrls = useMemo(() => getDriveImageUrls(img), [img]);
  const imageUrl = imageUrls[bgUrlIndex];
  const handleBgError = useCallback(() => {
    setBgUrlIndex((prev) => Math.min(prev + 1, imageUrls.length - 1));
  }, [imageUrls.length]);

  return (
    <div className="memory-screen">
      {/* ── Background Stack ── */}
      <div className="memory-bg">
        {/* Background uses a real <img> so load failures can cascade to fallback URLs */}
        <img
          className="memory-bg__image"
          src={imageUrl}
          onError={handleBgError}
          alt=""
          draggable={false}
        />
        <div className="memory-bg__gradient" />
        <div
          className="memory-bg__warmth"
          style={{ background: profile.gradientTint }}
        />
      </div>

      <div className="vignette" />
      <div className="film-grain" />

      {/* ── Particle Canvas ── */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* ── Top Bar ── */}
      <div className="top-bar">
        <div className="top-bar__clock">{clock}</div>
        <div className="top-bar__online">
          <span className="top-bar__online-dot" />
          {onlineCount} online
        </div>
        <div className="top-bar__music-labels">
          <span className="top-bar__music-label">Spotify</span>
          <span className="top-bar__music-label">YT Music</span>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="memory-content">
        {/* Title */}
        <div className="memory-title">
          {profile.title.map((line, i) => {
            // Detect if line contains Devanagari characters
            const isHindi = /[\u0900-\u097F]/.test(line);
            return (
              <div
                key={i}
                className={`memory-title__line${isHindi ? ' memory-title__line--hindi' : ''}`}
              >
                {line}
              </div>
            );
          })}
        </div>

        {/* Central Visual */}
        <div
          ref={centralRef}
          className="central-visual"
          onClick={handleVisualClick}
          role="button"
          tabIndex={0}
          aria-label={`${topic} — click for animation`}
        >
          <span className="central-visual__icon">{profile.icon}</span>
        </div>

        {/* Detail Labels */}
        <div className="detail-labels">
          {profile.detailLabels.map((label, i) => (
            <span key={i} className="detail-label">{label}</span>
          ))}
        </div>

        {/* Rotating Quote */}
        <div className="quote-container">
          <p className={`quote-text ${quoteFading ? 'quote-text--fade-out' : 'quote-text--fade-in'}`}>
            "{profile.quotes[quoteIndex]}"
          </p>
        </div>
      </div>

      {/* ── Music Player ── */}
      <MusicPlayer playlistId={list} />
    </div>
  );
}
