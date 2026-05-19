# Mac mini Day 1 playbook

> The exact sequence of moves once the mini is set up and you're back
> at your laptop with Cowork open. Paste each prompt verbatim into a
> fresh Cowork window on the Mac mini, in order. Each one validates
> the previous step. Stop at the first failure.
>
> Time budget: 30 min after the runbook is complete. By the end, the
> empire is scaffolded and the first Council entry is logged.

---

## Pre-conditions

Before starting this playbook, you must have:

- Finished `day14-mac-mini-runbook.md` top-to-bottom
- Claude desktop installed and signed in on the mini
- Cowork mode enabled, ~/Documents mounted as working folder
- `~/Documents/studio/` cloned (the repo is on GitHub at `jacksbot147-code/day14-studio`)
- A monitor + keyboard still connected (you'll go headless after this)

---

## Step 1 — Verify Cowork sees the empire seeds

Paste into Cowork on the mini:

```
You are running on Jack's new Mac mini, freshly set up. First job is
to verify the seed files for Day14 OS are in place.

Read `~/Documents/studio/docs/seeds/skills/council-decision/SKILL.md`
in full. Then in three sentences confirm: (1) the file is readable,
(2) the council protocol has five stages, (3) the logging contract
points to `~/Documents/businesses/_shared/council-log/`.
```

**Expected output:** Three sentences confirming all three. If any fail,
the studio repo wasn't cloned correctly. Re-clone before continuing.

---

## Step 2 — Run the bootstrap

Paste into Cowork:

```
Run this command and report what got scaffolded vs. what was already
there:

  bash ~/Documents/studio/scripts/bootstrap-day14-os.sh

After it completes, list the contents of ~/Documents/businesses/_shared/
and confirm every subdirectory has at least one file.
```

**Expected output:** Output of the bootstrap (lots of green `✓` lines),
followed by a confirmation that `agents/`, `skills/`, `templates/`,
`sql/`, and `council-log/` all have content.

---

## Step 3 — Smoke test the schedule tool

Paste into Cowork:

```
Create a one-shot scheduled task that fires in 2 minutes from now.
The task's prompt should be: "Write the current ISO timestamp to
/tmp/mini-smoke-test.txt".

After creating it, list all scheduled tasks so I can see the new one.
```

**Expected output:** A scheduled task with a fireAt 2 minutes in the
future, in the listed tasks output.

Then wait 3 minutes (go grab coffee). After 3 minutes, paste:

```
Check whether /tmp/mini-smoke-test.txt exists. If yes, read its
contents and confirm the timestamp is within the last 5 minutes.
```

**Expected output:** Confirmation the file exists with a fresh timestamp.

If this works, **the Mac mini is now the Day14 OS runtime.**

---

## Step 4 — Verify the Council skill fires

Paste into Cowork:

```
Read `~/Documents/businesses/_shared/skills/council-decision/SKILL.md`
and run a mini-Council on this trivial question: "Should I drink
coffee or tea this morning?"

Use the full protocol (5 advisors, anonymized peer review, Chairman),
but keep each advisor to one sentence. Do NOT log this to council-log
— it's a smoke test, not a real decision. Output the result inline.
```

**Expected output:** Five one-sentence advisor takes, an A-E shuffle
with peer review, a Chairman recommendation. Confirms the skill format
is loadable.

---

## Step 5 — Mount the studio repo as the day14 tenant

Paste into Cowork:

```
The empire pattern wants ~/Documents/businesses/day14/ to be the Day14
business tenant. Right now ~/Documents/studio/ is where Day14 lives.

Do NOT move the studio folder. Instead, create a symbolic link:

  ln -s ~/Documents/studio ~/Documents/businesses/day14/studio

Then confirm the link works by listing
~/Documents/businesses/day14/studio/docs/.
```

**Expected output:** Listing of the docs folder via the symlink path.

---

## Step 6 — Go headless

You can now unplug the monitor and keyboard from the mini.

On your laptop, open Screen Sharing:
- ⌘+Space → "Screen Sharing"
- Enter the mini's IP (the one you wrote on the sticky note in the runbook)
- Sign in with your Apple ID

You should see the mini's desktop. Cowork on the mini is now driveable
from the laptop, same as if you were sitting in front of it.

---

## Step 7 — One final test: Cowork on the mini, prompted from the laptop

On your laptop, NOT via Screen Sharing — open a fresh Cowork session
locally on the laptop (this confirms the two sessions are independent).
Paste:

```
Verify Day14 OS is running on the Mac mini.

SSH to the mini at <mini's IP> as user jcboppington. (If SSH key isn't
set up yet, that's fine — return "SSH not yet configured" and we'll
do that later.)

If SSH works, run this on the mini and report the output:

  ls ~/Documents/businesses/_shared/skills/

You're looking for at least 3 directories: council-decision, day14-voice,
swfl-context.
```

**Expected output:** Either "SSH not yet configured" (fine — defer to
Week 2) or the listing of three skill directories.

---

## What's next after Day 1

You now have:
- A working Day14 OS runtime on the Mac mini
- Three real skills installed
- A council decision logged (the one from tonight)
- A bootstrap that's idempotent and safe to extend
- A smoke-tested scheduled-task pipeline

The Week 1 work in `day14-os-vision.md` can now start. First piece:
spin up a Supabase project for Day14 OS and paste in the schema from
`~/Documents/businesses/_shared/sql/day14-os-schema.sql`.

Don't do that today. Today: pick up the mini, follow the runbook,
follow this playbook, smoke-test, then close the laptop and rest.

The hard part is over. Tomorrow is the easy part.

---

## Troubleshooting

**Bootstrap script "permission denied":** Run
`chmod +x ~/Documents/studio/scripts/bootstrap-day14-os.sh` then retry.

**Bootstrap "seeds directory not found":** Studio repo not cloned, or
clone is incomplete. Run `cd ~/Documents/studio && git pull`.

**Scheduled task didn't fire:** Claude desktop wasn't open at the
scheduled time, OR the task fired but Claude desktop is on a different
screen. Reopen Cowork on the mini, check `mcp__scheduled-tasks__list_scheduled_tasks`
and look at lastRunAt.

**Screen Sharing won't connect:** Mac mini's Sharing setting got reset
during the OS install. Plug monitor back in, re-enable in System
Settings → Sharing → Screen Sharing.

**Symlink not working in Cowork:** Cowork sandbox may not follow
symlinks. If that's the case, defer the day14/ symlink to Week 2 and
just leave ~/Documents/studio where it is for now.
