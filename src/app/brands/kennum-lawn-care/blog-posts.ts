// Blog content for Kennum Lawn Care.
// Posts are inlined here so the blog renders fully on Vercel with no
// runtime filesystem or API dependency.

export type BlogBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** ISO date, yyyy-mm-dd */
  date: string;
  readingMinutes: number;
  excerpt: string;
  body: BlogBlock[];
  takeaway: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "rainy-season-mowing-cadence",
    title: "Rainy-Season Mowing in Southwest Florida: How Often Your Lawn Really Needs It",
    description:
      "Once the summer rains arrive, a Southwest Florida lawn can grow faster than you think. Here's how to set the right mowing cadence — and why mowing wet grass does more harm than good.",
    date: "2026-05-12",
    readingMinutes: 5,
    excerpt:
      "When the rains start in June, St. Augustine grass shifts into overdrive. Here's how often it actually needs cutting — and why the calendar matters more than you'd guess.",
    body: [
      {
        type: "p",
        text: "Ask ten Southwest Florida homeowners how often they mow and you'll get ten answers. The honest one is: it depends on the season. A lawn that's perfectly happy on an every-other-week cut in March can look shaggy four days after a June mow. The rains change everything.",
      },
      {
        type: "p",
        text: "Most local lawns are St. Augustine grass, and St. Augustine is a warm-season grass that does the bulk of its growing when it's hot and wet. From roughly June through September, that's exactly the weather we get. Here's how to think about mowing cadence so your lawn stays healthy — not just short.",
      },
      { type: "h2", text: "The one-third rule sets the schedule" },
      {
        type: "p",
        text: "The single most useful rule in lawn care is this: never remove more than one-third of the grass blade in a single mow. Cut more than that and you shock the plant — it loses too much leaf surface at once, the roots get stressed, and the lawn turns pale and patchy while it recovers.",
      },
      {
        type: "p",
        text: "That rule is what really sets your cadence. It's not a fixed number of days; it's a question of how fast the grass is growing. If your lawn is kept at four inches, the one-third rule means you mow before it reaches about six inches. In the dry season that might take two weeks. In the wet season, with heat and daily afternoon storms, it can happen in five or six days.",
      },
      { type: "h2", text: "Dry season vs. rainy season cadence" },
      {
        type: "p",
        text: "As a working guide for a typical St. Augustine lawn in Lee, Collier, or Charlotte County:",
      },
      {
        type: "ul",
        items: [
          "Dry season (roughly November through May): every 10 to 14 days is usually fine. Growth is slow, and over-mowing a stressed dry-season lawn does more harm than waiting.",
          "Rainy season (roughly June through September): every 7 days, sometimes tighter. Through a stretch of heavy afternoon storms, a lawn can genuinely need a cut weekly to stay inside the one-third rule.",
        ],
      },
      {
        type: "p",
        text: "This is the main reason a fixed weekly route matters in summer. A lawn that gets skipped for ten days in July isn't just untidy — it forces whoever mows it to break the one-third rule to get it back down, which sets the lawn back instead of helping it.",
      },
      { type: "h2", text: "Why mowing wet grass is a problem" },
      {
        type: "p",
        text: "Summer in Southwest Florida means the grass is wet a lot — morning dew, afternoon storms, running irrigation. It's tempting to mow it wet just to stay on schedule, but wet mowing causes real problems:",
      },
      {
        type: "ul",
        items: [
          "Clumping. Wet clippings stick together and mat down on the lawn, smothering the grass underneath and leaving brown patches.",
          "Uneven cut. Wet blades bend under the mower instead of standing up, so they spring back tall after they dry and the lawn looks ragged.",
          "Disease spread. Fungal problems like gray leaf spot thrive in our humidity, and a mower rolling through a wet lawn carries spores from one area to the next.",
          "Rutting and compaction. A heavy mower on saturated ground leaves tire ruts and packs down the soil, which hurts roots over time.",
        ],
      },
      {
        type: "p",
        text: "The practical fix is timing, not skipping. Mowing is best done once the lawn has had a chance to dry — usually late morning after the dew burns off, and before the afternoon storms roll in. A crew that knows the local weather pattern plans the route around that window.",
      },
      { type: "h2", text: "A few habits that make weekly mowing work harder" },
      {
        type: "ul",
        items: [
          "Keep the blade sharp. A dull blade tears the grass instead of slicing it, leaving frayed white tips that brown out and invite disease. Sharpening every month or two through the growing season makes a visible difference.",
          "Don't scalp it. St. Augustine does best kept tall — around 3.5 to 4 inches. Taller grass shades the soil, holds moisture, and crowds out weeds. Cutting it short to buy time between mows backfires.",
          "Leave the clippings. When you're mowing on schedule, the clippings are small and break down fast, returning nitrogen to the soil. That's free fertilizer — and it matters even more in summer, when fertilizing is restricted.",
        ],
      },
    ],
    takeaway:
      "A Southwest Florida lawn doesn't need the same thing in July that it needs in February. Through the rainy season, plan on a weekly cut, kept tall, with a sharp blade, on dry grass. Stay inside the one-third rule and the lawn does the rest. The hardest part is consistency — which is exactly why a dependable weekly route exists.",
  },
  {
    slug: "summer-fertilizer-blackout",
    title: "The Summer Fertilizer Blackout: What Southwest Florida Homeowners Need to Know",
    description:
      "Across much of Southwest Florida, applying nitrogen and phosphorus fertilizer is restricted from June through September. Here's why the rule exists, who it covers, and how to keep your lawn healthy through the blackout.",
    date: "2026-05-15",
    readingMinutes: 6,
    excerpt:
      "From June through September, much of Southwest Florida restricts nitrogen and phosphorus fertilizer. Here's why — and how to keep your lawn green without breaking the rule.",
    body: [
      {
        type: "p",
        text: "If you've ever gone to fertilize your lawn in July and had a neighbor tell you that's not allowed right now, they were probably right. Across much of Southwest Florida, applying lawn fertilizer that contains nitrogen or phosphorus is restricted during the summer rainy season.",
      },
      {
        type: "p",
        text: "It catches a lot of homeowners off guard — summer is when the lawn is growing hardest, so it feels like the obvious time to feed it. But the rule exists for a good reason, and once you understand it, working around it is straightforward.",
      },
      { type: "h2", text: "What the rule actually says" },
      {
        type: "p",
        text: "Many local governments in Southwest Florida — including Lee, Collier, and Charlotte counties, along with a number of cities within them — have adopted fertilizer ordinances that prohibit applying nitrogen (N) and phosphorus (P) fertilizer to lawns and landscapes during the summer rainy season. The restricted window is generally June 1 through September 30.",
      },
      {
        type: "p",
        text: "The details vary from one jurisdiction to the next — exact dates, which products are covered, and applicator requirements can differ between a county ordinance and a particular city's. Before you fertilize anywhere in the region, it's worth a two-minute check of your specific county and city rules. But the broad pattern across Southwest Florida is the same: no N or P fertilizer in the heart of the rainy season.",
      },
      { type: "h2", text: "Why a blackout at all" },
      {
        type: "p",
        text: "It comes down to where the fertilizer goes. Nitrogen and phosphorus are nutrients — they make grass grow. When you apply them and then a heavy afternoon storm dumps two inches of rain, a good share of those nutrients doesn't stay in your lawn. It runs off hard surfaces and drains, or leaches through our sandy soil, and ends up in storm drains, canals, the Caloosahatchee, and eventually the estuaries and Gulf.",
      },
      {
        type: "p",
        text: "Once there, the same nutrients that green up a lawn also feed algae. Nutrient runoff is one of the contributors to the algae blooms and red tide events that Southwest Florida knows all too well. The summer blackout is a direct attempt to cut the nutrient load during the months when rain is heaviest and runoff is worst. Whatever you make of any single ordinance, the underlying logic is sound: don't apply soluble nutrients right before they would be washed away.",
      },
      { type: "h2", text: "How to keep a lawn healthy through the blackout" },
      {
        type: "p",
        text: "The good news: a healthy lawn doesn't need to be fed in summer to stay green. Warm-season grasses are growing vigorously anyway. The blackout is about skipping the N and P — not about ignoring the lawn. Here's what still works:",
      },
      {
        type: "ul",
        items: [
          "Feed it before June 1. The most important move is timing your last application well. A spring application of a slow-release nitrogen fertilizer, put down before the blackout begins, keeps feeding the lawn gradually for weeks into the summer.",
          "Use iron for color, not nitrogen. Most ordinances allow iron and other micronutrient products, because they green up the grass without adding the nutrients that cause runoff problems. An iron application is the standard trick for a deep green lawn during the blackout.",
          "Leave the clippings. Mowing on a regular schedule and letting the small clippings fall returns a meaningful amount of nitrogen to the soil naturally — no bag, no spreader, no ordinance issue.",
          "Mow tall and water wisely. Keeping St. Augustine grass at 3.5 to 4 inches and not over-watering does more for summer lawn health than feeding ever would. A tall, well-rooted lawn shades out weeds and handles heat better.",
          "Stay on top of weeds and pests. Summer is peak season for chinch bugs and fungal disease in our climate. Catching those early protects the lawn far more than fertilizer would.",
        ],
      },
      { type: "h2", text: "What to do when the blackout lifts" },
      {
        type: "p",
        text: "After September 30, in most jurisdictions you can fertilize again. Early fall is actually a great time to feed a Southwest Florida lawn — it's still growing, and a fall application helps it recover from the stresses of summer and head into the cooler months strong. When you do, look for a slow-release nitrogen product, follow the label rate, sweep any stray granules off driveways and sidewalks back onto the lawn, and never apply right before a heavy rain.",
      },
    ],
    takeaway:
      "The summer fertilizer blackout isn't a reason to neglect your lawn — it's a reason to plan. Feed well in spring with a slow-release product, lean on iron for color through the summer, mow tall, leave the clippings, and keep weeds and pests in check. Then fertilize again in the fall. And because the exact rules vary by county and city, confirm your local ordinance before you spread anything.",
  },
  {
    slug: "pre-hurricane-season-yard-prep",
    title: "Get Your Yard Ready Before Hurricane Season: A Southwest Florida Checklist",
    description:
      "Hurricane season runs June through November in Southwest Florida. A few hours of yard prep before it ramps up can spare you a lot of damage. Here's a practical checklist.",
    date: "2026-05-19",
    readingMinutes: 6,
    excerpt:
      "Hurricane season starts June 1. The yard work that protects your home is best done now, before the first storm is on the cone. Here's the checklist.",
    body: [
      {
        type: "p",
        text: "Atlantic hurricane season runs from June 1 to November 30, and Southwest Florida sits squarely in its path. Recent seasons have made it very clear how much of the damage in a storm comes from the yard — branches, fronds, loose objects, and debris turned into projectiles by the wind.",
      },
      {
        type: "p",
        text: "The good news is that yard prep is some of the most effective storm prep you can do, and almost all of it is better done now, in the calm part of spring, than in the scramble when a storm is already on the cone. Here's a practical checklist for a Southwest Florida property.",
      },
      { type: "h2", text: "Trim trees and palms — the right way" },
      {
        type: "p",
        text: "The biggest wind risk in most yards is the trees. Dead, weak, or crossing branches are the first things to come down, and a healthy canopy that's been thinned slightly lets wind pass through instead of catching it like a sail.",
      },
      { type: "p", text: "A few specifics for our region:" },
      {
        type: "ul",
        items: [
          "Remove dead and damaged wood. Dead branches and weak limbs should come out well before a storm — they're the most likely to break and fly.",
          "Thin, don't top. Selectively thinning a canopy helps; topping a tree by cutting the main leaders back hard creates weak regrowth and actually makes it more dangerous over time.",
          "Don't hurricane-cut your palms. Stripping a palm down to a few upright fronds is a common sight, but horticulturists discourage it. Over-pruned palms are weaker, not stronger — the fronds help the palm ride out wind, and removing them stresses the tree. Take off only dead or fully brown fronds, plus loose seed pods and coconuts that could become projectiles.",
          "Do the big work early. Major tree work is best handled in late spring, before the season ramps up — both so the tree has time to settle and so you're not competing for a crew when a storm is approaching.",
        ],
      },
      { type: "h2", text: "Deal with anything that can fly" },
      {
        type: "p",
        text: "In a hurricane, anything loose in the yard is a potential projectile. Walk the property and make a plan for every loose object now, so that when a warning is issued you only need to act, not decide:",
      },
      {
        type: "ul",
        items: [
          "Potted plants, patio furniture, grills, umbrellas, garden decor, and yard tools should each have a place to go indoors or in a garage.",
          "Lightweight mulch can blow out of beds and even break windows. For beds close to the house and windows, some homeowners switch to rock or a heavier mulch; at minimum, know that fresh lightweight mulch is something to account for.",
          "Check fences, gates, and shade sails — anything that can come loose and catch wind.",
        ],
      },
      { type: "h2", text: "Make sure the yard drains" },
      {
        type: "p",
        text: "Southwest Florida storms bring enormous amounts of rain, and standing water around the house causes its own damage. Before the season:",
      },
      {
        type: "ul",
        items: [
          "Clear gutters, downspouts, and drains so water has somewhere to go.",
          "Check that swales and low spots aren't blocked by debris or overgrowth.",
          "Make sure irrigation is in good shape and the controller can be shut off easily — you don't want sprinklers running during a flood.",
        ],
      },
      { type: "h2", text: "Plan the debris, before and after" },
      {
        type: "p",
        text: "Yard debris timing matters more than people realize. If a storm is days away, that is not the time to pile branches and trimmings at the curb — loose debris that won't be collected in time just becomes more projectiles. Do your trimming early in the season so the debris is long gone before any storm.",
      },
      {
        type: "p",
        text: "It's also worth photographing your landscaping and trees now, while everything is intact. If you do take damage, dated before photos make an insurance claim far easier. And have a plan for the cleanup afterward — debris haul-off and a full property reset are a lot to handle alone after a major storm.",
      },
    ],
    takeaway:
      "Hurricane prep in the yard is mostly about doing things early: trim trees and palms properly in late spring, give every loose object a home, make sure the property drains, and keep debris cleared so it never becomes a projectile. A few hours now, on a calm weekend, is worth far more than a frantic afternoon when a storm is already named.",
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
