# ADR-002: Working repository on the NTFS FILES drive

- **Date:** 2026-11-10
- **Status:** Accepted

## 1. Context
The new project home had to be chosen. The owner created
`/media/stephen/FILES/My Projects/KwizBox` (NTFS internal data drive, 432 GB,
173 GB free, FUSE-mounted). The orchestrator recommended the NVMe home
partition (37 GB free, ext4) for the working repo, with FILES as the backup
target — primarily for performance with many-small-file operations.

## 2. Requirements
Owner preference for the FILES drive location; capacity headroom; single
visible project home; acceptable developer experience.

## 3. Options considered
1. **NVMe working repo + FILES backups** (orchestrator recommendation).
2. **Everything on the FILES drive** at the owner-chosen path (chosen by owner).

## 4–5. Advantages / disadvantages
Option 2 advantages: matches the owner's mental model ("the project lives
there"); 173 GB headroom; one location to think about; survives OS reinstalls
better than the home partition in the owner's setup.
Option 2 disadvantages: NTFS via FUSE is slower for `npm ci`/venv creation/git
object walks; Unix permission bits and exec-bit semantics differ (mitigated
with `core.fileMode=false`); symlink support is weaker (tree verified
symlink-free); some tools misbehave on FUSE mounts.

## 6. Security implications
Minor: file permission enforcement is weaker on NTFS; compensate by keeping
secrets out of shared directories and relying on Git/CI secret scanning
(gitleaks) — unchanged from before.

## 7. Performance implications
Slower dependency installs and some git operations; app runtime and CI
(GitHub-hosted) unaffected. `core.untrackedCache=true` set to speed `git status`.

## 8. Cost implications
Time cost per fresh install (seconds–minutes); no monetary cost. Capacity
benefit large.

## 9. Decision
Owner's choice stands: the working repository lives at
`/media/stephen/FILES/My Projects/KwizBox`, with the mitigations:
`core.fileMode=false`, `core.untrackedCache=true`, venv/node_modules
regenerated (never copied), symlink-free tree verified.

## 10. Justification
The owner's location preference is legitimate (capacity, organization,
reinstall-resilience); the performance penalty is tolerable for this project's
size; mitigations address the correctness risks.

## 11. Trade-offs accepted
Slower installs; weaker Unix permission semantics; occasional tool quirks on
FUSE mounts.

## 12. Consequences
Documentation must warn contributors about regenerating environments;
backups (git bundles) should target a different physical location than the
repo itself (e.g. a separate FILES subfolder, and GitHub as off-machine copy).

## 13. Reversibility
High — `git clone` to any other location + copy gitignored essentials
(trivia.db, .env) reproduces the repo elsewhere in minutes (procedure in
BACKUP_AND_RECOVERY.md).

## 14. Review conditions
Revisit if: dependency installs become a daily pain (>5–10 min routinely),
git operations corrupt or misbehave on NTFS, or a contributor workflow
requires true Unix permissions. Moving later is cheap and documented.
