# IT Project Management Kanban Board

A single-page Kanban board for tracking IT project delivery work, built as an internal
demo and training artefact for a **fictional** "UOB IT PMO". The whole application —
markup, styles and behaviour — is one file: `index.html`.

**Live demo:** https://chenxuefeng-code.github.io/kanban4/

![The board in a browser: a sky-blue header with a delivery progress chart (an overall stacked status bar and one bar per project), the Add Task form on the left, and the Backlog lane in red and Blocked lane in amber on the top row, with cards grouped by deadline.](docs/screenshot.png)

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

- A **delivery progress chart** in the header: an overall stacked bar of task status, a
  bar per project (least complete first), hover tooltips, and a table view.
- Four fixed lanes with live counts. **Backlog** (red) and **Blocked** (amber) sit on the
  top row so the work needing attention is seen first; **In Progress** and **Done** below.
- Inside each lane, cards are grouped by deadline (Overdue, Due in the next 14 days, Due
  later) and sorted soonest first, with the days remaining or overdue on every card.
- Add tasks through a validated form (title, description, project, category, assignee,
  due date, priority, status). Validation errors render inline under each field.
- Move cards by **drag and drop**, or by the `Move ▸` button — every drag interaction has
  a keyboard-accessible equivalent, and the board is fully usable without a mouse.
- Delete with an inline Yes/No confirmation inside the card (no native dialogs).
- Filter by project, priority, or assignee substring. The progress chart always reflects
  the full task list, not the filtered view.
- Four priority levels colour-coded on the card's left border, always paired with a text
  pill — colour is never the only signal.
- Optional email notification on task creation via a FormSubmit endpoint.
- An **IT Support prompt**: after 10 seconds on the page, a modal dialog thanks the visitor
  and gives the IT Support hotline (8765 4321, a `tel:` link). It appears once per page
  load and closes with its button or Escape.
- A floating **WhatsApp chat button** (bottom right). It opens a dialog of suggested IT
  Support questions (locked account, VPN, software install, slow laptop, phishing report,
  access request); picking one opens a WhatsApp chat with +65 1234 5678 in a new tab with
  the question already typed. The number and questions are the `WHATSAPP_NUMBER` and
  `CHAT_QUERIES` constants.

## Intentional behaviour

**The board holds no persistent state.** There is no `localStorage`, no backend and no
database — refreshing the page resets it to the eight seeded demo tasks. This is
deliberate for a training artefact and is called out in the UI; it is not a bug.

The IT Support prompt is also stateless: because nothing is stored, it reappears after
every refresh. The delay is `SUPPORT_PROMPT_DELAY_MS` in the script's constants.

## Email notifications (optional, off by default)

`FORMSUBMIT_ENDPOINT` near the top of the script ships as a placeholder
(`YOUR_EMAIL@example.com`). Replace it with your own address to have new tasks emailed
via [FormSubmit](https://formsubmit.co); the first submission triggers a one-time
confirmation email and nothing delivers until you click its link.

The call is fire-and-forget: a card is added optimistically and a network failure only
raises a warning toast, so notifications can never block or break the board. While the
placeholder is in place no request is sent at all, and emails are rate-limited (one per
15 seconds, 20 per page session) so the form cannot be used to flood the inbox. After
activation, FormSubmit gives you a random alias: use it in place of your address so the
address is not readable in the page source.

## Security

The page is static, but it still takes untrusted input and talks to one third party, so
it is hardened in layers:

- **Content Security Policy** (meta tag): nothing loads or connects anywhere except
  FormSubmit (the WhatsApp chat is a plain link the visitor chooses to follow); inline script and styles are pinned by SHA-256 hash; forms cannot post
  anywhere; `<base>` and plugins are blocked.
- **Trusted Types**: raw strings cannot be assigned to `innerHTML`; all HTML goes through
  one policy after `escapeHtml()`.
- **Input hygiene**: allowlists for every dropdown value, length limits, a name pattern for
  assignees, and stripping of control, zero-width and bidi-override characters.
- **Drag and drop** only accepts cards dragged from this board.
- **Clickjacking**: the board will not run inside another site's frame.
- **Deployment** publishes only `index.html`; workflow actions are pinned to commit SHAs
  and run with least-privilege permissions.

After editing the `<script>` or `<style>` block, run `node tools/csp-hash.js` to refresh
the CSP hashes; the deploy fails if they are stale.

## Tech stack

Vanilla HTML, CSS and JavaScript — no framework, no bundler, no dependencies, and no
external resources (icons are inline SVG or Unicode, typography is a system font stack).
A single `state` object is the source of truth; mutating it and calling `renderBoard()`
is the only path that writes card DOM. Card buttons are wired by event delegation on the
board, and every user-supplied value is escaped before it reaches `innerHTML`.

Deployed to GitHub Pages by the workflow in `.github/workflows/deploy.yml`, which
checks the CSP hashes and publishes `index.html` on every push to `main`.
