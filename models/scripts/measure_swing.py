"""Measure the leg swing amplitude in world units, and compare to leg length."""
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

shin = arm.pose.bones["left_lower_leg"]
knee = arm.pose.bones["left_upper_leg"]

leg_len = (knee.tail - knee.head).length + (shin.tail - shin.head).length
print(f"leg length: {leg_len:.3f} units")

xs, zs = [], []
for f in range(start, end + 1):
    bpy.context.scene.frame_set(f)
    bpy.context.view_layer.update()
    p = arm.matrix_world @ shin.tail
    xs.append(p.x); zs.append(p.z)

print(f"foot x range: {min(xs):+.3f} .. {max(xs):+.3f}   (swing = {max(xs)-min(xs):.3f})")
print(f"foot z range: {min(zs):+.3f} .. {max(zs):+.3f}   (lift  = {max(zs)-min(zs):.3f})")
print(f"swing as % of leg length: {(max(xs)-min(xs))/leg_len*100:.0f}%")
print()
print("A natural walk swings the foot roughly 25-40% of leg length.")
print(f"Verdict: {'REALISTIC' if (max(xs)-min(xs))/leg_len > 0.20 else 'TOO SMALL'}")
