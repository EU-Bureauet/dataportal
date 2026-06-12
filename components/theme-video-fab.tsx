"use client";

import { useEffect, useRef, useState } from "react";
import { VideoPlayerModal } from "@/components/video-player-modal";

interface ThemeVideoFabProps {
  readonly videoUrl: string;
  readonly themeSlug: string;
  readonly title?: string;
}

function resolveVideoUrl(videoUrl: string, basePath: string): string {
  if (/^https?:\/\//.test(videoUrl)) return videoUrl;
  const normalized = videoUrl.startsWith("/") ? videoUrl : `/${videoUrl}`;
  // Encode each path segment so filenames with spaces or non-ASCII chars work.
  const encoded = normalized
    .split("/")
    .map((seg) => (seg ? encodeURIComponent(seg) : seg))
    .join("/");
  return `/${basePath}${encoded}`;
}

/**
 * Round floating action button with a thick white border. The video plays
 * (muted, looped) as the FAB's background. On first visit to a theme page,
 * the FAB shows a small call-to-action animation (ping + tooltip). Clicking
 * the FAB opens a modal with the full video player.
 */
export function ThemeVideoFab({ videoUrl, themeSlug, title }: ThemeVideoFabProps) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || "dataportal";
  // Allow absolute URLs (http/https) to pass through unchanged.
  const resolvedUrl = resolveVideoUrl(videoUrl, basePath);

  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
  };

  // Brief call-to-action animation that runs on every page visit. It auto-hides
  // so the FAB returns to a neutral state quickly. A localStorage flag suppresses
  // only the worded tooltip after the user has interacted at least once.
  useEffect(() => {
    if (globalThis.window === undefined) return;
    const showTimer = setTimeout(() => setShowHint(true), 400);
    const hideTimer = setTimeout(() => setShowHint(false), 3600);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [themeSlug]);

  const [tooltipSeen, setTooltipSeen] = useState(false);
  useEffect(() => {
    if (globalThis.window === undefined) return;
    try {
      setTooltipSeen(
        globalThis.localStorage.getItem(`theme-video-fab:seen:${themeSlug}`) === "1",
      );
    } catch {
      /* ignore */
    }
  }, [themeSlug]);

  // Pause the background loop while the modal is open to avoid double audio
  // (background is muted but still saves CPU/bandwidth).
  useEffect(() => {
    const v = bgVideoRef.current;
    if (!v) return;
    if (open) v.pause();
    else v.play().catch(() => {});
  }, [open]);

  const handleClick = () => {
    setShowHint(false);
    try {
      globalThis.localStorage.setItem(`theme-video-fab:seen:${themeSlug}`, "1");
      setTooltipSeen(true);
    } catch {
      /* ignore */
    }
    setOpen(true);
  };

  if (dismissed) return null;

  return (
    <>
      <div className="fixed bottom-[18px] left-[18px] sm:bottom-[36px] sm:left-[36px] z-50">
        <button
          type="button"
          onClick={handleClick}
          aria-label={title ? `Afspil video: ${title}` : "Afspil introvideo"}
          className={`fab-main relative w-[92px] h-[92px] rounded-full border-[3px] border-white bg-white overflow-hidden p-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 transition-transform hover:scale-105 active:scale-95 fab-shadow ${
            showHint ? "fab-cta" : ""
          }`}
        >
          {/* Background video — muted loop, fills the bubble */}
          <video
            ref={bgVideoRef}
            src={resolvedUrl}
            className="absolute inset-0 w-full h-full object-cover rounded-full"
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
          >
            <track kind="captions" />
          </video>

          {/* First-visit ping ring — single elegant pulse */}
          {showHint && (
            <span className="absolute -inset-1 rounded-full border-2 border-white/70 fab-ping-once pointer-events-none" />
          )}
        </button>

        {/* Small dismiss button at the top-right of the FAB */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Skjul introvideo"
          className="fab-dismiss absolute top-[2px] right-[2px] w-6 h-6 rounded-full bg-black/80 hover:bg-black text-white border-2 border-white flex items-center justify-center shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-transform hover:scale-110"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M1 1 L9 9 M9 1 L1 9" />
          </svg>
          <span className="fab-tooltip fab-tooltip--dismiss">Skjul denne knap</span>
        </button>

        {/* Hover tooltip for the main FAB — sibling so it isn't clipped by overflow-hidden */}
        <span className="fab-tooltip fab-tooltip--main">Åben videoafspiller</span>

        {/* CTA tooltip — only shown until the user clicks the FAB once */}
        <div
          className={`hidden sm:block absolute left-full top-1/2 -translate-y-1/2 ml-3 transition-all duration-300 ${
            showHint && !tooltipSeen
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-2 pointer-events-none"
          }`}
        >
          <div className="relative bg-white text-gray-900 text-sm font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <span>Se introvideo</span>
            <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white rotate-45" />
          </div>
        </div>
      </div>

      <VideoPlayerModal
        open={open}
        videoUrl={resolvedUrl}
        title={title}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
