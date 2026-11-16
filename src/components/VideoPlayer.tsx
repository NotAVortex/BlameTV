"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

const SPEEDS = [1, 1.25, 1.5, 2, 0.5];

export default function VideoPlayer({ src, poster }: { src: string; poster?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controls, setControls] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setControls(true);
    hideTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && !scrubbing) setControls(false);
    }, 2500);
  }, [scrubbing]);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      if (v.ended) v.currentTime = 0;
      v.play();
    } else {
      v.pause();
    }
    scheduleHide();
  }

  function seekTo(ratio: number) {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    v.currentTime = Math.max(0, Math.min(1, ratio)) * v.duration;
    setCurrent(v.currentTime);
  }

  function barRatio(e: { clientX: number }): number {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return (e.clientX - rect.left) / rect.width;
  }

  function onBarPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    setScrubbing(true);
    seekTo(barRatio(e));
    const move = (ev: PointerEvent) => seekTo(barRatio(ev));
    const up = () => {
      setScrubbing(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function changeVolume(next: number) {
    const v = videoRef.current;
    const clamped = Math.max(0, Math.min(1, next));
    setVolume(clamped);
    setMuted(clamped === 0);
    if (v) {
      v.volume = clamped;
      v.muted = clamped === 0;
    }
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
    if (!next && v.volume === 0) changeVolume(0.5);
  }

  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  function toggleFullscreen() {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else wrap.requestFullscreen().catch(() => {});
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const v = videoRef.current;
    if (!v) return;
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        e.preventDefault();
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
        scheduleHide();
        break;
      case "ArrowLeft":
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 5);
        scheduleHide();
        break;
      case "ArrowUp":
        e.preventDefault();
        changeVolume(v.volume + 0.1);
        scheduleHide();
        break;
      case "ArrowDown":
        e.preventDefault();
        changeVolume(v.volume - 0.1);
        scheduleHide();
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
    }
  }

  useEffect(() => {
    function onFsChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const playedPct = duration > 0 ? (current / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={scheduleHide}
      className={`group relative aspect-video w-full select-none overflow-hidden rounded-xl bg-black outline-none ${fullscreen ? "" : "rounded-xl"} ${controls ? "cursor-default" : "cursor-none"}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        preload="metadata"
        className="h-full w-full"
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
          scheduleHide();
        }}
        onPause={() => {
          setPlaying(false);
          setControls(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
          setControls(true);
        }}
        onTimeUpdate={(e) => {
          if (!scrubbing) setCurrent(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onProgress={(e) => {
          const v = e.currentTarget;
          if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
      />

      {!playing && (
        <button
          onClick={togglePlay}
          aria-label={ended ? "Replay" : "Play"}
          className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/25"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0f0f0f]/80 shadow-2xl transition-transform duration-200 hover:scale-110">
            {ended ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
                <path d="M3 12a9 9 0 109-9M3 3v6h6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="white" className="ml-1 h-7 w-7" aria-hidden="true">
                <path d="M6 4.5v15l13-7.5-13-7.5z" />
              </svg>
            )}
          </span>
        </button>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2 pt-8 transition-opacity duration-300 ${controls ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div
          ref={barRef}
          onPointerDown={onBarPointerDown}
          className="group/bar relative mb-2 h-3 cursor-pointer"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/25 transition-all group-hover/bar:h-1.5" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/40 transition-all group-hover/bar:h-1.5"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#3ea6ff] transition-all group-hover/bar:h-1.5"
            style={{ width: `${playedPct}%` }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-[#3ea6ff] shadow transition-transform group-hover/bar:scale-100"
            style={{ left: `${playedPct}%` }}
          />
        </div>

        <div className="flex items-center gap-1 text-white">
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="rounded p-1.5 transition-colors hover:bg-white/15">
            {playing ? (
              <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5" aria-hidden="true">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5" aria-hidden="true">
                <path d="M6 4.5v15l13-7.5-13-7.5z" />
              </svg>
            )}
          </button>

          <div className="group/vol flex items-center">
            <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="rounded p-1.5 transition-colors hover:bg-white/15">
              {muted || volume === 0 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M11 5L6 9H3v6h3l5 4V5z" />
                  <path d="M16 9l5 6M21 9l-5 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M11 5L6 9H3v6h3l5 4V5z" />
                  <path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1 w-0 cursor-pointer accent-white opacity-0 transition-all duration-300 group-hover/vol:w-16 group-hover/vol:opacity-100"
            />
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/90">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <span className="ml-auto" />

          <button
            onClick={cycleSpeed}
            className="rounded px-2 py-1 text-xs font-semibold transition-colors hover:bg-white/15"
            aria-label="Playback speed"
          >
            {speed === 0.5 ? "0.5×" : `${speed}×`}
          </button>

          <button onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} className="rounded p-1.5 transition-colors hover:bg-white/15">
            {fullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M9 3v4a2 2 0 01-2 2H3M21 9h-4a2 2 0 01-2-2V3M3 15h4a2 2 0 012 2v4M15 21v-4a2 2 0 012-2h4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
