import { useState, useEffect, useRef, useCallback } from 'react';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

/**
 * MusicPlayer — custom glass UI controlling a hidden YouTube IFrame embed.
 *
 * Props:
 *   playlistId: string — YouTube playlist ID
 */
export default function MusicPlayer({ playlistId }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const progressInterval = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('Loading…');
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // ── Load YouTube IFrame API ──
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    // Prevent double-loading the script
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      clearInterval(progressInterval.current);
    };
  }, [playlistId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize Player ──
  const initPlayer = useCallback(() => {
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch (_) { /* noop */ }
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '180',
      width: '320',
      playerVars: {
        listType: 'playlist',
        list: playlistId,
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: handleReady,
        onStateChange: handleStateChange,
        onError: handleError,
      },
    });
  }, [playlistId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReady = useCallback(() => {
    setIsReady(true);
    const player = playerRef.current;

    // Try to play — if autoplay is blocked, show the overlay
    try {
      player.playVideo();
    } catch (_) { /* noop */ }

    // Give the browser a moment to see if autoplay succeeded
    setTimeout(() => {
      try {
        const state = player.getPlayerState();
        // -1 = unstarted, 2 = paused, 5 = cued — means autoplay was blocked
        if (state === -1 || state === 2 || state === 5) {
          setNeedsInteraction(true);
        }
      } catch (_) {
        setNeedsInteraction(true);
      }
    }, 1500);
  }, []);

  const handleStateChange = useCallback((e) => {
    const state = e.data;
    const player = playerRef.current;

    if (state === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      setNeedsInteraction(false);
      updateTrackInfo(player);
      startProgressTracking(player);
    } else if (state === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
      try { setCurrentTime(player.getCurrentTime() || 0); } catch (_) { /* noop */ }
      clearInterval(progressInterval.current);
    } else if (state === window.YT.PlayerState.ENDED) {
      // Playlist might auto-advance; if not, re-cue
      setIsPlaying(false);
      clearInterval(progressInterval.current);
    } else if (state === window.YT.PlayerState.CUED) {
      updateTrackInfo(player);
    }
  }, []);

  const handleError = useCallback(() => {
    // Skip to next track on error (e.g. unavailable video)
    try {
      playerRef.current?.nextVideo();
    } catch (_) { /* noop */ }
  }, []);

  // ── Track Info ──
  const updateTrackInfo = useCallback((player) => {
    try {
      const data = player.getVideoData();
      if (data?.title) setCurrentTitle(data.title);
      if (data?.video_id) setCurrentVideoId(data.video_id);
      setDuration(player.getDuration() || 0);
    } catch (_) { /* noop */ }
  }, []);

  // ── Progress Tracking ──
  const startProgressTracking = useCallback((player) => {
    clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      try {
        const current = player.getCurrentTime() || 0;
        const total = player.getDuration() || 0;
        setCurrentTime(current);
        setProgress(total > 0 ? (current / total) * 100 : 0);
        setDuration(total);

        // Update track info in case it changed (playlist advancement)
        const data = player.getVideoData();
        if (data?.title && data.title !== currentTitle) {
          setCurrentTitle(data.title);
        }
        if (data?.video_id && data.video_id !== currentVideoId) {
          setCurrentVideoId(data.video_id);
        }
      } catch (_) { /* noop */ }
    }, 500);
  }, [currentTitle, currentVideoId]);

  // ── Controls ──
  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } catch (_) { /* noop */ }
  }, [isPlaying]);

  const prevTrack = useCallback(() => {
    try { playerRef.current?.previousVideo(); } catch (_) { /* noop */ }
  }, []);

  const nextTrack = useCallback(() => {
    try { playerRef.current?.nextVideo(); } catch (_) { /* noop */ }
  }, []);

  const seekTo = useCallback((e) => {
    const player = playerRef.current;
    if (!player || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    try {
      player.seekTo(percent * duration, true);
    } catch (_) { /* noop */ }
  }, [duration]);

  const handleAutoplayClick = useCallback(() => {
    setNeedsInteraction(false);
    try {
      playerRef.current?.playVideo();
    } catch (_) { /* noop */ }
  }, []);

  const artUrl = currentVideoId
    ? `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`
    : null;

  return (
    <>
      {/* Hidden YouTube Player — off-screen, nonzero size */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '320px',
          height: '180px',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div ref={containerRef} />
      </div>

      {/* Autoplay Overlay */}
      {needsInteraction && (
        <div className="autoplay-overlay" onClick={handleAutoplayClick}>
          <div className="autoplay-overlay__content">
            <div className="autoplay-overlay__icon">🎵</div>
            <div className="autoplay-overlay__text">Tap to start the memory</div>
            <div className="autoplay-overlay__sub">Music will begin playing</div>
          </div>
        </div>
      )}

      {/* Custom Glass Player UI */}
      <div className={`music-player${isPlaying ? ' music-player--playing' : ''}`}>
        {/* Album Art */}
        <div className="music-player__art">
          {artUrl ? (
            <img src={artUrl} alt="Album art" />
          ) : (
            <div className="music-player__art-placeholder">🎵</div>
          )}
        </div>

        {/* Track Info + Progress */}
        <div className="music-player__info">
          <div className="music-player__title">{currentTitle}</div>
          <div className="music-player__subtitle">YouTube Playlist</div>
          <div className="music-player__progress" onClick={seekTo}>
            <div
              className="music-player__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="music-player__time">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="music-player__controls">
          <button className="music-ctrl" onClick={prevTrack} title="Previous" aria-label="Previous track">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button
            className={`music-ctrl music-ctrl--play${isPlaying ? ' music-ctrl--pause' : ''}`}
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button className="music-ctrl" onClick={nextTrack} title="Next" aria-label="Next track">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
