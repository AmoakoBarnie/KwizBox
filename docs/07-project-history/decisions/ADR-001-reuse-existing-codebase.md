# ADR-001: Adopt and relocate the existing KwizBox codebase (no greenfield rebuild)

- **Date:** 2026-11-10
- **Status:** Accepted

## 1. Context
The owner initiated a professional initialization (master prompt) for KwizBox.
Discovery found a substantially built application (React PWA + FastAPI, 7,710
questions, Android build, security hardening underway) scattered across ~6
copies on one machine, with the authoritative copy 4 commits ahead of its
GitHub remote. The owner designated a new empty directory as the project home.

## 2. Requirements
Single authoritative home; no data loss; preserve Git history and GitHub
linkage; no unnecessary work before the release path (Supabase → deploy →
APK → Play Store).

## 3. Options considered
1. **Greenfield rebuild** in the new directory under the new governance
   system, porting features over time.
2. **In-place professionalization** of the existing repo
   (`~/Desktop/KwizBoz Andriod`).
3. **Relocate the existing repo** to the new home, then layer governance on
   top (chosen).

## 4. Advantages (per option)
1. Clean start, ideal structure from day one.
2. No copy step at all.
3. Keeps every line of working software + full history; governance still
   applied; old copy frozen as a safety net.

## 5. Disadvantages
1. Discards months of working code; enormous reimplementation cost; high risk
   of never catching up.
2. Continues the confusing "KwizBoz Andriod" location and its mixed contents;
   no clean separation from stale siblings.
3. Requires careful handling of gitignored data (trivia.db, .env) and the
   loose uncommitted changes.

## 6. Security implications
Option 3 required copying secrets (`.env`) — handled out-of-band of Git;
checksum verification; nothing sensitive committed. Option 1 would have
reduced secret sprawl but at unacceptable functional cost.

## 7. Performance implications
None material; repository operation cost is driven by filesystem (ADR-002).

## 8. Cost implications
Option 3: ~1 hour of careful migration. Options 1–2: days–weeks.

## 9. Decision
Relocate the full existing repository to
`/media/stephen/FILES/My Projects/KwizBox`, preserving history, branches, and
GitHub remote; capture loose changes as a dedicated commit; copy gitignored
essentials with checksum verification; leave the old directory untouched as a
frozen snapshot.

## 10. Justification
The code is proven (E2E-verified flows, CI, hardening) and the roadmap is
mid-flight on deployment. Professionalization is about process and structure,
not rewriting working software. Rebuilding would be the most expensive way to
arrive at the same place.

## 11. Trade-offs accepted
- The new home inherits legacy artifacts (`models.py.bak_before_pg`, legacy
  docs) — cleaned up incrementally under governance rules.
- Root docs mix of old (brain.md, project-log.md) and new systems —
  deliberately integrated rather than discarded.

## 12. Consequences
Governance docs describe an as-built system (not a blank plan); REQUIREMENTS
are as-built; TRACEABILITY records existing gaps; the frozen old copy must be
archived/disposed later (owner decision pending).

## 13. Reversibility
High — the old copy remains intact; GitHub retains the pushed history.

## 14. Review conditions
If the legacy structure blocks the release path (e.g. CI cannot run on the
FILES drive at acceptable speed), reconsider the working-copy location
(ADR-002) rather than the codebase adoption itself.
