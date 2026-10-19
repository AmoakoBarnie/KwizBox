"""Bind an unskinned mesh to an armature with proximity weights, and export.

The male mascots were authored without skin data: their mesh has no JOINTS_0 /
WEIGHTS_0 attributes, so the glTF skin exists but the mesh cannot deform. This
imports the model, generates vertex weights by proximity to each bone segment,
binds the mesh to the armature, and exports.

Usage:
  blender --background --python skin_unskinned.py -- <in.glb> <out.glb>
"""
import bpy
import sys
from mathutils import Vector
from pathlib import Path

src = Path(sys.argv[sys.argv.index("--") + 1])
dst = Path(sys.argv[sys.argv.index("--") + 2])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src))

objs = list(bpy.context.scene.objects)
mesh = next((o for o in objs if o.type == "MESH" and len(o.data.vertices) > 1000), None)
arm = next((o for o in objs if o.type == "ARMATURE"), None)
if mesh is None or arm is None:
    raise SystemExit("need a large MESH and an ARMATURE")

print(f"mesh={mesh.name} ({len(mesh.data.vertices)} verts)  armature={arm.name}")

# Drop the stray icosphere (tiny leftover mesh that breaks the exporter).
for o in list(bpy.context.scene.objects):
    if o.type == "MESH" and o is not mesh:
        print(f"removing stray mesh: {o.name} ({len(o.data.vertices)} verts)")
        bpy.data.objects.remove(o, do_unlink=True)

deform_bones = [b for b in arm.data.bones if b.use_deform]
print(f"deform bones: {len(deform_bones)}: {[b.name for b in deform_bones]}")

# Build vertex groups named after the bones, weighted by segment proximity.
for g in list(mesh.vertex_groups):
    mesh.vertex_groups.remove(g)
groups = {}
for b in deform_bones:
    groups[b.name] = mesh.vertex_groups.new(name=b.name)

def seg_distance(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-8)))
    return (p - (a + t * ab)).length

bones = [(b.name, arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local) for b in deform_bones]

print(f"groups keys: {sorted(groups.keys())}")
print(f"bones names: {sorted(b.name for b in deform_bones)}")

for v in mesh.data.vertices:
    p = mesh.matrix_world @ v.co
    ranked = sorted((seg_distance(p, h, t), name) for name, h, t in bones)
    chosen = ranked[:2]
    inv = [1.0 / max(d, 0.03) for d, _ in chosen]
    total = sum(inv)
    for weight, (_, name) in zip(inv, chosen):
        g = groups.get(name)
        if g is None:
            raise SystemExit(f"no vertex group for bone {name!r}")
        g.add([v.index], weight / total, "REPLACE")

# Bind.
for mod in list(mesh.modifiers):
    mesh.modifiers.remove(mod)
mod = mesh.modifiers.new("Mascot_Armature", "ARMATURE")
mod.object = arm
mod.use_vertex_groups = True

bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
mesh.parent = arm
mesh.matrix_parent_inverse = arm.matrix_world.inverted()
bpy.context.view_layer.update()

print(f"vertex groups: {len(mesh.vertex_groups)}")
print(f"actions: {[a.name for a in bpy.data.actions]}")

bpy.ops.export_scene.gltf(
    filepath=str(dst),
    export_format="GLB",
    export_materials="EXPORT",
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_nla_strips=True,
    export_frame_range=True,
    export_force_sampling=True,
    export_skins=True,
)
print(f"WROTE {dst}")
