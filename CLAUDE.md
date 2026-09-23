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

Changes take effect on browser refresh. Debug in the browser devtools console; there is
no other tooling to run.

## Hard constraints

These are requirements of the deliverable, not incidental choices. Violating any of them
breaks the brief:

- **Vanilla HTML/CSS/JS only.** No React, Vue, jQuery, Tailwind, bundler, npm, or build step.
- **Single file.** All markup, the `<style>` block, and the `<script>` block live in
  `index.html`. Do not split into separate `.css`/`.js` files.
- **Zero external resources.** No CDN scripts, no web fonts, no image files. Icons are
  inline SVG or Unicode glyphs; typography is a system font stack. The only outbound URL
  in the file is the FormSubmit endpoint — a `grep -n "https://" index.html` returning
  more than one hit means something was added that shouldn't be.
- **No persistence of any kind.** No `localStorage`, `sessionStorage`, IndexedDB, or
  cookies. A refresh resetting the board to seed data is intended behaviour and is called
  out in the UI. Do not "fix" this.
- **No real UOB branding.** Neutral text wordmark and a generic corporate blue palette
  only — no real logo, trademark, or imitation of an official system.
- No `alert()` or native `confirm()` — validation errors render inline under each field,
  and delete confirmation is an inline Yes/No toggle inside the card.
- No `!important` in CSS.

## Architecture

### State and rendering

A single `state` object (`index.html:707`) is the source of truth:

```js
state = { tasks: [], filters: {…}, ui: {…}, idCounter: 0 }
```

The rendering contract is strict: **mutate `state`, then call `renderBoard()`**. Nothing
outside `renderBoard()` / `renderCard()` writes card DOM. `renderBoard()` rebuilds each
column's `.column-body` innerHTML from scratch, so any per-card interaction state that
must survive a re-render lives in `state.ui` (`openMoveMenuFor`, `confirmDeleteFor`) — not
in the DOM. `focusCardButton()` restores keyboard focus after the rebuild.

The four column shells (`.column` with `data-status`, `.column-body` with `data-body`) are
static markup and are never regenerated; drag-and-drop listeners attach to them once.

### Function layout

The script is organised into commented sections in this order: config → constants → state
→ helpers → seed data → filtering → rendering → mutations → toasts → FormSubmit →
validation → event wiring → init. Keep new code in the matching section.

Mutations are `addTask()`, `moveTask()`, `deleteTask()` — each edits the array and
re-renders. `applyFilters()` is pure and returns the visible subset; the header summary
counts are computed from the *full* `state.tasks`, not the filtered view.

### Event handling

Card buttons are wired by **delegation** on `#board` with `data-action` / `data-id`
attributes (`wireCardActions()`), because cards are destroyed on every render. Adding a new
card control means adding a `data-action` case there, not an inline handler.

Drag-and-drop uses the native HTML5 API: delegated `dragstart`/`dragend` on the board,
plus per-column `dragover`/`dragleave`/`drop`. Every drag interaction has a
keyboard-accessible equivalent via the `Move ▸` button — keep that parity when touching
either path.

### Escaping

`escapeHtml()` (`index.html:719`) must wrap every user-supplied value interpolated into a
template string. `renderCard()` builds HTML by concatenation, so an unescaped field is a
live XSS hole.

### FormSubmit integration

`FORMSUBMIT_ENDPOINT` (`index.html:695`) is the single place the notification email address
appears; it ships with a placeholder. FormSubmit requires a one-time activation — the first
submission triggers a confirmation email and nothing delivers until its link is clicked.

The call is fire-and-forget and **must never break the board**: `wireForm()` adds the card
optimistically, then calls `notifyNewTask()` in parallel with a `.catch()` that only raises
a warning toast. Never make card creation await the network. Never send the email address
anywhere but this endpoint.

## Domain vocabulary

Statuses are fixed and ordered: `Backlog`, `In Progress`, `Blocked`, `Done` (`STATUSES`).
Priorities: `Critical`, `High`, `Medium`, `Low` (`PRIORITIES`), colour-coded on the card's
left border and always accompanied by a text pill — colour is never the only signal.

Task IDs are `UOB-ITPM-####` from a zero-padded counter starting at 1000; the eight seeded
demo tasks take 1001–1008.

A task is overdue when `dueDate < today && status !== "Done"`. Dates are compared as
`YYYY-MM-DD` strings via `todayISO()` — keep that format for any new date logic rather than
introducing `Date` comparisons.

## Accessibility expectations

Semantic landmarks, `<label for>` on every input, `aria-label` on icon-only buttons,
`aria-live="polite"` on the toast region, visible focus rings. The board must be fully
usable without a mouse.
