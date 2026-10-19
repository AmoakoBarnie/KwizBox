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
├── manifest.json           # provenance: source path, md5, rig + clip inventory
└── README.md               # this file
```

Total ~28 MB (4 masters ≈ 5.4 MB, 10 clips ≈ 13 MB, 12 renders ≈ 9.8 MB).

## Characters

| Slug | Class level | Gender | Rigged | Joints | Clips |
|---|---|---|---|---|---|
| `shs_male` | SHS | male | ✅ | 14 | 5 |
| `shs_female` | SHS | female | ❌ | 0 | 0 |
| `youth_male` | JHS / Primary | male | ✅ | 14 | 5 |
| `youth_female` | JHS / Primary | female | ❌ | 0 | 0 |

> **Known gap:** both female characters are unrigged. They are wired into the same
> state machine as the males in `Mascot3D.jsx`, so selecting a female mascot
> renders a static pose — the clip lookups find nothing and silently no-op.
> See [Rigging the female characters](#rigging-the-female-characters).

## Animation contract

`Mascot3D.jsx` maps app state to animation clip names. **Names must match exactly**
or the mascot freezes (a missing clip is a silent no-op, not an error).

| App state | Clip name | Loop | Duration | Notes |
|---|---|---|---|---|
| `thinking` | `idle` | yes | 2.0 s (48f @24fps) | breathing + sway |
| `celebrate` | `celebrate` | no | 1.5 s (36f) | arms up, jump, land; returns to idle |
| `encourage` | `encourage` | yes | 2.0 s (48f) | gentle sway, one raised arm |
| `walking` | `walk` | yes | 0.83 s (20f) | arm/leg swing cycle |
| *(random)* | `blink` | no | 0.33 s (8f) | face channel close/open |

One-shot clips (`celebrate`, `blink`) should return to `idle` via the mixer's
`finished` event rather than being left playing.

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

### Camera framing (mobile)

The component fits the camera to the model's bounding box at runtime. For
reference, the settings that work on 390–412 px viewports are `fov: 28–35`,
distance derived from `(height/2) / tan(fov/2) * 1.18`. Camera closer than
`z < 2.0` or FOV wider than 45° cuts the character off.

## Regenerating

Authoring is a Blender headless job. The pipeline script is
`animate_mascots.py` in the original working folder (`~/Desktop/3d models/`):

```bash
blender --background --python animate_mascots.py -- <input_dir> <output_dir>
```

It imports `<kind>_front.glb`, builds the armature, authors the five clips,
and exports `<kind>_mascot.glb` plus `<kind>_mascot_animated.blend`.

**It currently loops only `("youth", "shs")` — the female characters are not
handled.** Rigging them means:

1. Adding female inputs (`shs_female_front.glb`, `youth_female_front.glb`) to
   the input loop, and
2. Running `gltfpack -i in.glb -o out.glb -cc -kn -km -ke` on the result
   (Draco compression; ~80–90 % size reduction, 12 MB → 1.3 MB).

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
