"""Author a realistic walk cycle for the KwizBox mascots.

The existing `walk` clip rotates the legs on Y, which does nothing: the leg
bones carry a -90 deg rest rotation, so Y-rotation is a no-op. This script
authors a proper gait using the axes that actually move the limbs, derived
empirically from the rig:

  left/right_upper_leg   -> rotation Z  (forward / backward swing)
  left/right_lower_leg   -> rotation Z  (knee flex, positive = heel up)
  left/right_upper_arm   -> rotation Z  (counter-swing against the legs)
  left/right_lower_arm   -> rotation Z  (elbow, slight trailing bend)
  spine / chest          -> rotation Y  (pelvis rotation, transfers weight)
  head                   -> rotation Y  (counter-rotation, keeps gaze level)
  root                   -> translation Z (vertical bob: 2 contacts per cycle)
  root                   -> rotation Y  (slight roll into the stance)

The cycle is a full stride: left contact -> passing -> right contact ->
passing, with the vertical bob peaking at the passing poses and dipping at
the contacts (double support), which is what makes a walk read as a walk
rather than a leg wave.

Usage:
  blender --background --python make_realistic_walk.py -- <in.glb> <out.glb> [fps]
"""
from __future__ import annotations

import bpy
import math
import sys
from pathlib import Path

D = math.radians


def parse_args():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    src = Path(args[0])
    dst = Path(args[1])
    fps = int(args[2]) if len(args) > 2 else 24
    return src, dst, fps


# One full gait cycle. Times are in frames; the loop closes on the last pose.
# A natural walk is ~1.2-1.5 s per cycle; at 24 fps that is ~20-30 frames.
CYCLE_FRAMES = 24
KEYS = [1, 7, 13, 19, 24]   # contact, passing, contact, passing, back to start


def pose(arm, frame, values):
    """Set pose bones at a frame and keyframe rotation_euler / location."""
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    for name, spec in values.items():
        pb = arm.pose.bones.get(name)
        if not pb:
            continue
        pb.rotation_mode = "XYZ"
        if spec.get("rot") is not None:
            pb.rotation_euler = spec["rot"]
            pb.keyframe_insert("rotation_euler", frame=frame, group=name)
        if spec.get("loc") is not None:
            pb.location = spec["loc"]
            pb.keyframe_insert("location", frame=frame, group=name)
    bpy.ops.object.mode_set(mode="OBJECT")


def neutral(arm, frame, names):
    """Reset the given bones to rest so the action starts from a clean pose."""
    vals = {}
    for n in names:
        vals[n] = {"rot": (0, 0, 0)}
    pose(arm, frame, vals)


def author_walk(arm):
    """Build the walk action on the armature."""
    names = [
        "root", "spine", "chest", "head",
        "left_upper_leg", "left_lower_leg",
        "right_upper_leg", "right_lower_leg",
        "left_upper_arm", "left_lower_arm",
        "right_upper_arm", "right_lower_arm",
    ]

    # Remove any pre-existing walk action so the export does not end up with
    # two animations named walk (the app resolves clips by exact name).
    for existing in [a for a in bpy.data.actions if a.name.split("_")[0] == "walk"]:
        bpy.data.actions.remove(existing)

    action = bpy.data.actions.new("walk")
    action.use_fake_user = True
    arm.animation_data_clear()
    arm.animation_data_create()
    arm.animation_data.action = action

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = CYCLE_FRAMES

    # Neutral baseline at both ends so the loop is seamless.
    neutral(arm, 1, names)
    neutral(arm, CYCLE_FRAMES, names)

    # ---- Gait parameters -------------------------------------------------
    # Angles in degrees; converted to radians when applied.
    LEG_SWING = 9        # hip flexion/extension amplitude (natural: ~30% of leg)
    KNEE_LIFT = 14       # peak knee flexion (heel toward buttock) on the swing leg
    KNEE_PASS = 8        # slight bend as the leg passes under the body
    KNEE_STANCE = 1      # near-straight on the stance leg
    ARM_SWING = 14       # shoulder counter-swing
    ELBOW_BEND = 9       # natural elbow flexion, increases on the back-swing
    PELVIS_ROT = 5       # yaw of the spine as weight transfers
    HEAD_COUNTER = 5     # counter-yaw so the gaze stays level
    BOB_UP = 0.030       # root rises at the passing poses
    BOB_DOWN = -0.016    # root dips at the contacts (double support)
    PELVIS_ROLL = 1.6    # slight lateral roll into the stance leg

    # Frame 1  -- LEFT contact: left leg forward, right leg back, arms opposed
    pose(arm, 1, {
        "root":               {"loc": (0, 0, BOB_DOWN)},
        "left_upper_leg":     {"rot": (0, 0, D(-LEG_SWING))},
        "left_lower_leg":     {"rot": (0, 0, D(KNEE_STANCE))},
        "right_upper_leg":    {"rot": (0, 0, D(LEG_SWING))},
        "right_lower_leg":    {"rot": (0, 0, D(KNEE_LIFT))},
        "left_upper_arm":     {"rot": (0, 0, D(ARM_SWING))},
        "left_lower_arm":     {"rot": (0, 0, D(ELBOW_BEND))},
        "right_upper_arm":    {"rot": (0, 0, D(-ARM_SWING))},
        "right_lower_arm":    {"rot": (0, 0, D(ELBOW_BEND * 0.6))},
        "spine":              {"rot": (0, D(PELVIS_ROT), 0)},
        "chest":              {"rot": (0, D(-PELVIS_ROT * 0.5), 0)},
        # head counter-rotates against the pelvis so the gaze stays level
        "head":               {"rot": (0, D(-PELVIS_ROT * 0.6), 0)},
    })

    # Frame 7  -- LEFT passing: left leg under the body, right leg lifting
    pose(arm, 7, {
        "root":               {"loc": (0, 0, BOB_UP)},
        "left_upper_leg":     {"rot": (0, 0, D(6))},
        "left_lower_leg":     {"rot": (0, 0, D(KNEE_PASS))},
        "right_upper_leg":    {"rot": (0, 0, D(10))},
        "right_lower_leg":    {"rot": (0, 0, D(KNEE_LIFT * 0.75))},
        "left_upper_arm":     {"rot": (0, 0, D(-ARM_SWING * 0.55))},
        "left_lower_arm":     {"rot": (0, 0, D(ELBOW_BEND * 0.8))},
        "right_upper_arm":    {"rot": (0, 0, D(ARM_SWING * 0.55))},
        "right_lower_arm":    {"rot": (0, 0, D(ELBOW_BEND))},
        "spine":              {"rot": (0, D(0), 0)},
        "chest":              {"rot": (0, D(0), 0)},
        "head":               {"rot": (0, D(0), 0)},
    })

    # Frame 13 -- RIGHT contact: mirror of frame 1
    pose(arm, 13, {
        "root":               {"loc": (0, 0, BOB_DOWN)},
        "left_upper_leg":     {"rot": (0, 0, D(LEG_SWING))},
        "left_lower_leg":     {"rot": (0, 0, D(KNEE_LIFT))},
        "right_upper_leg":    {"rot": (0, 0, D(-LEG_SWING))},
        "right_lower_leg":    {"rot": (0, 0, D(KNEE_STANCE))},
        "left_upper_arm":     {"rot": (0, 0, D(-ARM_SWING))},
        "left_lower_arm":     {"rot": (0, 0, D(ELBOW_BEND * 0.6))},
        "right_upper_arm":    {"rot": (0, 0, D(ARM_SWING))},
        "right_lower_arm":    {"rot": (0, 0, D(ELBOW_BEND))},
        "spine":              {"rot": (0, D(-PELVIS_ROT), 0)},
        "chest":              {"rot": (0, D(PELVIS_ROT * 0.5), 0)},
        "head":               {"rot": (0, D(PELVIS_ROT * 0.6), 0)},
    })

    # Frame 19 -- RIGHT passing: mirror of frame 7
    pose(arm, 19, {
        "root":               {"loc": (0, 0, BOB_UP)},
        "left_upper_leg":     {"rot": (0, 0, D(10))},
        "left_lower_leg":     {"rot": (0, 0, D(KNEE_LIFT * 0.75))},
        "right_upper_leg":    {"rot": (0, 0, D(6))},
        "right_lower_leg":    {"rot": (0, 0, D(KNEE_PASS))},
        "left_upper_arm":     {"rot": (0, 0, D(ARM_SWING * 0.55))},
        "left_lower_arm":     {"rot": (0, 0, D(ELBOW_BEND))},
        "right_upper_arm":    {"rot": (0, 0, D(-ARM_SWING * 0.55))},
        "right_lower_arm":    {"rot": (0, 0, D(ELBOW_BEND * 0.8))},
        "spine":              {"rot": (0, D(0), 0)},
        "chest":              {"rot": (0, D(0), 0)},
        "head":               {"rot": (0, D(0), 0)},
    })

    # Frame 24 -- identical to frame 1 so the loop closes.
    pose(arm, 24, {
        "root":               {"loc": (0, 0, BOB_DOWN)},
        "left_upper_leg":     {"rot": (0, 0, D(-LEG_SWING))},
        "left_lower_leg":     {"rot": (0, 0, D(KNEE_STANCE))},
        "right_upper_leg":    {"rot": (0, 0, D(LEG_SWING))},
        "right_lower_leg":    {"rot": (0, 0, D(KNEE_LIFT))},
        "left_upper_arm":     {"rot": (0, 0, D(ARM_SWING))},
        "left_lower_arm":     {"rot": (0, 0, D(ELBOW_BEND))},
        "right_upper_arm":    {"rot": (0, 0, D(-ARM_SWING))},
        "right_lower_arm":    {"rot": (0, 0, D(ELBOW_BEND * 0.6))},
        "spine":              {"rot": (0, D(PELVIS_ROT), 0)},
        "chest":              {"rot": (0, D(-PELVIS_ROT * 0.5), 0)},
        "head":               {"rot": (0, D(-PELVIS_ROT * 0.6), 0)},
    })

    # Smooth interpolation so the limbs ease rather than snap.
    for fc in action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.handle_left_type = "AUTO_CLAMPED"
            kp.handle_right_type = "AUTO_CLAMPED"

    return action


def main():
    src, dst, fps = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(src))

    arm = next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)
    if arm is None:
        raise SystemExit(f"No armature found in {src}")

    author_walk(arm)

    # Replace the existing walk strip (if the GLB already had one) and keep
    # every other action on its own strip, matching the original pipeline.
    arm.animation_data.action = None
    for action in sorted(bpy.data.actions, key=lambda a: a.name):
        track = arm.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, 1, action)
        strip.action_frame_start = action.frame_range[0]
        strip.action_frame_end = action.frame_range[1]
        strip.frame_start = 1
        strip.frame_end = action.frame_range[1] - action.frame_range[0] + 1
        strip.blend_type = "REPLACE"
        strip.extrapolation = "NOTHING"

    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=str(dst), export_format="GLB", export_materials="EXPORT",
        export_animations=True, export_animation_mode="NLA_TRACKS",
        export_nla_strips=True, export_frame_range=True,
        export_force_sampling=True, export_skins=True,
        use_selection=True,
    )
    print(f"WROTE {dst}")


if __name__ == "__main__":
    main()
