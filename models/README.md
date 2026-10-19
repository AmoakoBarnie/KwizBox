# KwizBox Mascot Models

Source library for the KwizBox 3D mascots. Four characters (class level × gender),
rigged and animated as real-time glTF (`.glb`) for React Three Fiber.

This folder is the **source library**. The browser does not load from here —
`frontend/public/assets/mascots-v2/animated/` is what ships, and it is kept
byte-identical to `models/models/` (verify with `manifest.json`).

## Contents

```
models/
├── models/                 # canonical masters, one per character
│   ├── shs_male.glb
│   ├── shs_female.glb
│   ├── youth_male.glb
│   └── youth_female.glb
├── clips/                  # per-clip animation GLBs (male characters only)
│   ├── shs_{idle,celebrate,encourage,walk,blink}.glb
│   └── youth_{idle,celebrate,encourage,walk,blink}.glb
├── previews/               # reference renders, 3 angles per character
│   └── <character>/{front,profile,threequarter}.png
├── scripts/                # the Blender jobs that produced these files
│   ├── skin_unskinned.py   #   binds an unskinned mesh to the armature
│   ├── rig_female.py       #   transfers a male rig + skin to a female model
│   ├── make_realistic_walk.py  # authors the walk cycle
│   ├── quantify_walk.py    #   measures stride / arm opposition
│   └── measure_swing.py    #   measures stride as % of leg length
├── manifest.json           # provenance: source path, md5, rig + clip inventory
└── README.md               # this file
```

Total ~28 MB (4 masters ≈ 5.4 MB, 10 clips ≈ 13 MB, 12 renders ≈ 9.8 MB).

## Characters

| Slug | Class level | Gender | Rigged | Joints | Clips |
|---|---|---|---|---|---|
| `shs_male` | SHS | male | ✅ | 14 | 5 |
| `shs_female` | SHS | female | ✅ | 14 | 5 |
| `youth_male` | JHS / Primary | male | ✅ | 14 | 5 |
| `youth_female` | JHS / Primary | female | ✅ | 14 | 5 |

> **The female characters are now rigged.** They originally shipped unrigged (no
> skin, no clips), so `Mascot3D.jsx` rendered them as a frozen pose — a missing
> clip is a silent no-op, not an error. `scripts/rig_female.py` transfers the
> male armature and skin weights onto each female mesh, then
> `scripts/make_realistic_walk.py` adds the walk cycle.

### The male characters were never actually skinned

The male models carried a glTF `skin` with 14 joints, but their mesh primitive
had **no `JOINTS_0` / `WEIGHTS_0` attributes** — the mesh was never bound to the
armature. The result: the mesh rendered in bind pose and the walk clip had no
visible effect, with no error anywhere. `scripts/skin_unskinned.py` generates
proximity weights, binds the mesh, and re-exports.

> **Do not "fix" this by just setting `skin: 0` on the mesh node.** Without
> `JOINTS_0`/`WEIGHTS_0` the file fails to load at all (`Cannot read properties
> of undefined`). The weights have to be generated.
>
> Note that Blender's exporter **crashes** on the original male file
> (`add_neutral_bones()` → `AttributeError: 'NoneType' object has no attribute
> 'joints'`) because it also contains a stray 42-vertex icosphere node with a
> dangling skin reference. `skin_unskinned.py` removes it.

## Animation contract

`Mascot3D.jsx` maps app state to animation clip names. **Names must match exactly**
or the mascot freezes (a missing clip is a silent no-op, not an error).

| App state | Clip name | Loop | Duration | Notes |
|---|---|---|---|---|
| `thinking` | `idle` | yes | 2.0 s (48f @24fps) | breathing + sway |
| `celebrate` | `celebrate` | no | 1.5 s (36f) | arms up, jump, land; returns to idle |
| `encourage` | `encourage` | yes | 2.0 s (48f) | gentle sway, one raised arm |
| `walking` | `walk` | yes | ~0.83 s | stride + counter-swing arm cycle |
| *(random)* | `blink` | no | 0.33 s (8f) | face channel close/open |

One-shot clips (`celebrate`, `blink`) should return to `idle` via the mixer's
`finished` event rather than being left playing.

> Clips other than `walk` keep the original names, **with an armature suffix**:
> `idle_youth_Mascot_Rig`, `celebrate_youth_Mascot_Rig`, and so on. `walk` is
> the one exception — it is exported bare, with no suffix. Look both up.

### The walk cycle

Authored procedurally (not sourced from stock) because no stock clip matched the
rig. Measured with `scripts/quantify_walk.py`:

| Metric | Target | Old clip | New clip |
|---|---|---|---|
| Foot travel (stride) | ≥ 0.30 | 0.004 | 0.464 |
| Swing as % of leg length | 25–40 % | ~0 % | 43 % |
| Arm opposition (Pearson) | −1.0 (counter-swing) | +1.0 (arms together) | −1.0 |
| Root bob range | ~2 % of height | 0.083 | 0.046 |

The two real bugs the old clip had: the feet never separated (stride 0.004 — the
character was standing still), and the arms swung **in unison** (+1.0) instead of
counter to the legs. Both are fixed.

The cycle has no travel component — the mascot walks in place, and
`HeroStage.jsx` moves it along the track with Framer Motion. Keep it that way:
a clip with root motion would double the horizontal speed.

### Rig

14-joint humanoid, custom armature (`<kind>_Mascot_Rig`):

```
root
└── spine
    └── chest
        ├── neck → head → face
        ├── left_upper_arm  → left_lower_arm
        └── right_upper_arm → right_lower_arm
├── left_upper_leg  → left_lower_leg
└── right_upper_leg → right_lower_leg
```

The `face` bone exists only to give `blink` a named animation channel.
Models are normalized to ~5 units tall with feet at Z=0, +X forward.
Weights are deterministic proximity-based (not Blender's heat solver) — see
`animate_mascots.py`.

> **The sculpted arms limit arm swing.** The characters' arms are baked into the
> mesh (one hand on the satchel strap, one in a pocket), so the shoulder channels
> have little visible effect. Do not raise `ARM_SWING` trying to compensate — it
> will look wrong without freeing the arms in the mesh first.

## Loading in the app

```js
// frontend/src/components/Mascot3D.jsx
const MODEL_PATHS = {
  youth: {
    male:   '/assets/mascots-v2/animated/youth_mascot.glb',
    female: '/assets/mascots-v2/animated/youth_female_mascot.glb',
  },
  shs: {
    male:   '/assets/mascots-v2/animated/shs_mascot.glb',
    female: '/assets/mascots-v2/animated/shs_female_mascot.glb',
  },
}
```

Those files are byte-identical to `models/models/<slug>.glb`. Keep them in sync:

```bash
cp models/models/shs_male.glb frontend/public/assets/mascots-v2/animated/shs_mascot.glb
```

### Geometry compression (meshopt)

The shipped GLBs are compressed with `EXT_meshopt_compression` (gltfpack `-c`),
which three's `GLTFLoader` **cannot read unless a decoder is attached**. The
mascot then silently fails to load and never appears — no error in the console.
`Mascot3D.jsx` attaches it:

```js
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
gltfLoader.setMeshoptDecoder(MeshoptDecoder)
```

Do not drop this when refactoring the loader. Note that Blender cannot import
meshopt files at all — author from the uncompressed models, compress only as the
last step.

> `gltfpack -cf` is **not** a workaround: it splits the fallback into a separate
> `.bin` file, which breaks the self-contained GLB and makes it fail to load.

### Camera framing (mobile)

The component fits the camera to the model's bounding box at runtime. For
reference, the settings that work on 390–412 px viewports are `fov: 28–35`,
distance derived from `(height/2) / tan(fov/2) * 1.18`. Camera closer than
`z < 2.0` or FOV wider than 45° cuts the character off.

## Regenerating

Authoring is a Blender headless job. The original pipeline script is
`animate_mascots.py` in the working folder (`~/Desktop/3d models/`):

```bash
blender --background --python animate_mascots.py -- <input_dir> <output_dir>
```

It imports `<kind>_front.glb`, builds the armature, authors the five clips,
and exports `<kind>_mascot.glb` plus `<kind>_mascot_animated.blend`.

### Rigging a character (female set)

```bash
# 1. transfer the male rig + skin onto the female mesh
blender --background --python models/scripts/rig_female.py -- \
  models/models/youth_male.glb models/models/youth_female.glb /tmp/youth_female.glb

# 2. author the walk cycle on the result
blender --background --python models/scripts/make_realistic_walk.py -- \
  /tmp/youth_female.glb /tmp/youth_female.glb

# 3. measure it
blender --background --python models/scripts/quantify_walk.py -- /tmp/youth_female.glb

# 4. compress (self-contained GLB) and install both copies
gltfpack -i /tmp/youth_female.glb -o /tmp/youth_female_c.glb -c -kn -km -ke -noq
cp /tmp/youth_female_c.glb models/models/youth_female.glb
cp /tmp/youth_female_c.glb frontend/public/assets/mascots-v2/animated/youth_female_mascot.glb
```

### Re-skinning a model that lost its weights

If a model's mesh has no `JOINTS_0`/`WEIGHTS_0` (it renders frozen and never
deforms), regenerate the weights:

```bash
blender --background --python models/scripts/skin_unskinned.py -- \
  models/models/youth_male.glb /tmp/youth_male.glb

gltfpack -i /tmp/youth_male.glb -o /tmp/youth_male_c.glb -c -kn -km -ke -noq
cp /tmp/youth_male_c.glb models/models/youth_male.glb
cp /tmp/youth_male_c.glb frontend/public/assets/mascots-v2/animated/youth_mascot.glb
```

Then confirm the skin data survived:

```bash
python3 - <<'PY'
import json, struct
from pathlib import Path
d = Path("models/models/youth_male.glb").read_bytes()
off, js = 12, None
while off < len(d):
    cl, ct = struct.unpack_from("<I4s", d, off)
    if ct == b"JSON": js = json.loads(d[off+8:off+8+cl])
    off += 8 + cl
attrs = sorted(js["meshes"][0]["primitives"][0]["attributes"])
skin = [n.get("skin") for n in js["nodes"] if n.get("mesh") is not None]
assert "JOINTS_0" in attrs and "WEIGHTS_0" in attrs, f"mesh is not skinned: {attrs}"
assert skin == [0], f"mesh not bound to skin: {skin}"
print("skinned OK:", attrs)
PY
```

> `-c` keeps the mesh in a **single** self-contained GLB. Do not use `-cc`
> (Draco) — the app has no `DRACOLoader` configured, so the mesh would not decode.

### Excluded from this library

Deliberately **not** committed, to keep the repo small:

| Asset | Size | Why excluded |
|---|---|---|
| `.blend` sources + `.blend1` autosaves | 342 MB | editable source; 3 "angle" files per character are byte-identical copies |
| `youth_front.glb` (raw export) | 69 MB | rigged twin is 1.38 MB |
| `<kind>_mascot.glb` (raw re-export) | 1.9–13.9 MB | superseded by compressed export |
| uncompressed `clips/<clip>.glb` | 13 MB each | `_compressed.glb` twin is 1.3 MB |

The full working set stays in `~/Desktop/3d models/` (602 MB) outside the repo.

## Verifying

`manifest.json` records the repo-relative path and md5 of every asset:

```bash
python3 - <<'PY'
import hashlib, json
from pathlib import Path
root = Path(".")                      # run from the repo root
man = json.loads((root / "models/manifest.json").read_text())
bad = [a["dst"] for a in man["assets"]
       if hashlib.md5((root / a["dst"]).read_bytes()).hexdigest() != a["md5"]]
print(f"{len(man['assets'])} assets checked:", "OK" if not bad else f"FAILED {bad}")
PY
```

To confirm `models/` still mirrors what the app ships:

```bash
for pair in shs_male:shs_mascot.glb shs_female:shs_female_mascot.glb \
            youth_male:youth_mascot.glb youth_female:youth_female_mascot.glb; do
  slug="${pair%%:*}"; shipped="${pair##*:}"
  cmp "models/models/$slug.glb" \
      "frontend/public/assets/mascots-v2/animated/$shipped" && echo "OK $slug"
done
```

To confirm the walk actually **plays in the browser** (pixel content changes
frame to frame — counting lit pixels is not enough, the silhouette area is roughly
constant while limbs move):

```bash
cd frontend && node tests/verify-walk-plays.mjs http://127.0.0.1:5174
```

> Measure **every** canvas, not just the first. The hero stage renders two
> `mascot-track` canvases and a static first one can hide an animating second.
