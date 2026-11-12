/**
 * Unit check for glTF clip-name resolution (no browser needed).
 * The exported mascots name clips `idle_youth_Mascot_Rig`, `celebrate_shs_…`,
 * etc. while only `walk` is bare — the old exact lookup silently played nothing.
 *
 * Run: node tests/verify-mascot-clips.mjs
 */
import assert from 'node:assert/strict'
import { resolveClipName } from '../src/mascotClips.js'

const youth = ['walk', 'idle_youth_Mascot_Rig', 'encourage_youth_Mascot_Rig',
  'celebrate_youth_Mascot_Rig', 'blink_youth_Mascot_Rig']

assert.equal(resolveClipName(youth, 'walk'), 'walk', 'exact bare walk')
assert.equal(resolveClipName(youth, 'idle'), 'idle_youth_Mascot_Rig', 'idle suffix match')
assert.equal(resolveClipName(youth, 'celebrate'), 'celebrate_youth_Mascot_Rig', 'celebrate suffix match')
assert.equal(resolveClipName(youth, 'encourage'), 'encourage_youth_Mascot_Rig', 'encourage suffix match')
assert.equal(resolveClipName(['Armature|idle', 'Armature|walk'], 'idle'), 'Armature|idle', 'prefix-style names')
assert.equal(resolveClipName(['IDLE_Rig'], 'idle'), 'IDLE_Rig', 'case-insensitive')
assert.equal(resolveClipName(youth, 'dance'), null, 'missing clip → null')
assert.equal(resolveClipName([], 'idle'), null, 'empty actions → null')
assert.equal(resolveClipName(undefined, 'idle'), null, 'undefined actions → null')

console.log('mascot clip resolution: 9/9 checks passed')
