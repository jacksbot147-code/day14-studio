/**
 * cinematic/StatsRow — final figures, rendered on the server.
 *
 * These used to count up from 0 in the browser, so the first paint (and
 * anything that didn't run the animation) showed zeros. The numbers are the
 * content, so the HTML already contains them.
 */

interface Stat {
  value: string;
  label: string;
}

const STATS: readonly Stat[] = [
  { value: "14", label: "days to live" },
  { value: "2", label: "live businesses you can open" },
  { value: "1", label: "platform behind both" },
];

export function StatsRow() {
  return (
    <div className="cin-stats">
      {STATS.map((stat) => (
        <div className="cin-stat" key={stat.label}>
          <div className="cin-stat-v">{stat.value}</div>
          <div className="cin-stat-l">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsRow;
