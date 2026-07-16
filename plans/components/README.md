# Component build plans

Handoff plans for the next wave of zebkit components. Phase 1 files are complete, self-contained prompts an implementation agent (Haiku) executes without further conversation. Phase 2 files are high-level plans to be promoted to full prompts later.

## How to hand off a Phase 1 component

Give the agent exactly this instruction:

> Implement the component specified in `plans/components/<file>.md`. Read, in order: `plans/components/00-conventions.md`, `GRAMMAR.md`, the plan file itself, then the reference implementation files the plan names. Follow the plan exactly. If two sources conflict, precedence is GRAMMAR.md, then the plan file, then conventions — and report the conflict in your summary rather than silently picking.

Respect the build order below — later plans assume earlier ones landed.

## Phase 1 — full Haiku-ready prompts

| Order | File | Component | Depends on |
|---|---|---|---|
| ✓ | [01-zbk-textarea.md](01-zbk-textarea.md) | `<zbk-textarea>` — **shipped in 0.8.0** | — |
| 2 | [02-zbk-link.md](02-zbk-link.md) | `<zbk-link>` | — |
| 3 | [03-zbk-badge.md](03-zbk-badge.md) | `<zbk-badge>` | — |
| 4 | [04-zbk-tag.md](04-zbk-tag.md) | `<zbk-tag>` | badge (pattern precedent) |
| 5 | [05-zbk-alert.md](05-zbk-alert.md) | `<zbk-alert>` | — |
| 6 | [06-zbk-progress.md](06-zbk-progress.md) | `<zbk-progress>` | — |
| 7 | [07-zbk-spinner.md](07-zbk-spinner.md) | `<zbk-spinner>` | — |
| 8 | [08-zbk-breadcrumb.md](08-zbk-breadcrumb.md) | `<zbk-breadcrumb>` | link (recommended, not required) |
| 9 | [09-zbk-disclosure.md](09-zbk-disclosure.md) | `<zbk-disclosure>` | — |
| 10 | [10-zbk-accordion.md](10-zbk-accordion.md) | `<zbk-accordion>` | disclosure (hard) |
| 11 | [11-zbk-popover.md](11-zbk-popover.md) | `<zbk-popover>` | — (extracts shared positioning util from tooltip) |
| 12 | [12-zbk-dialog.md](12-zbk-dialog.md) | `<zbk-dialog>` | — |
| 13 | [13-zbk-menu.md](13-zbk-menu.md) | `<zbk-menu>` + `<zbk-menu-item>` | popover (hard: shared positioning util) |

## Phase 2 — deferred, high-level plans

| File | Component | Blocked on |
|---|---|---|
| [20-zbk-combobox.md](20-zbk-combobox.md) | `<zbk-combobox>` | popover + menu shipped and stable |
| [21-zbk-toast.md](21-zbk-toast.md) | `<zbk-toast>` | alert shipped |
| [22-zbk-slider.md](22-zbk-slider.md) | `<zbk-slider>` | — (token-surface design questions) |
| [23-zbk-table.md](23-zbk-table.md) | `<zbk-table>` | scope decision (plain vs sortable/selectable) |
| [24-zbk-pagination.md](24-zbk-pagination.md) | `<zbk-pagination>` | button + link stable |

## How these files stay drift-proof

- **Every fact has exactly one home.** Each plan uses the same numbered section skeleton (see any Phase 1 file). An attribute lives only in §5, a token only in §9, a keyboard behavior only in §7. To add or change something, edit its home section — never restate it elsewhere in the file.
- **Shared mechanics live only in [00-conventions.md](00-conventions.md).** File layout, class skeletons, token module shape, test patterns, registration steps, build/verify commands. Plan files never repeat them; they say only what is specific to their component.
- **Live code beats prose.** Where a pattern already exists in the repo, plans point at the file (e.g. "mirror `src/components/input/index.ts`") instead of restating it, so the plan can't go stale against the code.
- **GRAMMAR.md amendments are explicit.** When a component needs a new slot name or state suffix, its plan has a "GRAMMAR.md amendment" section with the exact wording to add. No component silently extends the vocabulary.
- **§17 Revision notes** in each plan is your scratchpad while reviewing. Anything you write there must be folded into its home section (and deleted from §17) before handoff — an agent receiving the file should find §17 empty.
