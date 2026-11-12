/**
 * Resolve a logical animation state ('idle', 'walk', 'celebrate', 'encourage')
 * to an actual glTF clip name.
 *
 * The exported mascot GLBs do not use bare names — they carry the rig name as a
 * suffix, e.g. `idle_youth_Mascot_Rig`, `celebrate_shs_Mascot_Rig`, while the
 * walk clip is the bare `walk`. The old code did `actions[state]`, which only
 * ever matched `walk`; every other state silently played nothing (T-pose).
 *
 * Matching order: exact (case-insensitive) → starts-with → contains. This is
 * tolerant of both the current suffix convention and any future prefix style
 * (`Armature|idle`) without hardcoding rig names.
 */
export function resolveClipName(names, wanted) {
  if (!wanted || !Array.isArray(names) || names.length === 0) return null
  const needle = String(wanted).toLowerCase()
  const lower = names.map((n) => String(n).toLowerCase())
  let i = lower.indexOf(needle)
  if (i >= 0) return names[i]
  i = lower.findIndex((n) => n.startsWith(needle))
  if (i >= 0) return names[i]
  i = lower.findIndex((n) => n.includes(needle))
  return i >= 0 ? names[i] : null
}
