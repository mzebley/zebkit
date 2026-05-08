# Penpot Token Sync

Bidirectional sync between Zebkit's three-tier token system and [Penpot](https://penpot.app), an open-source design tool.

- **Push** — compiles Zebkit tokens to a [W3C DTCG](https://tr.designtokens.org/format/) JSON file that designers import into Penpot.
- **Pull** — reads tokens back from Penpot (via API or exported file) and writes Zebkit-compatible override files.

No proprietary plan is required. Push and pull work on Penpot's free tier and on self-hosted instances.

---

## Directory layout

```
src/scripts/penpot/
├── push.ts                   # penpot:push entry point
├── pull.ts                   # penpot:pull entry point
├── client.ts                 # Penpot RPC API fetch wrapper
├── types.ts                  # W3C DTCG + Tokens Studio + API types
└── transform/
    ├── to-dtcg.ts            # Zebkit → DTCG transform (used by push)
    └── from-dtcg.ts          # DTCG / Tokens Studio → Zebkit transform (used by pull)
```

---

## Setup

### 1. Get a Penpot access token

In Penpot, open your profile (top-left avatar) → **Profile settings** → **Access tokens** → **New token**.

Set an appropriate expiry and copy the value — it will not be shown again.

### 2. Find your file ID

Open the target Penpot file. The file ID is the UUID segment in the URL:

```
https://design.penpot.app/view/abc12345-0000-0000-0000-000000000000/...
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

### 3. Configure environment variables

Copy `.env.example` to `.env` at the project root and fill in your values:

```dotenv
PENPOT_ACCESS_TOKEN=<your-personal-access-token>
PENPOT_FILE_ID=<your-file-uuid>
# PENPOT_INSTANCE_URL=https://your-penpot.example.com  # self-hosted only
```

The `.env` file is gitignored. Never commit real credentials.

### 4. Optional: configure in `zebkit.config.json`

The `penpot` key in `zebkit.config.json` can supplement or replace environment variables:

```json
{
  "tokens": {
    "selectedComponents": ["button", "input"],
    "customTokenPath": "dist/penpot-pull"
  },
  "penpot": {
    "instanceUrl": "https://penpot.yourorg.com",
    "fileId": "abc12345-0000-0000-0000-000000000000",
    "pullOutputPath": "dist/penpot-pull",
    "skipTypes": ["display", "flex"]
  }
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `instanceUrl` | string | `https://design.penpot.app` | Base URL of the Penpot instance |
| `fileId` | string | `PENPOT_FILE_ID` env var | Target Penpot file UUID |
| `pullOutputPath` | string | `dist/penpot-pull` | Where pull writes override files |
| `skipTypes` | string[] | `[]` | Extra Zebkit token types to exclude from push |

---

## Push

Exports Zebkit tokens as a DTCG JSON file for import into Penpot.

```bash
npm run penpot:push
```

Output is written to `dist/penpot-push/zebkit-tokens.tokens.json`.

**Import into Penpot:**
1. Open your Penpot file.
2. Open the **Assets** panel (left sidebar) → **Design Tokens**.
3. Click the **Import** button (folder icon) and select `zebkit-tokens.tokens.json`.

### Flags

| Flag | Description |
|------|-------------|
| `--dry-run` | Print the DTCG JSON to stdout without writing files |
| `--out <dir>` | Override the output directory |

```bash
npm run penpot:push -- --dry-run
npm run penpot:push -- --out ./exports/tokens
```

### What gets pushed

All token modules discovered by the standard Zebkit gather process are included, minus types that have no design-tool equivalent:

| Skipped type | Reason |
|---|---|
| `utility` | SCSS generator flags — not a design value |
| `setting` | Build-time component configuration |
| `asset` | File path references resolved at build time |
| `googleFont` | Penpot manages typeface imports separately |

Additional types can be excluded via `penpot.skipTypes` in `zebkit.config.json`.

### Token format in Penpot

Each Zebkit module becomes a top-level token group in Penpot (the "zbk-" prefix is stripped):

| Zebkit module | Penpot group |
|---|---|
| `zbk-color` | `color` |
| `zbk-spacing` | `spacing` |
| `zbk-button` | `button` |
| `zbk-app` | `app` |

Alias references are preserved verbatim. Because Zebkit uses the same `{module.key}` syntax as DTCG, a token value like `{color.butterfield-50}` works without transformation.

Groups are ordered so that dependencies always appear before the modules that reference them (primitives → semantic → component), which is required for Penpot to resolve aliases correctly.

### Zebkit → DTCG type mapping

| Zebkit type | DTCG `$type` |
|---|---|
| `color`, `borderColor` | `color` |
| `spacing`, `sizing`, `dimension`, `rootSize`, `rootFontSize`, `fontSize`, `lineHeight`, `letterSpacing`, `borderRadius` | `dimension` |
| `fontWeight` | `fontWeight` |
| `fontFamily` | `fontFamily` |
| `borderWidth` | `strokeWidth` |
| `opacity` | `opacity` |
| `boxShadow` | `shadow` |
| `zIndex` | `number` |
| `transition`, `textDecoration`, `textTransform`, `textAlignment`, `display`, `content`, `flex`, `borderStyle`, `fontStyle`, `boolean` | `string` |

Note that DTCG has fewer types than Zebkit — several distinct Zebkit types map to the same DTCG type (e.g. `rootSize` and `dimension` both become `"dimension"`). The original Zebkit type is preserved in `$extensions.zebkit.type` on every token so it can be recovered during pull without information loss.

---

## Pull

Fetches designer-edited tokens from Penpot and writes them as Zebkit JSON override files.

```bash
npm run penpot:pull
```

### Modes

**API mode** (default) — calls the Penpot RPC API directly:

```bash
npm run penpot:pull
```

Requires `PENPOT_ACCESS_TOKEN` and `PENPOT_FILE_ID`. If the API call fails, the command prints instructions for falling back to file mode.

**File mode** — reads a JSON file exported manually from Penpot:

```bash
npm run penpot:pull -- --file ./exported-tokens.json
```

To export from Penpot: **Assets** → **Design Tokens** → **Export** (download icon). The exported file may be in Tokens Studio format — pull handles both Tokens Studio and DTCG automatically.

### Flags

| Flag | Description |
|------|-------------|
| `--file <path>` | Read from a locally exported token JSON file |
| `--out <dir>` | Override the output directory |

### Output

Pull writes one JSON file per token module to `dist/penpot-pull/`:

```
dist/penpot-pull/
├── zbk-color.tokens.json
├── zbk-spacing.tokens.json
├── zbk-app.tokens.json
├── zbk-button.tokens.json
└── …
```

Each file is a flat `TokenInterface` map (token key → `{ value, type, description }`), the same shape as Zebkit's source token files. After reviewing the diff output, apply them as overrides:

```json
{
  "tokens": {
    "customTokenPath": "dist/penpot-pull"
  }
}
```

Then run `npm run build:tokens` as normal — the pulled values replace the defaults.

### Diff summary

Pull prints a diff of added, changed, and removed tokens compared to the current source. This is informational only; it does not prevent files from being written.

```
Diff vs source: 0 added, 3 changed, 0 removed
```

---

## Round-trip fidelity

Tokens pushed through `penpot:push` carry `$extensions.zebkit` metadata containing the original Zebkit `type` and `a11y` values. When those tokens are pulled back, the metadata is read first — the original type is restored exactly, not derived from the DTCG type.

Tokens created directly in Penpot (not via push) do not have this metadata. Pull applies a best-effort reverse mapping in that case:

| DTCG `$type` | Fallback Zebkit type |
|---|---|
| `color` | `color` |
| `dimension` | `dimension` |
| `fontFamily` | `fontFamily` |
| `fontWeight` | `fontWeight` |
| `strokeWidth` | `borderWidth` |
| `opacity` | `opacity` |
| `shadow` | `boxShadow` |
| `number` | `zIndex` |
| `string` | `content` |
| `duration`, `cubicBezier` | `transition` |

---

## Component library linking

Penpot's plugin token API is under active development (tracked in [penpot/penpot#7916](https://github.com/penpot/penpot/issues/7916)). Once it ships, a Penpot plugin will be able to programmatically bind token values to component fill, stroke, sizing, and typography properties.

In the meantime, the recommended approach is:
1. Run `penpot:push` to get the token variables into the file.
2. In Penpot, open the component library file and apply tokens to component properties via right-click → **Apply token** in the Design panel.
3. Component-to-token bindings are preserved across token value edits — you only need to bind once per property.

---

## Troubleshooting

**`PENPOT_ACCESS_TOKEN environment variable is not set`**
Copy `.env.example` to `.env` and add your personal access token (Penpot → Profile → Access tokens).

**`No Penpot file ID found`**
Set `PENPOT_FILE_ID` in `.env` or add `"penpot": { "fileId": "..." }` to `zebkit.config.json`. The file ID is the UUID in the Penpot file URL.

**`Penpot API error 401`**
Your access token has expired or was revoked. Generate a new token in Penpot → Profile → Access tokens.

**`Failed to parse Penpot API response as JSON`**
Some Penpot instances respond in transit+json format. Use file mode instead:
```bash
npm run penpot:pull -- --file ./exported-tokens.json
```

**`No tokens found in the Penpot file`**
The file has no design tokens imported yet. Run `penpot:push` first to populate the token sets, then make edits in Penpot, then pull.

**Pull overwrites tokens I want to keep**
The pulled files are overrides, not replacements. Any token key absent from the pulled files falls back to the Zebkit source value. You can also pull into a separate directory and selectively copy only the changed modules.

---

## Relationship to the standard build pipeline

The Penpot sync scripts re-use the existing Zebkit token infrastructure:

- `gatherZebkitFiles` discovers the same `.../tokens/tokens.ts` sources that `build:tokens` uses.
- `buildZebkitTokens` compiles them through the same validation and merge logic.
- The compiled `tokens` map is what gets transformed to DTCG — the CSS conversion step is skipped.
- Pull writes files in the format accepted by `customTokenPath`, meaning standard `build:tokens` runs consume the pulled values transparently.

No new token source format is introduced. The DTCG files are exchange artifacts, not source of truth.
