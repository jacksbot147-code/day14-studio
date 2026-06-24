"use client";

/**
 * cinematic/JobBoard — the "back office" job-board reveal (task 4/8, row 03).
 *
 * Port of the locked prototype's `.panel` reveal: a faux job-board panel whose
 * rows stagger in, a progress meter fills, and a "jobs today" counter ticks up
 * — illustrating that the operation organises the day for the operator.
 *
 * Framing: this is explicitly a *field-service example*; the copy in
 * HowItWorks notes that membership and food businesses run on the same board,
 * so the widget itself stays generic (it's one illustrative day, not a claim).
 *
 * Motion: an IntersectionObserver kicks the sequence the first time the panel
 * is ~40% visible. Under prefers-reduced-motion we SKIP the choreography
 * entirely and render the final state immediately (all rows shown, meter full,
 * counter at total) — no staggered timers, no animated count. The meter/row
 * transitions are also collapsed by the global reduced-motion CSS guard, so
 * this is belt-and-suspenders.
 */

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

interface Job {
  initials: string;
  name: string;
  meta: string;
  status: string;
  done?: boolean;
}

const JOBS: readonly Job[] = [
  {
    initials: "JM",
    name: "J. Morales — pool clean",
    meta: "Naples · 9:00a",
    status: "done",
    done: true,
  },
  {
    initials: "RK",
    name: "R. Kemp — HVAC tune-up",
    meta: "Bonita · 10:30a",
    status: "done",
    done: true,
  },
  {
    initials: "TD",
    name: "T. Delgado — new quote",
    meta: "Estero · 1:00p",
    status: "en route",
  },
  {
    initials: "+9",
    name: "9 more jobs",
    meta: "auto-sequenced for the day",
    status: "queued",
  },
];

const TOTAL_JOBS = 12;
const METER_FILL = 78; // percent
const ROW_DELAY_MS = 240;
const ROW_BASE_MS = 250;
const METER_DELAY_MS = 1100;
const COUNT_TICK_MS = 90;

export function JobBoard() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [shownRows, setShownRows] = useState(0);
  const [meterOn, setMeterOn] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Reduced motion (or no IO support): jump straight to the resolved state.
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setShownRows(JOBS.length);
      setMeterOn(true);
      setCount(TOTAL_JOBS);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let countInterval: ReturnType<typeof setInterval> | undefined;

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          obs.unobserve(entry.target);

          // Stagger the rows in.
          JOBS.forEach((_, i) => {
            timers.push(
              setTimeout(
                () => setShownRows(i + 1),
                ROW_BASE_MS + i * ROW_DELAY_MS,
              ),
            );
          });

          // Fill the meter, then ramp the counter.
          timers.push(setTimeout(() => setMeterOn(true), METER_DELAY_MS));
          timers.push(
            setTimeout(() => {
              countInterval = setInterval(() => {
                setCount((c) => {
                  if (c >= TOTAL_JOBS) {
                    if (countInterval) clearInterval(countInterval);
                    return TOTAL_JOBS;
                  }
                  return c + 1;
                });
              }, COUNT_TICK_MS);
            }, METER_DELAY_MS),
          );
        }
      },
      { threshold: 0.4 },
    );

    io.observe(panel);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
      if (countInterval) clearInterval(countInterval);
    };
  }, []);

  return (
    <div className="cin-panel" ref={panelRef}>
      <div className="cin-panel-bar">
        <i aria-hidden="true" />
        <i aria-hidden="true" />
        <i aria-hidden="true" />
        <span className="cin-panel-ttl cin-mono">job board · tuesday</span>
        <span className="cin-panel-live cin-mono">
          <span className="cin-dot" aria-hidden="true" />
          live
        </span>
      </div>

      <div className="cin-panel-body">
        {JOBS.map((job, i) => (
          <div
            key={job.name}
            className={`cin-job-row${i < shownRows ? " cin-job-row-show" : ""}`}
          >
            <div className="cin-job-av" aria-hidden="true">
              {job.initials}
            </div>
            <div>
              <div className="cin-job-nm">{job.name}</div>
              <div className="cin-job-sub">{job.meta}</div>
            </div>
            <div className={`cin-job-st${job.done ? " cin-job-st-ok" : ""}`}>
              {job.status}
            </div>
          </div>
        ))}

        <div className={`cin-meter${meterOn ? " cin-meter-go" : ""}`}>
          <b style={{ width: meterOn ? `${METER_FILL}%` : 0 }} />
        </div>
        <div className="cin-meter-foot cin-mono">
          <span>
            jobs today: <span>{count}</span>/{TOTAL_JOBS}
          </span>
          <span>follow-ups sent · auto</span>
        </div>
      </div>
    </div>
  );
}

export default JobBoard;
