#!/usr/bin/env bash
# setup-obsidian-vault.sh — turn ~/Documents/businesses into an Obsidian vault.
# Idempotent. Run on the Mac: bash ~/Documents/studio/scripts/setup-obsidian-vault.sh
# Never touches dossier files — only adds _vault/ notes and .obsidian/ config.

set -euo pipefail
VAULT="$HOME/Documents/businesses"

[ -d "$VAULT" ] || { echo "ERROR: $VAULT not found"; exit 1; }
mkdir -p "$VAULT/_vault" "$VAULT/.obsidian"

# --- .obsidian config (only if missing; never clobber an existing vault) ---
if [ ! -f "$VAULT/.obsidian/app.json" ]; then
  cat > "$VAULT/.obsidian/app.json" <<'EOF'
{
  "showUnsupportedFiles": true,
  "alwaysUpdateLinks": true,
  "newFileLocation": "folder",
  "newFileFolderPath": "_vault",
  "attachmentFolderPath": "_vault/attachments"
}
EOF
  echo "wrote .obsidian/app.json"
else
  echo "skip .obsidian/app.json (exists)"
fi

if [ ! -f "$VAULT/.obsidian/graph.json" ]; then
  cat > "$VAULT/.obsidian/graph.json" <<'EOF'
{
  "collapse-filter": false,
  "search": "path:_shared/customers OR path:_vault",
  "showTags": true,
  "showAttachments": false,
  "hideUnresolved": true
}
EOF
  echo "wrote .obsidian/graph.json"
fi

# --- Dashboard note (DataviewJS over the 01-brand.json dossiers) ---
if [ ! -f "$VAULT/_vault/Empire Dashboard.md" ]; then
  cat > "$VAULT/_vault/Empire Dashboard.md" <<'EOF'
# Empire Dashboard

Requires the **Dataview** community plugin with *Enable JavaScript queries* on.

## Customers

```dataviewjs
const files = app.vault.getFiles()
  .filter(f => /^_shared\/customers\/[^/]+\/01-brand\.json$/.test(f.path));
const rows = [];
let mrr = 0;
for (const f of files) {
  try {
    const b = JSON.parse(await dv.io.load(f.path));
    const slug = f.path.split("/")[2];
    const amt = Number(b.monthly_amount ?? 0);
    if ((b.status ?? "") === "active") mrr += amt;
    rows.push([
      `[[${f.path.replace("01-brand.json", "02-status.md")}|${b.name ?? slug}]]`,
      b.vertical ?? "—", b.status ?? "—",
      amt ? `$${amt}/mo` : "—", b.signup_date ?? "—",
    ]);
  } catch (e) { rows.push([f.path, "parse error", "", "", ""]); }
}
rows.sort((a, b) => String(a[2]).localeCompare(String(b[2])));
dv.header(3, `Active MRR: $${mrr}/mo · ${rows.length} customers`);
dv.table(["Customer", "Vertical", "Status", "MRR", "Signed up"], rows);
```

## Recent work register

```dataviewjs
const p = "_shared/growth/work-register.jsonl";
try {
  const lines = (await dv.io.load(p)).trim().split("\n").slice(-25).reverse();
  dv.table(["When", "Type", "Source", "Notes"], lines.map(l => {
    try { const e = JSON.parse(l);
      return [e.timestamp ?? e.ts ?? "—", e.type ?? "—", e.source ?? e.skill ?? "—",
              String(e.notes ?? e.intent ?? "").slice(0, 80)];
    } catch { return ["—", "unparsed", "—", l.slice(0, 80)]; }
  }));
} catch (e) { dv.paragraph("work-register.jsonl not found at " + p); }
```
EOF
  echo "wrote _vault/Empire Dashboard.md"
else
  echo "skip Empire Dashboard.md (exists)"
fi

# --- Setup instructions ---
cat > "$VAULT/_vault/VAULT-SETUP.md" <<'EOF'
# Vault setup (one time, ~2 min)

1. Open Obsidian → "Open folder as vault" → select `~/Documents/businesses`
2. Settings → Community plugins → turn off Restricted mode → Browse →
   install + enable **Dataview**
3. Settings → Dataview → enable **JavaScript queries**
4. Open `_vault/Empire Dashboard.md`

Notes
- Dossiers are append-only; treat Obsidian as a read/annotate surface.
  New notes default into `_vault/` so customer folders stay clean.
- Graph view is pre-filtered to customers + _vault.
- Optional plugins worth adding later: Omnisearch (better search across
  JSON/JSONL), Tracker (MRR over time).
EOF
echo "wrote _vault/VAULT-SETUP.md"
echo ""
echo "Done. Open ~/Documents/businesses as a vault in Obsidian (see _vault/VAULT-SETUP.md)."
