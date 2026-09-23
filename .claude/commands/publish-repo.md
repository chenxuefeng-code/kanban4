---
description: Security-scan, then publish this project to GitHub with a README, About section, and Pages deployment
argument-hint: [repo url or owner/name] [extra notes, e.g. "private" or "skip pages"]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Skill
---

# Publish this project to GitHub

Target repo (may be empty — see step 0): **$ARGUMENTS**

Current state for reference:

- Remotes: !`git remote -v`
- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Recent commits: !`git log --oneline -5`
- `gh` auth: !`gh auth status 2>&1 | head -5`

Work through the steps below **in order**. Step 1 (security scan) gates everything
that follows: nothing is pushed until it passes. Report what you did at the end.

## 0. Resolve the target repo

- If `$ARGUMENTS` names a repo (`https://github.com/owner/name(.git)` or `owner/name`), use it.
- Otherwise fall back to the existing `origin` remote shown above.
- If neither exists, **stop and ask the user** for the repo — do not invent one and do
  not create a repo on their account unasked.
- If the repo does not exist on GitHub yet, ask before creating it, then
  `gh repo create <owner/name> --public --source=. --remote=origin` (use `--private`
  if the user asked for private).
- If `origin` points somewhere other than the requested repo, ask before repointing it.
  Never force-push, and never rewrite published history.

## 1. Security scan — do this BEFORE anything is pushed

This code is about to be public and permanently indexable, so scan the **entire working
tree that will be pushed**, not just the diff.

Run the `/security-review` skill if it is available, and in addition check by hand for:

- **Secrets and credentials**: API keys, tokens, passwords, private keys, `.env` files,
  connection strings, cloud credentials. Grep for high-signal patterns, e.g.
  `grep -rniE '(api[_-]?key|secret|passwd|password|token|bearer|BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,})' -- . ':!.git'`
  and triage every hit. Placeholders are fine; real values are not.
- **Personal data**: real email addresses, phone numbers, names of real people,
  internal hostnames, internal IPs, ticket/JIRA links, customer data in seed/demo data.
- **Git history**: a secret removed from the working tree can still live in an earlier
  commit. Check `git log -p | grep -niE '<pattern>'` for anything you flagged, and if
  history contains a real secret, **stop**: tell the user it must be rotated and the
  history scrubbed before publishing.
- **Third-party / outbound endpoints**: list every external URL the code calls
  (`grep -rn "https\?://" -- . ':!.git'`) and confirm each one is intended. Flag anything
  that exfiltrates user input to a service the user did not choose.
- **Web app hygiene** (this repo ships a browser app): unescaped interpolation into
  HTML (XSS), `innerHTML` on user-supplied values, `eval`/`new Function`, `document.write`.
  Respect the project's own rules in `CLAUDE.md` (e.g. every user value must pass
  through `escapeHtml()`).
- **License / branding**: no real trademarks, logos, or imitation of a real system.
- **Files that shouldn't ship**: local settings, credentials, scratch files, large
  binaries. Add a `.gitignore` entry rather than deleting the user's local files, and
  make sure `.claude/settings.local.json` is ignored.

Then:

- Fix anything you can fix safely yourself (escaping, redaction, `.gitignore`).
- Anything you cannot fix safely — a live secret, real personal data, a suspicious
  endpoint — **stop and report it to the user before pushing**. Do not publish and
  apologise afterwards; once it is on the internet it may already be cached or indexed.
- If the scan is clean, say so explicitly with a one-line summary of what you checked.

## 2. README

Create or update `README.md` so it is accurate for *this* repo — read the code first,
never describe features that don't exist. Written for someone who lands on the repo
cold. Include:

- Project name and a one-or-two-sentence description of what it actually does.
- A link to the live GitHub Pages URL (add it once the URL is known in step 4).
- **Running it locally** — follow whatever the project's own docs say (this project has
  no build step; you just open `index.html`).
- Key features, briefly.
- Any notable constraints or intentional behaviour a visitor would otherwise file as a
  bug (for this project: state is in-memory, so a refresh resets the board — that is
  intended and should be stated).
- Tech stack / architecture in a few lines.
- A note on what it is (an internal demo / training artefact, not a product) and, if
  the project uses fictional branding, that it is not affiliated with any real company.
- License, if the user has one. Ask before adding a license file; don't pick one for them.

Keep it honest and skimmable. No badge spam, no invented screenshots.

## 3. GitHub About section

Set the repo's description, homepage, and topics via `gh`:

```
gh repo edit <owner/name> \
  --description "<one clear sentence, <=120 chars>" \
  --homepage "<pages url>" \
  --add-topic <topic> --add-topic <topic>
```

Pick 3–6 accurate, lowercase topics from what the code actually is (e.g.
`kanban`, `vanilla-js`, `single-file`, `static-site`, `project-management`).
Also enable the Pages homepage link once step 4 gives you the URL.

## 4. GitHub Pages via Actions

- If `.github/workflows/` already has a Pages workflow, read it and reuse it rather than
  adding a second one.
- Otherwise create `.github/workflows/deploy.yml` that deploys the static site on push
  to the default branch, using `actions/configure-pages@v5` with `enablement: true`
  (so Pages is switched on by the workflow, no manual Settings visit),
  `actions/upload-pages-artifact@v3`, and `actions/deploy-pages@v4`, with
  `permissions: contents: read, pages: write, id-token: write` and a `pages`
  concurrency group that does not cancel in progress.
- Add an empty `.nojekyll` at the repo root so Jekyll doesn't eat files starting with `_`.
- If the site is not at the repo root, point `upload-pages-artifact` at the right path.

## 5. Commit and push

- Only after step 1 passes.
- If on the default branch and the change is more than trivial, consider a branch + PR;
  otherwise commit directly on the default branch is fine for this kind of repo.
- Group the work into meaningful commits with clear messages (imperative mood, why not
  just what). Do not commit unrelated local files.
- Push to `origin`.
- Then watch the deployment: `gh run watch` (or `gh run list --limit 3`). If it fails,
  read the log with `gh run view --log-failed`, fix the cause, and push again.
- Once deployed, get the URL with `gh api repos/<owner/name>/pages --jq .html_url`,
  put it in the README (step 2) and the About homepage (step 3), and push that update.

## 6. Report back

Finish with a short summary: what the security scan covered and found, what changed in
the README and About section, the live Pages URL, and anything you deliberately left
undone or that needs the user's decision.
