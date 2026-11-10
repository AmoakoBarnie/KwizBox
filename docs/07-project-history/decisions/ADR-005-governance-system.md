# ADR-005: Adopt the professional governance/documentation system

- **Date:** 2026-11-10
- **Status:** Accepted

## 1. Context
The project's knowledge lived in scattered, partially stale files
(`README.md` claimed 3,230 questions vs 7,710 actual; run paths pointed at
directories from two moves ago). The owner's master prompt required a
professional system: documentation, memory, decision records, quality
control, traceability, and agent operating rules.

## 2. Requirements
Continuity across AI sessions and human handoffs; decisions recorded with
trade-offs; requirements traceable to tests; no duplication; teach, don't
just list.

## 3. Options considered
1. Keep the organic system (brain.md + CLAUDE.md + README), just update it.
2. Full template dump of the master prompt's directory tree, empty files included.
3. **Adapted professional system**: master prompt structure fitted to the
   existing repo, organic files integrated (chosen).

## 4–5. Advantages / disadvantages
1: least work; but no requirements/ADR/traceability discipline; staleness
   already demonstrated.
2: tick-box compliance; empty files violate the master prompt's own "no empty
   files" rule; noise.
3: real content everywhere, organic memory preserved, gaps closed.
   Disadvantage: some intentional deviation from the letter of the template
   (documented below).

## 6. Security implications
Positive: documented secret-handling rules, child-data policy, incident
procedure. Risk: docs may drift from code — countered by AGENTS.md
verification rules and the TRACEABILITY discipline.

## 7. Performance implications
None (documentation). Slight per-task overhead for agents (required reads) —
deliberate: it buys correctness.

## 8. Cost implications
~A session of setup; ongoing minutes per feature for doc upkeep.

## 9. Decision
Adopt the system: root operating files (AGENTS/STATUS/HANDOFF/CHANGELOG/
CONTRIBUTING) + `docs/01`–`07` tree + ADRs + traceability, with these
adaptations of the master-prompt template:
- `PROJECT_DISCOVERY.md` lives in `docs/01` (not duplicated at root).
- Roadmap split: milestone plan (`docs/01/ROADMAP.md`) vs the owner's
  day-to-day board (root `roadmap.md`) — both canonical at their own altitude.
- No empty `src/`, `tests/`, `assets/` scaffolding at root — the repo has
  real `backend/`, `frontend/`, `scripts/`, `frontend/tests/`.
- Root `.env.example` replaced by per-app templates (`backend/.env.example`
  existed; `frontend/.env.example` added).

## 10. Justification
The master prompt's own escape hatch ("adapt the structure… do not create
duplicate documentation or empty files") exists precisely for cases like this.
Integration beats replacement: the owner's organic memory (brain.md) is good
and stays canonical for technical lore.

## 11. Trade-offs accepted
Two roadmap artifacts (different granularity, cross-referenced); legacy root
docs coexist with docs/ tree (cross-referenced, not duplicated in content).

## 12. Consequences
Every future session must follow AGENTS.md (read-first protocol, workflow,
update duties); documentation updates are part of Definition of Done.

## 13. Reversibility
High — files can be reorganized cheaply; the discipline is the valuable part.

## 14. Review conditions
Revisit if: agents routinely skip the read-first protocol (tighten/shorten
docs), duplication emerges between root and docs/ (prune), or the owner finds
the upkeep cost outweighing continuity value at this scale.
