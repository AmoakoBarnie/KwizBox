"""Quantify the walk cycle: stride length, bob, opposition, knee lift."""
import bpy, sys, math

path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE")

walk = next((a for a in bpy.data.actions if a.name.split("_")[0] == "walk"), None)
arm.animation_data_clear(); arm.animation_data_create(); arm.animation_data.action = walk
start, end = int(walk.frame_range[0]), int(walk.frame_range[1])

bones = {
    "lfoot": "left_lower_leg", "rfoot": "right_lower_leg",
    "lhand": "left_lower_arm", "rhand": "right_lower_arm",
    "head": "head",
}
def pos(name):
    bpy.context.view_layer.update()
    return (arm.matrix_world @ arm.pose.bones[name].tail).copy()

rows = []
for f in range(start, end + 1):
    bpy.context.scene.frame_set(f)
    rows.append((f, {k: pos(v) for k, v in bones.items()}))

def spread(key, axis):
    v = [r[1][key][axis] for r in rows]
    return max(v) - min(v)

print(f"=== {path.split('/')[-1]} (frames {start}-{end}) ===")
print(f"  LEFT foot   dx={spread('lfoot',0):.3f}  dy={spread('lfoot',1):.3f}  dz={spread('lfoot',2):.3f}")
print(f"  RIGHT foot  dx={spread('rfoot',0):.3f}  dy={spread('rfoot',1):.3f}  dz={spread('rfoot',2):.3f}")
print(f"  LEFT hand   dx={spread('lhand',0):.3f}  dy={spread('lhand',1):.3f}")
print(f"  RIGHT hand  dx={spread('rhand',0):.3f}  dy={spread('rhand',1):.3f}")

# stride: how far the feet separate horizontally at the extremes
lf = [r[1]['lfoot'] for r in rows]; rf = [r[1]['rfoot'] for r in rows]
max_sep = max(abs(a.x - b.x) for a, b in zip(lf, rf))
print(f"  max foot separation (stride): {max_sep:.3f}")

# arm opposition: do the hands move in opposite directions?
lh = [r[1]['lhand'].x for r in rows]; rh = [r[1]['rhand'].x for r in rows]
corr = sum((a - sum(lh)/len(lh)) * (b - sum(rh)/len(rh)) for a, b in zip(lh, rh))
norm = math.sqrt(sum((a - sum(lh)/len(lh))**2 for a in lh) * sum((b - sum(rh)/len(rh))**2 for b in rh))
r_pearson = corr / norm if norm else 0
print(f"  arm opposition (pearson): {r_pearson:+.2f}   (negative = counter-swing, correct for walking)")

# vertical bob
hz = [r[1]['head'].z for r in rows]
print(f"  head bob dz={max(hz)-min(hz):.3f}")
