# IT Project Management Kanban Board

A single-page Kanban board for tracking IT project delivery work, built as an internal
demo and training artefact for a **fictional** "UOB IT PMO". The whole application —
markup, styles and behaviour — is one file: `index.html`.

**Live demo:** https://chenxuefeng-code.github.io/kanban4/

> This is a demo/training tool, not a product and not an official system. It is not
> affiliated with, endorsed by, or representative of any real company or bank, and all
> task data in it is invented.

## Running it locally

There is no build step, no package manager and no dev server. Clone the repo and open
the file:

```powershell
Invoke-Item index.html   # or just double-click it
```

Changes take effect on browser refresh. Debug in the browser devtools console.

## Features

- Four fixed columns — **Backlog**, **In Progress**, **Blocked**, **Done** — with live
  per-column counts and a header summary strip.
- Add tasks through a validated form (title, description, project, category, assignee,
  due date, priority, status). Validation errors render inline under each field.
- Move cards by **drag and drop**, or by the `Move ▸` button — every drag interaction has
  a keyboard-accessible equivalent, and the board is fully usable without a mouse.
- Delete with an inline Yes/No confirmation inside the card (no native dialogs).
- Filter by project, priority, or assignee substring. Summary counts always reflect the
  full task list, not the filtered view.
- Four priority levels colour-coded on the card's left border, always paired with a text
  pill — colour is never the only signal.
- Overdue tasks (past due and not `Done`) are badged.
- Optional email notification on task creation via a FormSubmit endpoint.

## Intentional behaviour

**The board holds no persistent state.** There is no `localStorage`, no backend and no
database — refreshing the page resets it to the eight seeded demo tasks. This is
deliberate for a training artefact and is called out in the UI; it is not a bug.

## Email notifications (optional, off by default)

`FORMSUBMIT_ENDPOINT` near the top of the script ships as a placeholder
(`YOUR_EMAIL@example.com`). Replace it with your own address to have new tasks emailed
via [FormSubmit](https://formsubmit.co); the first submission triggers a one-time
confirmation email and nothing delivers until you click its link.

The call is fire-and-forget: a card is added optimistically and a network failure only
raises a warning toast, so notifications can never block or break the board.

## Tech stack

Vanilla HTML, CSS and JavaScript — no framework, no bundler, no dependencies, and no
external resources (icons are inline SVG or Unicode, typography is a system font stack).
A single `state` object is the source of truth; mutating it and calling `renderBoard()`
is the only path that writes card DOM. Card buttons are wired by event delegation on the
board, and every user-supplied value is escaped before it reaches `innerHTML`.

Deployed to GitHub Pages by the workflow in `.github/workflows/deploy.yml`, which
uploads the repo as-is on every push to `main`.
