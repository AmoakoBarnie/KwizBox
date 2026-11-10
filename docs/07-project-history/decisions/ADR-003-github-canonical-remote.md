# ADR-003: GitHub `AmoakoBarnie/KwizBox` as the canonical remote

- **Date:** 2026-11-10
- **Status:** Accepted

## 1. Context
The project needs exactly one canonical off-machine remote. One exists:
`github.com/AmoakoBarnie/KwizBox` (public, 47 commits, PR #2 open, gh-pages
legacy branch). The owner confirmed it is the intended repo ("the same thing").

## 2. Requirements
Single source of remote truth; push access (SSH configured and verified);
secret scanning in CI; free hosting.

## 3. Options considered
1. Keep GitHub repo as canonical remote (chosen).
2. Create a new repo (e.g. to escape history with old secrets).
3. Multiple remotes (GitHub + a second provider) for redundancy.

## 4–5. Advantages / disadvantages
1: preserves history, stars, CI, Pages, Actions; zero migration cost.
   Disadvantage: history is public — any past secret leaks are permanent
   (mitigated: credentials were sanitized pre-relocation; gitleaks runs in CI).
2: cleaner naming possibly, but loses history/stars/CI and requires secret
   re-provisioning everywhere.
3: redundancy but doubled secret surface and push discipline.

## 6. Security implications
Public repo: keep secrets in GitHub Secrets / Fly secrets only; gitleaks gate
in CI (already present). If a secret ever lands in history: rotate immediately
(security doc's incident procedure) — history rewrite on a public repo does
not unpublish forks/caches.

## 7. Performance implications
None.

## 8. Cost implications
Free tier; Actions minutes within free allocation.

## 9. Decision
`git@github.com:AmoakoBarnie/KwizBox.git` remains `origin`; branch `main` is
canonical; feature branches merge via PR; `main` must stay deployable.

## 10. Justification
Existing linkage, verified SSH access, CI already wired, owner confirmation.

## 11. Trade-offs accepted
Public visibility of all future work; legacy branches (gh-pages, manus/*)
remain as historical artifacts until deliberately cleaned.

## 12. Consequences
Push the 5 outstanding commits (owner approval pending) to re-synchronize;
decide PR #2's fate; consider archiving stale branches after M4.

## 13. Reversibility
Medium — remotes can be re-pointed any time, but published history is
effectively irreversible.

## 14. Review conditions
Revisit if the owner wants private development (repo visibility toggle),
or an organizational account, or a second remote for disaster redundancy.
