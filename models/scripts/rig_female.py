"""Rig the unrigged female mascots by transferring the male armature.

The female GLBs contain a single mesh and no armature, so they cannot animate.
This imports a male model (which has the full 14-bone rig), swaps its mesh for
the female mesh, re-weights the female mesh to the existing bones by proximity,
and exports. The result is an animated female mascot.

Usage:
  blender --background --python rig_female.py -- <male.glb> <female.glb> <out.glb>
"""
from __future__ import annotations

import bpy
import sys
from pathlib import Path
from mathutils import Vector

D = math_degrees = None


def parse_args():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return Path(args[0]), Path(args[1]), Path(args[2])


def load(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    arms = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
    return (meshes[0] if meshes else None), (arms[0] if arms else None)


def main():
    male_path, female_path, out_path = parse_args()

    # 1. Import the male model to get the armature and its animations.
    male_mesh, arm = load(male_path)
    if arm is None:
        raise SystemExit(f"no armature in {male_path}")
    print(f"male armature: {arm.name} with {len(bpy.data.actions)} actions")

    # 2. Import the female mesh alongside (separate file -> separate scene).
    bpy.ops.import_scene.gltf(filepath=str(female_path))
    female_meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and o != male_mesh]
    if not female_meshes:
        raise SystemExit(f"no female mesh in {female_path}")
    fem = female_meshes[0]
    print(f"female mesh: {fem.name} verts={len(fem.data.vertices)}")

    # 3. Match the female mesh to the male's scale/orientation so the shared
    #    armature's bone positions line up with her body.
    ms = male_mesh.dimensions
    fs = fem.dimensions
    print(f"  male dims  {tuple(round(v,3) for v in ms)}")
    print(f"  female dims {tuple(round(v,3) for v in fs)}")

    # Scale the female mesh so its height matches the male's, and drop her
    # feet to z=0 like the male.
    if fs.z > 0:
        s = ms.z / fs.z
        fem.scale = (fem.scale[0] * s, fem.scale[1] * s, fem.scale[2] * s)
    bpy.context.view_layer.objects.active = fem
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    minz = min((fem.matrix_world @ Vector(c)).z for c in fem.bound_box)
    fem.location.z += -minz
    bpy.context.view_layer.update()

    # 4. Bind the female mesh to the armature with proximity weights.
    for g in list(fem.vertex_groups):
        fem.vertex_groups.remove(g)

    deform_bones = [b for b in arm.data.bones if b.use_deform]
    groups = {b.name: fem.vertex_groups.new(name=b.name) for b in deform_bones}

    def seg_distance(p, a, b):
        ab = b - a
        t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-8)))
        return (p - (a + t * ab)).length

    for v in fem.data.vertices:
        p = fem.matrix_world @ v.co
        ranked = sorted((seg_distance(p, b.head_local, b.tail_local), b.name) for b in deform_bones)
        chosen = ranked[:2]
        inv = [1.0 / max(d, 0.03) for d, _ in chosen]
        total = sum(inv)
        for weight, (_, name) in zip(inv, chosen):
            groups[name].add([v.index], weight / total, "REPLACE")

    mod = next((m for m in fem.modifiers if m.type == "ARMATURE"), None)
    if mod is None:
        mod = fem.modifiers.new("Mascot_Armature", "ARMATURE")
    mod.object = arm

    # 5. Remove the male mesh so only the female is exported.
    bpy.data.objects.remove(male_mesh, do_unlink=True)

    # 6. Export with the male's animation actions.
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    fem.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=str(out_path), export_format="GLB", export_materials="EXPORT",
        export_animations=True, export_animation_mode="NLA_TRACKS",
        export_nla_strips=True, export_frame_range=True,
        export_force_sampling=True, export_skins=True,
        use_selection=True,
    )
    print(f"WROTE {out_path}")


if __name__ == "__main__":
    main()
