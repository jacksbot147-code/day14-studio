"use client";

import { useState } from "react";
import { brandTheme as t } from "./theme";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Intake form — wired to /api/brands/[slug]/contact (already exists in repo).
 * On success: shows confirmation card + clears form.
 * On error: surfaces message + lets parent retry.
 */
export function IntakeForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      parentName: String(fd.get("parentName") ?? ""),
      parentEmail: String(fd.get("parentEmail") ?? ""),
      parentPhone: String(fd.get("parentPhone") ?? ""),
      childAge: String(fd.get("childAge") ?? ""),
      instrument: String(fd.get("instrument") ?? ""),
      bestDays: String(fd.get("bestDays") ?? ""),
      note: String(fd.get("note") ?? ""),
      source: "site-intake",
    };

    try {
      const res = await fetch("/api/brands/angela-music/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `Request failed with status ${res.status}`);
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again or text me directly.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ backgroundColor: t.colors.surface, border: `2px solid ${t.colors.primary}` }}
      >
        <div className="text-[48px]">🎶</div>
        <h3
          className="mt-3 text-[24px] font-bold"
          style={{ fontFamily: t.fonts.heading, color: t.colors.text }}
        >
          Got it. Talk soon.
        </h3>
        <p className="mt-3 text-[15px] leading-[1.6]" style={{ color: t.colors.muted }}>
          I&rsquo;ll reply today with two or three slot options. Check your phone &mdash; most of my replies are text.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-[13px] font-semibold underline-offset-4 hover:underline"
          style={{ color: t.colors.primary }}
        >
          Send another →
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl p-7 sm:p-8"
      style={{ backgroundColor: t.colors.surface, border: `1px solid ${t.colors.muted}15` }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="parentName" label="Your name" required placeholder="Alex Martinez" />
        <Field name="parentPhone" label="Phone" type="tel" required placeholder="(239) 555-0123" />
      </div>

      <Field name="parentEmail" label="Email" type="email" required placeholder="alex@email.com" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="childAge" label="Child's age" required placeholder="9" type="number" min={3} max={19} />
        <SelectField
          name="instrument"
          label="Instrument"
          required
          options={[
            { v: "", l: "Pick one…" },
            { v: "piano", l: "Piano" },
            { v: "guitar", l: "Guitar" },
            { v: "voice", l: "Voice" },
            { v: "drums", l: "Drums" },
            { v: "strings", l: "Strings (violin / viola / cello)" },
            { v: "theory", l: "Theory & reading" },
            { v: "not-sure", l: "Not sure yet" },
          ]}
        />
      </div>

      <Field
        name="bestDays"
        label="Best days/times for lessons"
        placeholder="Weekday afternoons after 4pm, weekends OK"
      />

      <div>
        <label
          htmlFor="note"
          className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: t.colors.muted }}
        >
          Anything else? (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder="E.g. they've never played before, sibling already takes lessons, snowbird family, etc."
          className="w-full rounded-xl border px-4 py-3 text-[15px] leading-[1.5] transition-colors focus:outline-none focus:ring-2"
          style={{
            borderColor: `${t.colors.muted}30`,
            backgroundColor: t.colors.bg,
            color: t.colors.text,
            ['--tw-ring-color' as string]: t.colors.primary,
          }}
        />
      </div>

      {error ? (
        <div
          className="rounded-xl p-4 text-[14px]"
          style={{ backgroundColor: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5" }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full px-6 py-4 text-[16px] font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ backgroundColor: t.colors.accent }}
      >
        {status === "submitting" ? "Sending…" : "Send to Angela →"}
      </button>

      <p className="text-center text-[12px]" style={{ color: t.colors.muted }}>
        I reply same day. Most replies arrive by text.
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  placeholder,
  type = "text",
  min,
  max,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em]"
        style={{ color: t.colors.muted }}
      >
        {label} {required ? <span style={{ color: t.colors.accent }}>*</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full rounded-xl border px-4 py-3 text-[15px] transition-colors focus:outline-none focus:ring-2"
        style={{
          borderColor: `${t.colors.muted}30`,
          backgroundColor: t.colors.bg,
          color: t.colors.text,
          ['--tw-ring-color' as string]: t.colors.primary,
        }}
      />
    </div>
  );
}

function SelectField({
  name,
  label,
  required,
  options,
}: {
  name: string;
  label: string;
  required?: boolean;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em]"
        style={{ color: t.colors.muted }}
      >
        {label} {required ? <span style={{ color: t.colors.accent }}>*</span> : null}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        className="w-full rounded-xl border px-4 py-3 text-[15px] transition-colors focus:outline-none focus:ring-2"
        style={{
          borderColor: `${t.colors.muted}30`,
          backgroundColor: t.colors.bg,
          color: t.colors.text,
          ['--tw-ring-color' as string]: t.colors.primary,
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}
