/**
 * cinematic/testimonialData — the testimonial data slot (task 5/8).
 *
 * The cinematic homepage renders ONE customer testimonial. Until a real,
 * verified owner quote exists, this slot stays `null` and <Testimonial /> shows
 * a clearly-marked placeholder — we never ship a fabricated named testimonial.
 *
 * To go live: replace `TESTIMONIAL` with a real, attributable quote you have
 * permission to use. Keep `name`/`role` truthful (a real person + their
 * business). Setting this object automatically swaps the placeholder for the
 * real quote — no component change needed.
 */

export interface CustomerTestimonial {
  /** The verbatim quote (no quotation marks — the component adds styling). */
  quote: string;
  /** Real attributed person, e.g. "Maria T." */
  name: string;
  /** Their role / business, e.g. "owner, Gulf Coast Lawn". */
  role: string;
}

/**
 * Real customer testimonial, or `null` to render the placeholder.
 * BINDING: only set this to a genuine, permissioned quote from a real customer.
 */
export const TESTIMONIAL: CustomerTestimonial | null = null;
