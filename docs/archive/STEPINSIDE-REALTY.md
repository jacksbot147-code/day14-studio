# StepInside realty — archived off this site

The realty admin (`src/app/admin/realty`, `src/app/api/realty`, `src/lib/realty-*`) belongs to StepInside, a separate product. It was removed from the Day14 launch site so this repo stops shipping that surface.

The code as it existed on `feat/cinematic-rebuild-2026-06` at the time of removal is preserved on branch `cursor/archive-stepinside-realty-fb1b`.

Restore a path without merging that branch:

```bash
git checkout cursor/archive-stepinside-realty-fb1b -- src/app/admin/realty src/app/api/realty src/lib/realty-acquisition.ts src/lib/realty-contracts.ts src/lib/realty-gameplan.ts src/lib/realty-loopfinder.ts src/lib/realty-rehab.ts
```

`/admin/realty` on this site 301s to `/admin`.
