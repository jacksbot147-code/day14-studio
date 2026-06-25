/**
 * cinematic/Capabilities — the "Way more than a website" capability section.
 *
 * Direct port of the locked prototype's `#capabilities` section (task 3/8):
 *   - section heading/subhead (the breadth message: mobile-service, membership,
 *     food businesses)
 *   - a data-driven 8-card grid (4 → 2 → 1 columns), each card an icon + title
 *     + one-line description.
 *
 * The grid is driven by the CAPABILITIES array below, so order/content lives in
 * one place. Icons are self-hosted inline SVGs (see ./icons), not a CDN font.
 * Entrance motion reuses the cinematic <Reveal> primitive; cards stagger in
 * rows of four (delayStep cycles 0→3) exactly like the prototype's
 * .reveal/.d1/.d2/.d3 cadence. Hover/focus states + reduced-motion are handled
 * in cinematic.css.
 */

import { Reveal } from "./Reveal";
import {
  IconWorld,
  IconCalendarCheck,
  IconUserCircle,
  IconCreditCard,
  IconRoute,
  IconLayoutDashboard,
  IconMessage,
  IconMail,
  type CinIcon,
} from "./icons";

interface Capability {
  /** Stable key + used as the icon's accessible context if ever needed. */
  id: string;
  title: string;
  description: string;
  Icon: CinIcon;
}

/** The eight things every Day14 build ships with. Order matches the prototype. */
export const CAPABILITIES: readonly Capability[] = [
  {
    id: "marketing-site",
    title: "Marketing site",
    description:
      "A fast, custom site on your own domain — found on Google, perfect on phones.",
    Icon: IconWorld,
  },
  {
    id: "booking-quoting",
    title: "Booking & quoting",
    description:
      "Requests and quotes come in structured, 24/7 — no more phone tag.",
    Icon: IconCalendarCheck,
  },
  {
    id: "customer-portal",
    title: "Customer portal",
    description:
      "Logins, visit history, photo proof — customers serve themselves.",
    Icon: IconUserCircle,
  },
  {
    id: "payments-invoicing",
    title: "Payments & invoicing",
    description: "Stripe billing wired in. Get paid online, on time.",
    Icon: IconCreditCard,
  },
  {
    id: "scheduling",
    title: "Scheduling",
    description: "Jobs, crews, and routes sequenced automatically by the day.",
    Icon: IconRoute,
  },
  {
    id: "admin-app",
    title: "Admin app",
    description:
      "Run the whole operation from one screen — the operator cockpit.",
    Icon: IconLayoutDashboard,
  },
  {
    id: "ai-assistant",
    title: "AI assistant",
    description: "Answers customers and books jobs while you're on the clock.",
    Icon: IconMessage,
  },
  {
    id: "sms-email",
    title: "SMS & email",
    description: "Reminders and follow-ups send themselves. Nothing slips.",
    Icon: IconMail,
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="cin-section">
      <div className="cin-cap-head">
        <Reveal as="div" className="cin-kicker">
          One platform, everything your business runs on
        </Reveal>
        <Reveal as="h2" delayStep={1} className="cin-h2">
          Way more than a website.
        </Reveal>
        <Reveal as="p" delayStep={2}>
          A site is where it starts. Underneath is a full operating system —
          booking, payments, scheduling, an admin app, an AI assistant. Built
          for mobile-service, membership, and food businesses alike.
        </Reveal>
      </div>

      <ul className="cin-caps" role="list">
        {CAPABILITIES.map(({ id, title, description, Icon }, i) => (
          <Reveal
            key={id}
            as="li"
            delayStep={(i % 4) as 0 | 1 | 2 | 3}
            className="cin-cap"
          >
            <a href={`/platform/${id}`} className="cin-cap-link">
              <span className="cin-cap-icon">
                <Icon />
              </span>
              <h3 className="cin-cap-title">{title}</h3>
              <p className="cin-cap-desc">{description}</p>
              <span className="cin-cap-more" aria-hidden="true">
                How it works →
              </span>
            </a>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export default Capabilities;
