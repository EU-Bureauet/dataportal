"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface VideoPlayerModalProps {
  readonly open: boolean;
  readonly videoUrl: string;
  readonly title?: string;
  readonly onClose: () => void;
}

/**
 * Modal video player that slides up on open and fades out on close.
 * `videoUrl` should be the fully-qualified, basePath-prefixed URL.
 */
export function VideoPlayerModal({ open, videoUrl, title, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // `mounted` keeps the node in the DOM long enough to play the exit animation.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Double rAF: first frame commits the initial (closed) transform to the
      // DOM and lets the browser paint it; second frame toggles the open class
      // so the transition has a starting state to animate from.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setVisible(false);
    const id = setTimeout(() => setMounted(false), 1000);
    return () => clearTimeout(id);
  }, [open]);

  // Pause video when closing.
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      aria-modal="true"
      aria-label={title || "Video"}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Luk video"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Modal panel — keeps centered final position, but scales up from
          the lower-left corner (where the FAB lives) for a deter.dk-style
          "drawer" reveal. */}
      <div
        className={`vid-drawer relative w-full max-w-3xl bg-black rounded-2xl shadow-2xl overflow-hidden ${
          visible ? "vid-drawer--open" : ""
        }`}
      >
        <button
          type="button"
          aria-label="Luk"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="aspect-video bg-black">
          <video
            ref={videoRef}
            src={`${videoUrl}#t=0.5`}
            controls
            playsInline
            preload="auto"
            className="w-full h-full object-contain"
          >
            <track kind="captions" />
          </video>
        </div>
      </div>
    </div>
  );
}
