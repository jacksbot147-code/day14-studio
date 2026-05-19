"use client";

import { useState, useEffect } from "react";

const DRAFT_KEY = "day14-intake-draft-v1";

interface FormState {
  email: string;
  owner_name: string;
  company_name: string;
  city: string;
  phone: string;
  service_radius: string;
  service_description: string;
  typical_customer: string;
  pricing: string;
  current_pain: string;
  existing_website: string;
  domain: string;
  how_customers_find: string;
  contact_preference: string;
  notes: string;
}

const EMPTY: FormState = {
  email: "",
  owner_name: "",
  company_name: "",
  city: "",
  phone: "",
  service_radius: "",
  service_description: "",
  typical_customer: "",
  pricing: "",
  current_pain: "",
  existing_website: "",
  domain: "",
  how_customers_find: "",
  contact_preference: "",
  notes: "",
};

export function IntakeForm({
  sku,
  prefilledEmail,
}: {
  sku?: string;
  prefilledEmail?: string;
}) {
  const [state, setState] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Hydrate from localStorage (or prefilled email from query)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormState>;
        setState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
    if (prefilledEmail) {
      setState((prev) => ({ ...prev, email: prefilledEmail }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      } catch {
        // ignore
      }
    }, 600);
    return () => clearTimeout(t);
  }, [state]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "intake-form",
          submission_id: `web-${Date.now()}`,
          sku: sku || null,
          fields: state,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status}`);
      }

      setStatus("success");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-shipped-200 bg-shipped-50 p-8">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-shipped-600">
          ● Intake received
        </div>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tightest text-ink">
          We&rsquo;ve got it.
        </h2>
        <p className="mt-3 text-ink-700">
          Build starts now. You&rsquo;ll get a preview URL in your inbox within
          24 hours. Watch your build log update day-by-day at{" "}
          <a className="underline font-semibold" href="/builds">
            day14.us/builds
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 max-w-3xl">
      <Section title="You + the business" required>
        <Field
          label="Your email"
          required
          value={state.email}
          onChange={(v) => update("email", v)}
          type="email"
          placeholder="you@yourbusiness.com"
        />
        <Field
          label="Your name"
          required
          value={state.owner_name}
          onChange={(v) => update("owner_name", v)}
          placeholder="Jane Smith"
        />
        <Field
          label="Business name"
          required
          value={state.company_name}
          onChange={(v) => update("company_name", v)}
          placeholder="Smith Pool Service"
        />
        <Field
          label="Phone"
          value={state.phone}
          onChange={(v) => update("phone", v)}
          type="tel"
          placeholder="+1 239 555 0123"
        />
        <Field
          label="City + state"
          value={state.city}
          onChange={(v) => update("city", v)}
          placeholder="Naples, FL"
        />
      </Section>

      <Section title="What you do">
        <Field
          label="Service description"
          value={state.service_description}
          onChange={(v) => update("service_description", v)}
          multiline
          placeholder="What do you actually do for customers? Just 2-3 sentences."
        />
        <Field
          label="Service area / radius"
          value={state.service_radius}
          onChange={(v) => update("service_radius", v)}
          placeholder="15 miles from Naples"
        />
        <Field
          label="Typical customer"
          value={state.typical_customer}
          onChange={(v) => update("typical_customer", v)}
          placeholder="Homeowners with in-ground pools in SW Florida"
        />
        <Field
          label="Pricing"
          value={state.pricing}
          onChange={(v) => update("pricing", v)}
          multiline
          placeholder="$200/mo for weekly service, $400 startup fee."
        />
      </Section>

      <Section title="Current state">
        <Field
          label="Existing website?"
          value={state.existing_website}
          onChange={(v) => update("existing_website", v)}
          placeholder="oldsite.com — or no site yet"
        />
        <Field
          label="Domain you want to use"
          value={state.domain}
          onChange={(v) => update("domain", v)}
          placeholder="smithpoolservice.com"
        />
        <Field
          label="How customers find you today"
          value={state.how_customers_find}
          onChange={(v) => update("how_customers_find", v)}
          placeholder="Word of mouth, Google Maps, Facebook neighborhood groups"
        />
        <Field
          label="Biggest pain point"
          value={state.current_pain}
          onChange={(v) => update("current_pain", v)}
          multiline
          placeholder="Scheduling chaos, leaks in invoicing, can't keep up with leads"
        />
      </Section>

      <Section title="Logistics">
        <Field
          label="How do you want updates?"
          value={state.contact_preference}
          onChange={(v) => update("contact_preference", v)}
          placeholder="Email is fine. Or text 239-555-0123 for urgent things."
        />
        <Field
          label="Anything else"
          value={state.notes}
          onChange={(v) => update("notes", v)}
          multiline
          placeholder="Anything we should know that doesn't fit above."
        />
      </Section>

      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Couldn&rsquo;t submit: {errorMessage}. Try again in a moment, or
          email hello@day14.us.
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-ember"
        >
          {status === "submitting" ? "Sending…" : "Send to Day14"}
        </button>
        <span className="text-xs text-ink-400">
          Draft saved locally. You can leave and come back.
        </span>
      </div>
    </form>
  );
}

function Section({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-ink-100 bg-paper-50 p-5 sm:p-6">
      <legend className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600">
        {title}
        {required && <span className="ml-2 text-ink-400">(required)</span>}
      </legend>
      <div className="mt-3 grid gap-4">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  multiline,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink-700">
        {label}
        {required && <span className="ml-1 text-ember-600">*</span>}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={3}
          className="rounded-md border border-ink-200 bg-paper px-3 py-2 text-ink focus:border-ember-500 focus:outline-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="rounded-md border border-ink-200 bg-paper px-3 py-2 text-ink focus:border-ember-500 focus:outline-none"
        />
      )}
    </label>
  );
}
