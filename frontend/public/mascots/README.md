# KwizBox 3D mascot placeholders

Drop the user's GLB files in this folder with these exact names:

- `kwizbox-junior.glb` — used for B4–B9
- `kwizbox-senior.glb` — used for S1–S3

The renderer looks for optional animation clips named `thinking`, `celebrate`, `encourage`, and `walking`. It also accepts `default` or `idle` as a fallback clip. If no matching animation exists, it holds the model's first pose and still applies the state motion from React Three Fiber.

Recommended export settings for mobile:

- GLB with embedded textures
- Low-poly mesh, ideally under 15,000 faces per mascot
- Centered origin at the feet
- Neutral forward-facing pose
- 512px or smaller textures where possible
- Avoid external texture references

Until the two files are added, the existing SVG mascots remain visible automatically.
