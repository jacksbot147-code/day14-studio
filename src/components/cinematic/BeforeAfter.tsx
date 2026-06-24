"use client";

/**
 * cinematic/BeforeAfter — the "front door" before/after slider widget.
 *
 * Port of the locked prototype's `.ba` reveal (task 4/8, row 01): a single
 * frame holding two stacked states — the "before" (a bare Facebook page) and
 * the "after" (a real site on your own domain) — with a draggable handle that
 * wipes between them via `clip-path: inset(…)`.
 *
 * Upgrades over the prototype's mouse-only handle:
 *   - The handle is a real WAI-ARIA slider: role="slider", aria-valuemin/max/now,
 *     aria-orientation, aria-label, tabIndex=0, and a visible focus ring.
 *   - Keyboard support: ←/→ (and ↑/↓) nudge by 2%, PageUp/PageDown by 10%,
 *     Home/End jump to the clamped ends.
 *   - Pointer AND touch via Pointer Events with pointer capture, so a drag that
 *     leaves the frame still tracks (no global listeners, no touch-scroll fight;
 *     `touch-action: none` on the handle).
 *
 * The position is React state (clamped 6–94% like the prototype) and applied to
 * the after-pane's clip-path + the handle's left offset. No browser storage.
 * Reduced-motion is irrelevant here (the wipe is direct manipulation, not an
 * animation); the surrounding entrance is handled by <Reveal> in HowItWorks.
 */

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

const MIN = 6;
const MAX = 94;
const STEP = 2;
const PAGE = 10;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

export function BeforeAfter() {
  const [percent, setPercent] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);

  /** Map a clientX to a clamped percentage across the frame. */
  const positionFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0) return;
    setPercent(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Capture so the drag keeps tracking outside the frame / handle.
      e.currentTarget.setPointerCapture(e.pointerId);
      positionFromClientX(e.clientX);
    },
    [positionFromClientX],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Only track while this element holds the capture (i.e. mid-drag).
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        positionFromClientX(e.clientX);
      }
    },
    [positionFromClientX],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = -STEP;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = STEP;
        break;
      case "PageDown":
        next = -PAGE;
        break;
      case "PageUp":
        next = PAGE;
        break;
      case "Home":
        e.preventDefault();
        setPercent(MIN);
        return;
      case "End":
        e.preventDefault();
        setPercent(MAX);
        return;
      default:
        return;
    }
    e.preventDefault();
    setPercent((p) => clamp(p + (next as number)));
  }, []);

  const rounded = Math.round(percent);

  return (
    <div
      className="cin-ba"
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* BEFORE — a bare Facebook page. */}
      <div className="cin-ba-side cin-ba-before">
        <div className="cin-ba-fbtag cin-mono">facebook.com/yourbiz</div>
        <div className="cin-ba-fbname">Your Biz LLC</div>
        <div className="cin-ba-fbline" />
        <div className="cin-ba-fbline cin-ba-fbline-short" />
      </div>

      {/* AFTER — a real site on your own domain. Clipped from the left. */}
      <div
        className="cin-ba-side cin-ba-after"
        style={{ clipPath: `inset(0 0 0 ${percent}%)` }}
        aria-hidden="true"
      >
        <div className="cin-ba-eyebrow cin-mono">yourbiz.com</div>
        <h5 className="cin-ba-headline">Booked while you work.</h5>
        <div className="cin-ba-pill">Request a quote →</div>
      </div>

      {/* HANDLE — a real ARIA slider. */}
      <div
        className="cin-ba-handle"
        style={{ left: `${percent}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Reveal the after — drag to compare a Facebook page with a real site"
        aria-orientation="horizontal"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={rounded}
        aria-valuetext={`${rounded}% revealed`}
        onKeyDown={onKeyDown}
      />

      <div className="cin-ba-lbl cin-ba-lbl-l cin-mono" aria-hidden="true">
        before
      </div>
      <div className="cin-ba-lbl cin-ba-lbl-r cin-mono" aria-hidden="true">
        after
      </div>
    </div>
  );
}

export default BeforeAfter;
