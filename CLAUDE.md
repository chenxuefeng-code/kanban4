# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page IT Project Management Kanban board built as an internal demo/training tool
for a fictional "UOB IT PMO". The entire application is one file: `index.html`.

## Running it

There is no build step, no package manager, no test suite, and no dev server.

```powershell
Invoke-Item index.html   # or just double-click the file
```

Changes take effect on browser refresh. Debug in the browser devtools console.

**After any edit to the `<script>` or `<style>` block, run `node tools/csp-hash.js`.**
The page's Content Security Policy pins both blocks by SHA-256 hash; a stale hash makes
the browser refuse to run the script (blank board, CSP error in the console). The deploy
workflow runs `node tools/csp-hash.js --check` and fails on a stale hash.

## Hard constraints

These are requirements of the deliverable, not incidental choices. Violating any of them
breaks the brief:

- **Vanilla HTML/CSS/JS only.** No React, Vue, jQuery, Tailwind, bundler, npm, or build step.
- **Single file.** All markup, the `<style>` block, and the `<script>` block live in
  `index.html`. Do not split into separate `.css`/`.js` files.
- **Zero external resources.** No CDN scripts, no web fonts, no image files. Icons are
  inline SVG or Unicode glyphs; typography is a system font stack. The only host the page
  *connects* to is FormSubmit; the only other host is `wa.me`, which is a user-clicked
  link (new tab), never fetched. `grep -n "https://" index.html` should return exactly
  three hits: the CSP's `connect-src https://formsubmit.co`, the `FORMSUBMIT_ENDPOINT`
  constant and the `WHATSAPP_BASE` constant. Any other hit means something was added
  that shouldn't be.
- **No persistence of any kind.** No `localStorage`, `sessionStorage`, IndexedDB, or
  cookies. A refresh resetting the board to seed data is intended behaviour and is called
  out in the UI. Do not "fix" this.
- **No real UOB branding.** Neutral text wordmark and a generic sky-blue palette
  only — no real logo, trademark, or imitation of an official system.
- **No inline event handlers or `style=""` attributes** anywhere in markup or in HTML
  strings. The CSP blocks both. Set dynamic styles through the CSSOM (`el.style.x = …`)
  and attach handlers with `addEventListener`.
- No `alert()` or native `confirm()` — validation errors render inline under each field,
  and delete confirmation is an inline Yes/No toggle inside the card.
- No `!important` in CSS.

## Architecture

### State and rendering

A single `state` object (`index.html:903`) is the source of truth:

```js
state = { tasks: [], filters: {…}, ui: {…}, notify: {…}, session: {…}, agent: {…}, idCounter: 0 }
```

The rendering contract is strict: **mutate `state`, then call `renderBoard()`**. Nothing
outside `renderBoard()` / `renderCard()` writes card DOM. `renderBoard()` rebuilds each
column's `.column-body` innerHTML from scratch, so any per-card interaction state that
must survive a re-render lives in `state.ui` (`openMoveMenuFor`, `confirmDeleteFor`,
`draggingId`) — not in the DOM. `focusCardButton()` restores keyboard focus after the rebuild.

The four column shells (`.column` with `data-status`, `.column-body` with `data-body`) are
static markup and are never regenerated; drag-and-drop listeners attach to them once. Their
DOM order is Backlog, Blocked, In Progress, Done in a 2×2 grid, so the attention lanes
(Backlog on a red background, Blocked on amber) sit on top. That is layout only:
`STATUSES` keeps its domain order.

Inside a lane, `renderLane()` sorts by due date (soonest first; Done shows latest first)
and groups cards under Overdue / Due in the next 14 days / Due later headings
(`deadlineBand()`, `DUE_SOON_DAYS`).

`renderProgress()` draws the header's delivery-progress chart (overall stacked bar,
per-project bars sorted least-complete first, and a table view) with DOM APIs, not
HTML strings.

### Function layout

The script is organised into commented sections in this order: config → constants → state
→ helpers → seed data → filtering → rendering → mutations → toasts → FormSubmit →
email agent → validation → event wiring → init. Keep new code in the matching section.

Mutations are `addTask()`, `moveTask()`, `setBlocker()`, `deleteTask()` — each edits the array and
re-renders. `applyFilters()` is pure and returns the visible subset; the header progress
chart is computed from the *full* `state.tasks`, not the filtered view.

### Event handling

Card buttons are wired by **delegation** on `#board` with `data-action` / `data-id`
attributes (`wireCardActions()`), because cards are destroyed on every render. Adding a new
card control means adding a `data-action` case there, not an inline handler.

Drag-and-drop uses the native HTML5 API: delegated `dragstart`/`dragend` on the board,
plus per-column `dragover`/`dragleave`/`drop`. Every drag interaction has a
keyboard-accessible equivalent via the `Move ▸` button — keep that parity when touching
either path. A drop is accepted only when `state.ui.draggingId` was set by a `dragstart` on
one of the board's own cards; data dragged in from other pages is ignored.

### Escaping, Trusted Types and input hygiene

`escapeHtml()` (`index.html:916`) must wrap every user-supplied value interpolated into a
template string. `renderCard()` builds HTML by concatenation, so an unescaped field is a
live XSS hole.

The CSP enforces Trusted Types: assigning a plain string to `innerHTML` throws. The only
HTML sink is `setHTML()` (`index.html:934`), which goes through the `kanban-html` policy.
Route any new HTML rendering through it, and prefer `textContent` / `make()` where no markup
is needed.

`validateForm()` runs free text through `cleanText()` (strips control, zero-width and
bidi-override characters), checks project/category/priority/status against the frozen
allowlists, applies `LIMITS`, and restricts assignee names to `ASSIGNEE_PATTERN`.

### Content Security Policy

GitHub Pages cannot send headers, so the policy is a `<meta http-equiv>` tag at the top of
`<head>`: `default-src 'none'`, hash-pinned `script-src`/`style-src`,
`connect-src https://formsubmit.co`, `form-action 'none'`, `base-uri 'none'`, Trusted Types.
`tools/csp-hash.js` recomputes the hashes, so keep exactly one inline `<script>` and one
`<style>` block, and never write those literal tags elsewhere in the file (comments
included). A meta CSP cannot set `frame-ancestors`, so `init()` refuses to run inside a
frame (`isFramed()`).

### FormSubmit integration

`FORMSUBMIT_ENDPOINT` (`index.html:860`) is the single place the notification email address
appears; it ships with a placeholder, and while the placeholder is set no request is sent. FormSubmit requires a one-time activation — the first
submission triggers a confirmation email and nothing delivers until its link is clicked.

The call is fire-and-forget and **must never break the board**: `wireForm()` adds the card
optimistically, then calls `notifyNewTask()` in parallel with a `.catch()` that only raises
a warning toast. Never make card creation await the network. Never send the email address
anywhere but this endpoint. `notifySkipReason()` rate-limits emails (`NOTIFY_COOLDOWN_MS`,
`NOTIFY_MAX_PER_SESSION`), and the request omits credentials, refuses redirects and times
out after `NOTIFY_TIMEOUT_MS`.

### Support prompt and WhatsApp chat

Two native `<dialog>`s, opened with `showModal()` (never `alert()`), with static markup
next to the toast region:

- `wireSupportPrompt()` shows the IT Support hotline once, `SUPPORT_PROMPT_DELAY_MS` after
  load. It is skipped if the visitor has already opened the chat (`state.ui.chatUsed`) or
  another dialog is open.
- `wireChatWidget()` wires the floating `.chat-fab` button (bottom right; the toast region
  sits above it) to a dialog listing `CHAT_QUERIES`. Each is a `wa.me` link to
  `WHATSAPP_NUMBER` with the query as `?text=` (built with `encodeURIComponent`, rendered
  with `make()`, opened with `target="_blank" rel="noopener noreferrer"`). Change the
  number or queries only in those constants.

### PMO sign-in and the email agent

`wireSignIn()` opens `#signInDialog`; the sign-in is a name only (`state.session.user`,
memory only, no password — a static page cannot authenticate, so do not fake a password
check). Signing in calls `openAgentDialog()`, which runs `runEmailAgent()` over the full
`state.tasks` and renders `#agentDialog` with `renderAgentDialog()` (DOM APIs only).

- Backlog tasks → `backlogDraft()` to `stakeholderAddress()`; Blocked tasks with a
  `blockedBy` app code → `calloutDraft()` to `blockerAddress()`. Drafts group by
  recipient + project; call-outs come first.
- An explicit `stakeholderEmail` / `blockerEmail` on the task wins; otherwise
  `teamAddress()` builds `APPCODE_PROJECTCODE@EMAIL_DOMAIN` from `PROJECT_CODES`.
- Blocked tasks without `blockedBy` (e.g. dragged there) are listed in `#agentNotes` with
  a field that calls `setBlocker()`.
- **Send is a `mailto:` link**, never a network request. Do not route these emails through
  FormSubmit or any other service. `EMAIL_PATTERN` is deliberately narrow so addresses
  need no escaping in the link; subject and body go through `encodeURIComponent`.
- `state.agent.handled` (keyed by `draft.key`) records Send/Close so closed drafts stay
  closed until the board changes or the user signs in again.

### Deployment

`.github/workflows/deploy.yml` publishes only `index.html` (and `.nojekyll`) to Pages.
Nothing else in the repo is public. Actions are pinned to commit SHAs.

## Domain vocabulary

Statuses are fixed and ordered: `Backlog`, `In Progress`, `Blocked`, `Done` (`STATUSES`).
Priorities: `Critical`, `High`, `Medium`, `Low` (`PRIORITIES`), colour-coded on the card's
left border and always accompanied by a text pill — colour is never the only signal.
Status colours (`--st-*`) are shared by lane edges, chart segments and the legend; they were
validated together for colour-vision deficiency, so change them as a set.

Task IDs are `UOB-ITPM-####` from a zero-padded counter starting at 1000; the eight seeded
demo tasks take 1001–1008.

A task is overdue when `dueDate < today && status !== "Done"`. Dates are compared as
`YYYY-MM-DD` strings via `todayISO()` — keep that format for any new date logic rather than
introducing `Date` comparisons.

## Accessibility expectations

Semantic landmarks, `<label for>` on every input, `aria-label` on icon-only buttons,
`aria-live="polite"` on the toast region, visible focus rings. The board must be fully
usable without a mouse.
