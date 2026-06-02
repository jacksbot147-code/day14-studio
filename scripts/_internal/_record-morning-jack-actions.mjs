import { recordJackAction, pendingJackActionsCount } from "../lib/jack-actions.mjs";
const REAL_DOCS = process.env.REAL_DOCS;
const REAL_FILE = `${REAL_DOCS}/COMMANDS-FOR-JACK.md`;
const r1 = await recordJackAction({
  label: "Install morning-briefing LaunchAgent",
  cmd: "cp ~/Documents/studio/scripts/launch-agents/com.day14.morning-briefing.plist ~/Library/LaunchAgents/ && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.day14.morning-briefing.plist",
  why: "scheduled-task sandbox can't reach launchctl; without this, the 07:30 daily briefing won't fire (no briefing-*.md since May 29)",
  urgency: "high",
  filePath: REAL_FILE,
});
console.log("r1=", JSON.stringify(r1));
const r2 = await recordJackAction({
  label: "Verify morning-briefing plist loaded",
  cmd: "launchctl print gui/$(id -u)/com.day14.morning-briefing | head -40",
  why: "confirm StartCalendarInterval shows next 07:30 fire time after bootstrap",
  urgency: "normal",
  filePath: REAL_FILE,
});
console.log("r2=", JSON.stringify(r2));
const c = await pendingJackActionsCount({ filePath: REAL_FILE });
console.log("count=", JSON.stringify(c));
