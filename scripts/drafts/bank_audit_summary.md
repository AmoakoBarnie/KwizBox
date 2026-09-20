# Ghana STEM Trivia — live bank audit

**When:** 2026-08-18 08:16 UTC (Reykjavik / UTC+0)  
**Source:** live `backend/trivia.db` (read-only). Seed `scripts/questions.json` has **470** items; live DB has **543** (scribe batch ids 473–545 plus earlier bank; ids 345 and 361 are gaps).  
**NaCCA:** Official NaCCA/CCP PDFs were **not** checked. Level calls are common-knowledge B4–B9 vs SHS. **Do not treat this as NaCCA-perfect.**

## Counts

| | |
|---|---|
| Total | **543** (all currently `is_active`) |
| Class | B4 91 · B5 92 · B6 93 · B7 89 · B8 89 · B9 89 |
| Subject | Mathematics 219 · Science 210 · Computing 114 |
| Difficulty | Easy 171 · Medium 281 · Hard 91 |
| Type | mcq 511 · true_false 22 · image_mcq 10 |
| Empty explanations | 0 |
| Inactive | 0 |
| Missing options | 22 — **all** true_false with empty C/D (app expects 2 options; not a defect) |
| `answer_index` out of range | 0 |
| image_mcq files | 10/10 present under `backend/static/questions/` and labels match keys |

## ERRORS — wrong keys / false science (5)

These are live. Learners can be marked wrong for the right answer.

| id | class / subject | keyed | actual | action |
|---|---|---|---|---|
| **449** | B5 Math Easy | C **73** | **63** (100−37) | `answer_index` → 1; expl already correct |
| **234** | B5 Math Easy | C **4.5** | **4** (2.5+1.5) | `answer_index` → 1; expl already correct |
| **242** | B5 Math Medium | C **GHS 75** | **GHS 65** (80−15) | `answer_index` → 1; expl already correct |
| **305** | B7 Math Medium | C **6** | **5** (5x−3=22) | `answer_index` → 1; rewrite garbled expl |
| **413** | B6 Science Hard | C **Wedge** | ramp = **inclined plane** (not in options) | rewrite options + key; deactivate until then |

## Out of level (15)

SHS/uni topics on the live B4–B9 bank (deactivate unless you deliberately want stretch trivia):

- **440** Calculus / derivative (B9 Math)
- **464** Matrices 2×3 (B8 Math)
- **468** i² complex numbers (B9 Math)
- **463** log₂(8) (B8 Math)
- **422** sine = opp/hyp (B9 Math)
- **470** Planck / quantum (B9 Science) — also ambiguous A vs B
- **471** E=mc² relativity (B9 Science)
- **472** ML = Machine Learning (B9 Computing)
- **469** standard deviation (B9 Math)
- **431** quartiles at **B6**

Relevel (not SHS-hard but mis-tagged): **292** B6→B9 wavelength; **417** B7→B9 wavelength; **433** B6→B8 HTML; **419** B8→B9 25π; **429** B5→B7 bone count.

B4 scan: no calculus/matrices/quantum. B4 is mostly on-level (place value, money, harmattan, input devices). Hard B4 items (rain gauge, 24×6 mangoes) are not JHS content.

## Duplicates

**Exact same stem** (deactivate the later copy): 169/369, 170/370, 179/379, 180/380.

A large **201–400 paraphrase wave** restates many 1–200 items (kidney, 3-4-5 triangle, circle r=7, 4th-generation computers ×3, green economy, WWW, bearings, means/modes, etc.). See JSON `duplicates[]`. Recommended deactivate list prefers keeping the earlier, better-written id.

## Other quality (selected)

- **200** explanation leaks the entire Q1–Q200 answer key. Rewrite immediately even if the WWW fact is fine.
- **281** two correct options (1/2 and 6/12 or 1/2).
- **34** 1/4+1/4: 1/2 and 2/8 both right.
- **170/370** 2(2x+4) is a valid factorization beside 4(x+2).
- **447, 451** “True or False?” stems stored as 4-option mcq (Sometimes/Never). Convert to `true_false`.
- image_mcq: files exist; crowbar F=fulcrum, lungs=B, grass=producer, mouse=D, open switch, leaf, CPU=A, lever, keyboard=B — keys match diagrams.
- Computing safety items (stranger chat, https, e-waste battery, plagiarism) are **sound**. No unsafe advice found.
- Ghanaian context is desired and mostly good (harmattan, kenkey, galamsey, Akosombo, mobile money, cassava, grasscutter).

## 10 worst (fix first)

1. 449 — 100−37 keyed 73  
2. 234 — 2.5+1.5 keyed 4.5  
3. 242 — 80−15 keyed 75  
4. 305 — 5x−3=22 keyed 6  
5. 413 — ramp = wedge (false; no correct option)  
6. 200 — answer-key dump in explanation  
7. 440 — calculus on B9  
8. 470 — quantum/Planck  
9. 468 — complex numbers  
10. 281 — two-correct MCQ  

## What was and wasn’t done

Checked programmatically: all rows for structure, duplicates, banned keywords, empty fields, T/F options, image_url.  
Human-quality review: all 91 Hard; all 22 T/F; all 10 image_mcq + SVG labels; all B4; math recomputed where parseable; science Hard + keyword hits + compact remaining list.  
**Not done:** line-by-line NaCCA indicator mapping; not every Medium science sentence independently sourced. Uncertain science was left unflagged or marked keep rather than invented.

Full machine-readable report: `bank_audit_report.json`. Flat flags: `bank_audit_flags.csv`. Dump: `bank_export.json`.
