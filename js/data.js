// Spotter: exercise library, day templates, block scheme, seed data.
// Edit this file to change what the app can pick. Claude keeps it up to date.

// Equipment keys: dumbbell, barbell, kettlebell, cable, bench, pullup, abwheel. Bodyweight needs nothing.
// kind sets rest time and rep targets: big (compound), mid, iso (isolation), core.
// stress: joint load, 1 = some, 2 = high. Sore joints skip 2s, injured joints skip 1s and 2s.
// unit: 'lb' weighted, 'bw' bodyweight reps, 'sec' timed hold.
// reps / repWord: optional fixed rep target and its name (farmer's walk = 40 steps).
// start: first-time suggested weight (lb, per dumbbell / total barbell) or reps.
// fitbod: names Fitbod uses, for importing history.

window.EXERCISES = [
  // ---------- Back ----------
  { id: 'neutral_pullup', name: 'Neutral-grip pull-up', group: 'Back', eq: ['pullup'], kind: 'big', unit: 'bw', start: 5, stress: { shoulder: 1 }, fitbod: ['Neutral Grip Pull Up'] },
  { id: 'pullup', name: 'Pull-up', group: 'Back', eq: ['pullup'], kind: 'big', unit: 'bw', start: 5, stress: { elbow: 1, shoulder: 1 }, fitbod: ['Pull Up'] },
  { id: 'chinup', name: 'Chin-up', group: 'Back', eq: ['pullup'], kind: 'big', unit: 'bw', start: 5, stress: { elbow: 2, shoulder: 1 }, fitbod: ['Chin Up'] },
  { id: 'kneel_pulldown', name: 'Kneeling cable pulldown', group: 'Back', eq: ['cable'], kind: 'mid', unit: 'lb', start: 60, stress: {}, fitbod: ['Kneeling Lat Pulldown', 'Cable Lat Pulldown'] },
  { id: 'db_row', name: 'Dumbbell row', group: 'Back', eq: ['dumbbell', 'bench'], kind: 'big', unit: 'lb', start: 50, stress: { elbow: 1 }, fitbod: ['Dumbbell Row', 'Single Arm Dumbbell Row'] },
  { id: 'cs_db_row', name: 'Chest-supported dumbbell row', group: 'Back', eq: ['dumbbell', 'bench'], kind: 'big', unit: 'lb', start: 40, stress: {}, fitbod: ['Chest Supported Dumbbell Row', 'Incline Dumbbell Row'] },
  { id: 'bb_row', name: 'Barbell bent-over row', group: 'Back', eq: ['barbell'], kind: 'big', unit: 'lb', start: 95, stress: { lowback: 2, elbow: 1 }, fitbod: ['Barbell Bent Over Row', 'Bent Over Barbell Row'] },
  { id: 'db_bo_row', name: 'Dumbbell bent-over row', group: 'Back', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 35, stress: { lowback: 1 }, fitbod: ['Dumbbell Bent Over Row'] },
  { id: 'seated_cable_row', name: 'Seated cable row', group: 'Back', eq: ['cable'], kind: 'mid', unit: 'lb', start: 60, stress: {}, fitbod: ['Seated Cable Row', 'Cable Row'] },
  { id: 'sa_cable_row', name: 'Single-arm cable row', group: 'Back', eq: ['cable'], kind: 'mid', unit: 'lb', start: 30, stress: {}, fitbod: ['Single Arm Cable Row'] },
  { id: 'kb_gorilla_row', name: 'Kettlebell gorilla row', group: 'Back', eq: ['kettlebell'], kind: 'mid', unit: 'lb', start: 35, stress: { lowback: 1 }, fitbod: ['Kettlebell Gorilla Row'] },
  { id: 'straight_arm_pd', name: 'Cable straight-arm pulldown', group: 'Back', eq: ['cable'], kind: 'iso', unit: 'lb', start: 30, stress: {}, fitbod: ['Straight Arm Cable Pulldown', 'Cable Straight Arm Pulldown'] },
  { id: 'face_pull', name: 'Cable face pull', group: 'Shoulders', eq: ['cable'], kind: 'iso', unit: 'lb', start: 25, stress: {}, fitbod: ['Face Pull', 'Cable Face Pull'] },
  { id: 'rear_delt_fly', name: 'Dumbbell rear delt fly', group: 'Shoulders', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 12.5, stress: {}, fitbod: ['Dumbbell Rear Delt Fly', 'Bent Over Dumbbell Reverse Fly'] },
  { id: 'back_ext', name: 'Back extension', group: 'Core', eq: ['bench'], kind: 'core', unit: 'bw', start: 10, stress: { lowback: 1 }, fitbod: ['Incline Back Extension', 'Back Extension'] },
  // Loaded carry for grip, traps and core. reps = steps (both feet). Arms hang straight, so elbows and knees stay easy.
  { id: 'farmers_walk', name: "Farmer's walk", group: 'Back', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 50, reps: 40, repWord: 'steps', stress: {}, fitbod: ["Farmer's Walk", 'Farmers Walk', "Farmer's Carry", 'Farmers Carry', 'Dumbbell Farmers Walk'] },
  { id: 'kb_farmers_walk', name: "Kettlebell farmer's walk", group: 'Back', eq: ['kettlebell'], kind: 'mid', unit: 'lb', start: 44, reps: 40, repWord: 'steps', stress: {}, fitbod: ['Kettlebell Farmers Walk', "Kettlebell Farmer's Walk", 'Kettlebell Farmers Carry'] },

  // ---------- Biceps ----------
  { id: 'hammer_curl', name: 'Hammer curl', group: 'Biceps', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 25, stress: {}, fitbod: ['Hammer Curls', 'Hammer Curl', 'Dumbbell Hammer Curl'] },
  { id: 'rope_hammer_curl', name: 'Cable rope hammer curl', group: 'Biceps', eq: ['cable'], kind: 'iso', unit: 'lb', start: 30, stress: {}, fitbod: ['Cable Rope Hammer Curl'] },
  { id: 'db_curl', name: 'Dumbbell curl', group: 'Biceps', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 25, stress: { elbow: 1 }, fitbod: ['Dumbbell Bicep Curl', 'Dumbbell Curl'] },
  { id: 'cable_curl', name: 'Cable curl', group: 'Biceps', eq: ['cable'], kind: 'iso', unit: 'lb', start: 30, stress: { elbow: 1 }, fitbod: ['Cable Bicep Curl', 'Cable Curl'] },
  { id: 'incline_curl', name: 'Incline dumbbell curl', group: 'Biceps', eq: ['dumbbell', 'bench'], kind: 'iso', unit: 'lb', start: 20, stress: { elbow: 1, shoulder: 1 }, fitbod: ['Incline Dumbbell Curl'] },
  { id: 'conc_curl', name: 'Concentration curl', group: 'Biceps', eq: ['dumbbell', 'bench'], kind: 'iso', unit: 'lb', start: 20, stress: { elbow: 1 }, fitbod: ['Concentration Curl', 'Dumbbell Concentration Curl'] },
  { id: 'bb_curl', name: 'Barbell curl', group: 'Biceps', eq: ['barbell'], kind: 'iso', unit: 'lb', start: 55, stress: { elbow: 2, wrist: 1 }, fitbod: ['Barbell Curl'] },
  { id: 'reverse_curl', name: 'Reverse curl', group: 'Biceps', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 15, stress: { elbow: 2, wrist: 1 }, fitbod: ['Reverse Curl', 'Dumbbell Reverse Curl'] },

  // ---------- Chest ----------
  { id: 'db_bench', name: 'Dumbbell bench press', group: 'Chest', eq: ['dumbbell', 'bench'], kind: 'big', unit: 'lb', start: 45, stress: { shoulder: 1, elbow: 1 }, fitbod: ['Dumbbell Bench Press'] },
  { id: 'db_floor_press', name: 'Dumbbell floor press', group: 'Chest', eq: ['dumbbell'], kind: 'big', unit: 'lb', start: 45, stress: { elbow: 1 }, fitbod: ['Dumbbell Floor Press'] },
  { id: 'bb_floor_press', name: 'Barbell floor press', group: 'Chest', eq: ['barbell'], kind: 'big', unit: 'lb', start: 115, stress: { elbow: 1 }, fitbod: ['Barbell Floor Press'] },
  { id: 'bb_bench', name: 'Barbell bench press', group: 'Chest', eq: ['barbell', 'bench'], kind: 'big', unit: 'lb', start: 115, stress: { shoulder: 2, elbow: 1 }, fitbod: ['Bench Press', 'Barbell Bench Press'] },
  { id: 'db_incline', name: 'Dumbbell incline bench press', group: 'Chest', eq: ['dumbbell', 'bench'], kind: 'big', unit: 'lb', start: 40, stress: { shoulder: 1, elbow: 1 }, fitbod: ['Dumbbell Incline Bench Press', 'Incline Dumbbell Bench Press'] },
  { id: 'cable_press', name: 'Standing cable chest press', group: 'Chest', eq: ['cable'], kind: 'mid', unit: 'lb', start: 30, stress: {}, fitbod: ['Cable Chest Press', 'Standing Cable Chest Press'] },
  { id: 'cable_fly', name: 'Cable fly', group: 'Chest', eq: ['cable'], kind: 'iso', unit: 'lb', start: 20, stress: { shoulder: 1 }, fitbod: ['Cable Crossover Fly', 'Cable Fly', 'Cable Crossover'] },
  { id: 'low_high_fly', name: 'Low-to-high cable fly', group: 'Chest', eq: ['cable'], kind: 'iso', unit: 'lb', start: 15, stress: {}, fitbod: ['Low Cable Fly', 'Low to High Cable Fly'] },
  { id: 'db_fly', name: 'Dumbbell fly', group: 'Chest', eq: ['dumbbell', 'bench'], kind: 'iso', unit: 'lb', start: 20, stress: { shoulder: 2, elbow: 1 }, fitbod: ['Dumbbell Fly'] },
  { id: 'pushup', name: 'Push-up', group: 'Chest', eq: [], kind: 'mid', unit: 'bw', start: 15, stress: { wrist: 1 }, fitbod: ['Push Up'] },

  // ---------- Shoulders ----------
  { id: 'landmine_press', name: 'Landmine press', group: 'Shoulders', eq: ['barbell'], kind: 'mid', unit: 'lb', start: 25, stress: {}, fitbod: ['Landmine Press', 'Single Arm Landmine Press'] },
  { id: 'db_shoulder_press', name: 'Dumbbell shoulder press', group: 'Shoulders', eq: ['dumbbell', 'bench'], kind: 'big', unit: 'lb', start: 40, stress: { shoulder: 1, elbow: 1 }, fitbod: ['Dumbbell Shoulder Press', 'Seated Dumbbell Shoulder Press'] },
  { id: 'kb_press', name: 'Half-kneeling kettlebell press', group: 'Shoulders', eq: ['kettlebell'], kind: 'mid', unit: 'lb', start: 26, stress: { shoulder: 1 }, fitbod: ['Half Kneeling Kettlebell Press', 'Kettlebell Overhead Press'] },
  { id: 'bb_ohp', name: 'Barbell overhead press', group: 'Shoulders', eq: ['barbell'], kind: 'big', unit: 'lb', start: 75, stress: { shoulder: 2, lowback: 1, elbow: 1 }, fitbod: ['Overhead Press', 'Barbell Shoulder Press'] },
  { id: 'db_lateral', name: 'Dumbbell lateral raise', group: 'Shoulders', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 15, stress: {}, fitbod: ['Dumbbell Lateral Raise', 'Lateral Raise'] },
  { id: 'cable_lateral', name: 'Cable lateral raise', group: 'Shoulders', eq: ['cable'], kind: 'iso', unit: 'lb', start: 10, stress: {}, fitbod: ['Cable Lateral Raise'] },

  // ---------- Triceps ----------
  { id: 'rope_pushdown', name: 'Cable rope pushdown', group: 'Triceps', eq: ['cable'], kind: 'iso', unit: 'lb', start: 30, stress: { elbow: 1 }, fitbod: ['Cable Rope Tricep Pushdown', 'Rope Tricep Pushdown', 'Tricep Pushdown'] },
  { id: 'bar_pushdown', name: 'Cable bar pushdown', group: 'Triceps', eq: ['cable'], kind: 'iso', unit: 'lb', start: 35, stress: { elbow: 1 }, fitbod: ['Cable Tricep Pushdown', 'Cable Straight Bar Pushdown'] },
  { id: 'cable_kickback', name: 'Single-arm cable kickback', group: 'Triceps', eq: ['cable'], kind: 'iso', unit: 'lb', start: 10, stress: { elbow: 1 }, fitbod: ['Cable Tricep Kickback'] },
  { id: 'oh_cable_ext', name: 'Overhead cable extension', group: 'Triceps', eq: ['cable'], kind: 'iso', unit: 'lb', start: 25, stress: { elbow: 2 }, fitbod: ['Cable Overhead Tricep Extension', 'Overhead Cable Tricep Extension'] },
  { id: 'close_grip_bench', name: 'Close-grip bench press', group: 'Triceps', eq: ['barbell', 'bench'], kind: 'big', unit: 'lb', start: 95, stress: { elbow: 2, wrist: 1 }, fitbod: ['Close Grip Bench Press'] },
  { id: 'skullcrusher', name: 'Dumbbell skullcrusher', group: 'Triceps', eq: ['dumbbell', 'bench'], kind: 'iso', unit: 'lb', start: 15, stress: { elbow: 2 }, fitbod: ['Dumbbell Skullcrusher', 'Skullcrusher', 'Barbell Skullcrusher'] },
  { id: 'dip', name: 'Dip', group: 'Triceps', eq: ['pullup'], kind: 'big', unit: 'bw', start: 7, stress: { elbow: 2, shoulder: 2 }, fitbod: ['Dip', 'Tricep Dip', 'Bench Dip'] },

  // ---------- Legs: hinge / glutes / hamstrings ----------
  { id: 'db_rdl', name: 'Dumbbell Romanian deadlift', group: 'Hamstrings', eq: ['dumbbell'], kind: 'big', unit: 'lb', start: 50, stress: { lowback: 1 }, fitbod: ['Dumbbell Romanian Deadlift'] },
  { id: 'bb_rdl', name: 'Barbell Romanian deadlift', group: 'Hamstrings', eq: ['barbell'], kind: 'big', unit: 'lb', start: 135, stress: { lowback: 1 }, fitbod: ['Romanian Deadlift', 'Barbell Romanian Deadlift'] },
  { id: 'stiff_leg_dl', name: 'Stiff-legged deadlift', group: 'Hamstrings', eq: ['barbell'], kind: 'big', unit: 'lb', start: 135, stress: { lowback: 2 }, fitbod: ['Stiff-Legged Deadlift', 'Stiff Leg Deadlift'] },
  { id: 'kb_deadlift', name: 'Kettlebell deadlift', group: 'Hamstrings', eq: ['kettlebell'], kind: 'big', unit: 'lb', start: 53, stress: { lowback: 1 }, fitbod: ['Kettlebell Deadlift'] },
  { id: 'sl_rdl', name: 'Single-leg Romanian deadlift', group: 'Hamstrings', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 25, stress: {}, fitbod: ['Single Leg Romanian Deadlift', 'Dumbbell Single Leg Romanian Deadlift'] },
  { id: 'cable_leg_curl', name: 'Standing cable leg curl', group: 'Hamstrings', eq: ['cable'], kind: 'iso', unit: 'lb', start: 15, stress: {}, fitbod: ['Standing Cable Leg Curl', 'Cable Leg Curl'] },
  { id: 'hip_thrust', name: 'Barbell hip thrust', group: 'Glutes', eq: ['barbell', 'bench'], kind: 'big', unit: 'lb', start: 135, stress: {}, fitbod: ['Hip Thrust', 'Barbell Hip Thrust'] },
  { id: 'db_glute_bridge', name: 'Dumbbell glute bridge', group: 'Glutes', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 50, stress: {}, fitbod: ['Dumbbell Glute Bridge', 'Glute Bridge'] },
  { id: 'pull_through', name: 'Cable pull-through', group: 'Glutes', eq: ['cable'], kind: 'mid', unit: 'lb', start: 40, stress: {}, fitbod: ['Cable Pull Through'] },
  { id: 'kb_swing', name: 'Kettlebell swing', group: 'Glutes', eq: ['kettlebell'], kind: 'mid', unit: 'lb', start: 35, stress: { lowback: 1 }, fitbod: ['Kettlebell Swing'] },
  { id: 'cable_kickback_glute', name: 'Cable glute kickback', group: 'Glutes', eq: ['cable'], kind: 'iso', unit: 'lb', start: 15, stress: {}, fitbod: ['Cable Glute Kickback', 'Cable Kickback'] },
  { id: 'cable_abduction', name: 'Cable hip abduction', group: 'Glutes', eq: ['cable'], kind: 'iso', unit: 'lb', start: 10, stress: {}, fitbod: ['Cable Hip Abduction'] },

  // ---------- Legs: quads (knee-friendly first) ----------
  { id: 'box_goblet_squat', name: 'Goblet box squat', group: 'Quads', eq: ['kettlebell', 'bench'], kind: 'mid', unit: 'lb', start: 35, stress: { knee: 1 }, fitbod: ['Goblet Box Squat', 'Box Squat'] },
  { id: 'reverse_lunge', name: 'Dumbbell reverse lunge', group: 'Quads', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 25, stress: { knee: 1 }, fitbod: ['Dumbbell Reverse Lunge', 'Reverse Lunge'] },
  { id: 'step_up', name: 'Dumbbell step-up', group: 'Quads', eq: ['dumbbell', 'bench'], kind: 'mid', unit: 'lb', start: 20, stress: { knee: 1 }, fitbod: ['Dumbbell Step Up', 'Step Up'] },
  { id: 'kb_sumo_squat', name: 'Kettlebell sumo squat', group: 'Quads', eq: ['kettlebell'], kind: 'mid', unit: 'lb', start: 53, stress: { knee: 1 }, fitbod: ['Kettlebell Sumo Squat'] },
  { id: 'tke', name: 'Cable terminal knee extension', group: 'Quads', eq: ['cable'], kind: 'iso', unit: 'lb', start: 20, stress: {}, fitbod: ['Terminal Knee Extension'] },
  { id: 'goblet_squat', name: 'Goblet squat', group: 'Quads', eq: ['kettlebell'], kind: 'mid', unit: 'lb', start: 35, stress: { knee: 2 }, fitbod: ['Goblet Squat', 'Kettlebell Goblet Squat', 'Dumbbell Goblet Squat'] },
  { id: 'db_squat', name: 'Dumbbell squat', group: 'Quads', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 35, stress: { knee: 2 }, fitbod: ['Dumbbell Squat'] },
  { id: 'walking_lunge', name: 'Dumbbell walking lunge', group: 'Quads', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 25, stress: { knee: 2 }, fitbod: ['Dumbbell Walking Lunge', 'Walking Lunge'] },
  { id: 'split_squat', name: 'Bulgarian split squat', group: 'Quads', eq: ['dumbbell', 'bench'], kind: 'mid', unit: 'lb', start: 20, stress: { knee: 2 }, fitbod: ['Bulgarian Split Squat', 'Dumbbell Bulgarian Split Squat'] },
  { id: 'back_squat', name: 'Barbell back squat', group: 'Quads', eq: ['barbell'], kind: 'big', unit: 'lb', start: 135, stress: { knee: 2, lowback: 2 }, fitbod: ['Back Squat', 'Barbell Back Squat', 'Barbell Squat'] },

  // ---------- Calves ----------
  { id: 'db_calf_raise', name: 'Standing dumbbell calf raise', group: 'Calves', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 50, stress: {}, fitbod: ['Standing Dumbbell Calf Raise', 'Dumbbell Calf Raise'] },
  { id: 'sl_calf_raise', name: 'Single-leg calf raise', group: 'Calves', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 25, stress: {}, fitbod: ['Single Leg Calf Raise'] },

  // ---------- Core ----------
  { id: 'ab_wheel', name: 'Ab wheel rollout', group: 'Core', eq: ['abwheel'], kind: 'core', unit: 'bw', start: 10, stress: { lowback: 1, shoulder: 1 }, fitbod: ['Ab Wheel Rollout', 'Ab Roller'] },
  { id: 'cable_crunch', name: 'Kneeling cable crunch', group: 'Core', eq: ['cable'], kind: 'core', unit: 'lb', start: 50, stress: {}, fitbod: ['Cable Crunch', 'Kneeling Cable Crunch'] },
  { id: 'pallof', name: 'Pallof press', group: 'Core', eq: ['cable'], kind: 'core', unit: 'lb', start: 20, stress: {}, fitbod: ['Pallof Press'] },
  { id: 'woodchop', name: 'Cable woodchop', group: 'Core', eq: ['cable'], kind: 'core', unit: 'lb', start: 25, stress: { lowback: 1 }, fitbod: ['Cable Woodchop', 'Cable Wood Chop'] },
  { id: 'hanging_knee_raise', name: 'Hanging knee raise', group: 'Core', eq: ['pullup'], kind: 'core', unit: 'bw', start: 12, stress: { shoulder: 1 }, fitbod: ['Hanging Knee Raise'] },
  { id: 'plank', name: 'Plank', group: 'Core', eq: [], kind: 'core', unit: 'sec', start: 45, stress: {}, fitbod: ['Plank'] },
  { id: 'dead_bug', name: 'Dead bug', group: 'Core', eq: [], kind: 'core', unit: 'bw', start: 12, stress: {}, fitbod: ['Dead Bug'] },
  { id: 'russian_twist', name: 'Russian twist', group: 'Core', eq: ['dumbbell'], kind: 'core', unit: 'lb', start: 25, stress: { lowback: 1 }, fitbod: ['Russian Twist', 'Weighted Russian Twist'] },
  { id: 'bicycle_crunch', name: 'Bicycle crunch', group: 'Core', eq: [], kind: 'core', unit: 'bw', start: 18, stress: {}, fitbod: ['Bicycle Crunch'] },
  { id: 'crunch', name: 'Crunch', group: 'Core', eq: [], kind: 'core', unit: 'bw', start: 25, stress: {}, fitbod: ['Crunches', 'Crunch'] },
];

// Each day is a list of slots. The app fills slots in order until the hour is used.
// Candidates are in order of preference: joint-friendly first. A new 4-week block rotates the pick.
window.DAYS = {
  push: {
    name: 'Chest & triceps',
    slots: [
      { label: 'Main press', ex: ['db_bench', 'bb_floor_press', 'db_floor_press', 'bb_bench'] },
      { label: 'Incline', ex: ['db_incline', 'cable_press', 'pushup'] },
      { label: 'Shoulder press', ex: ['landmine_press', 'db_shoulder_press', 'kb_press', 'bb_ohp'] },
      { label: 'Chest fly', ex: ['low_high_fly', 'cable_fly', 'db_fly'] },
      { label: 'Side delts', ex: ['db_lateral', 'cable_lateral'] },
      { label: 'Triceps', ex: ['rope_pushdown', 'bar_pushdown', 'close_grip_bench', 'dip'] },
      { label: 'Triceps 2', ex: ['cable_kickback', 'oh_cable_ext', 'skullcrusher'] },
      { label: 'Core', core: true, ex: ['pallof', 'cable_crunch', 'dead_bug', 'russian_twist', 'plank'] },
    ],
  },
  pull: {
    name: 'Back & biceps',
    slots: [
      { label: 'Vertical pull', ex: ['neutral_pullup', 'kneel_pulldown', 'pullup', 'chinup'] },
      { label: 'Heavy row', ex: ['db_row', 'cs_db_row', 'bb_row'] },
      { label: 'Row 2', ex: ['seated_cable_row', 'sa_cable_row', 'kb_gorilla_row', 'db_bo_row'] },
      { label: 'Rear delts', ex: ['face_pull', 'rear_delt_fly'] },
      { label: 'Biceps', ex: ['hammer_curl', 'db_curl', 'cable_curl', 'incline_curl', 'bb_curl'] },
      { label: 'Biceps 2', ex: ['rope_hammer_curl', 'conc_curl', 'cable_curl'] },
      { label: 'Lats', ex: ['straight_arm_pd'] },
      { label: 'Carry', ex: ['farmers_walk', 'kb_farmers_walk'] },
      { label: 'Core', core: true, ex: ['hanging_knee_raise', 'ab_wheel', 'woodchop', 'back_ext', 'crunch'] },
    ],
  },
  legs: {
    name: 'Legs',
    slots: [
      { label: 'Hinge', ex: ['bb_rdl', 'db_rdl', 'kb_deadlift', 'stiff_leg_dl'] },
      { label: 'Glutes', ex: ['hip_thrust', 'db_glute_bridge', 'pull_through', 'kb_swing'] },
      { label: 'Quads', ex: ['box_goblet_squat', 'reverse_lunge', 'step_up', 'kb_sumo_squat', 'goblet_squat', 'db_squat', 'walking_lunge', 'split_squat', 'back_squat'] },
      { label: 'Single leg', ex: ['sl_rdl', 'cable_leg_curl'] },
      { label: 'Knee care', ex: ['tke', 'cable_abduction', 'cable_kickback_glute'] },
      { label: 'Calves', ex: ['db_calf_raise', 'sl_calf_raise'] },
      { label: 'Core', core: true, ex: ['ab_wheel', 'pallof', 'bicycle_crunch', 'plank', 'dead_bug'] },
    ],
  },
};

// Four-week block. reps by kind; rir = reps left in the tank; restAdd = extra rest seconds on big lifts.
window.WEEKS = [
  { name: 'Base', sets: 3, reps: { big: 10, mid: 10, iso: 12, core: 15 }, rir: 2, scale: 1.0, restAdd: 0 },
  { name: 'Build', sets: 4, reps: { big: 8, mid: 10, iso: 12, core: 15 }, rir: 2, scale: 1.0, restAdd: 0 },
  { name: 'Strength', sets: 4, reps: { big: 6, mid: 8, iso: 10, core: 15 }, rir: 1, scale: 1.0, restAdd: 30 },
  { name: 'Deload', sets: 2, reps: { big: 8, mid: 10, iso: 12, core: 12 }, rir: 4, scale: 0.85, restAdd: 0 },
];

window.REST = { big: 150, mid: 90, iso: 60, core: 45 };

window.JOINTS = [
  { id: 'elbow', name: 'Elbows' },
  { id: 'knee', name: 'Knees' },
  { id: 'shoulder', name: 'Shoulders' },
  { id: 'wrist', name: 'Wrists' },
  { id: 'lowback', name: 'Lower back' },
];

window.JOINT_TIPS = {
  elbow: 'Elbow pain from pressing and triceps work usually comes from loading the elbow while it is deeply bent (dips, skullcrushers, close-grip press). Tennis elbow on the outside is more often grip: rows, curls with palms down, heavy dumbbells. Cable work with a rope and neutral grips is usually easiest.',
  knee: 'Knee pain on leg day usually comes from deep knee bend under load and the knee drifting in. Hinges (RDLs, hip thrusts) load the legs with little knee bend. Box squats and reverse lunges let you control depth.',
  shoulder: 'Shoulder pain often comes from pressing with elbows flared wide or from the bottom of deep stretches (flys, dips). Neutral grips, landmine presses and cables are usually easier.',
  wrist: 'Wrist pain often comes from bent-back wrists under load (push-ups, straight-bar curls). Dumbbells, neutral grips or fists usually help.',
  lowback: 'Lower back pain usually comes from bent-over positions and heavy hinges. Chest-supported rows and cables take the back out of it.',
};

window.EQUIPMENT = [
  { id: 'dumbbell', name: 'Dumbbells' },
  { id: 'barbell', name: 'Barbell, rack and plates' },
  { id: 'kettlebell', name: 'Kettlebells' },
  { id: 'cable', name: 'Cable machine (rope, bar, handles, ankle strap)' },
  { id: 'bench', name: 'Bench' },
  { id: 'pullup', name: 'Pull-up bar' },
  { id: 'abwheel', name: 'Ab wheel' },
];

window.KETTLEBELLS = [10, 15, 18, 20, 25, 26, 30, 35, 40, 44, 45, 50, 53, 55, 60, 62, 70, 80];

// Your last week in Fitbod, from the screen recording. Weights are per dumbbell.
window.SEED_HISTORY = [
  { date: '2026-11-10T15:45:00-08:00', day: 'push', minutes: 60, entries: [
    { ex: 'db_shoulder_press', sets: [[40, 9], [40, 9], [40, 9]] },
    { ex: 'db_incline', sets: [[40, 10], [40, 10], [40, 10]] },
    { ex: 'skullcrusher', sets: [[15, 10], [15, 10], [15, 10]] },
    { ex: 'db_lateral', sets: [[15, 12], [15, 12], [15, 12]] },
    { ex: 'dip', sets: [[0, 7], [0, 7], [0, 7], [0, 7]] },
    { ex: 'db_fly', sets: [[25, 12], [25, 7], [20, 6], [20, 12]] },
    { ex: 'russian_twist', sets: [[35, 12], [35, 12], [35, 12]] },
  ] },
  { date: '2026-11-12T16:32:00-08:00', day: 'pull', minutes: 61, entries: [
    { ex: 'db_row', sets: [[35, 8], [60, 10], [60, 10], [60, 10]] },
    { ex: 'pullup', sets: [[0, 5], [0, 5], [0, 4], [0, 4]] },
    { ex: 'db_curl', sets: [[25, 8], [25, 8], [25, 8]] },
    { ex: 'db_bo_row', sets: [[35, 12], [35, 12], [35, 12]] },
    { ex: 'hammer_curl', sets: [[25, 12], [25, 12], [25, 12]] },
    { ex: 'back_ext', sets: [[0, 8], [0, 8], [0, 8], [0, 8], [0, 8]] },
    { ex: 'crunch', sets: [[0, 41], [0, 41], [0, 41]] },
  ] },
  { date: '2026-11-14T15:49:00-08:00', day: 'legs', minutes: 62, entries: [
    { ex: 'stiff_leg_dl', sets: [[95, 8], [160, 10], [160, 10], [160, 10]] },
    { ex: 'walking_lunge', sets: [[25, 12], [25, 12], [25, 12]] },
    { ex: 'sl_rdl', sets: [[25, 12], [25, 12], [25, 12]] },
    { ex: 'db_calf_raise', sets: [[50, 10], [50, 10], [50, 10]] },
    { ex: 'db_squat', sets: [[35, 10], [35, 10], [35, 10]] },
    { ex: 'kb_sumo_squat', sets: [[35, 8], [60, 10], [60, 10]] },
    { ex: 'bicycle_crunch', sets: [[0, 18], [0, 18]] },
  ] },
];

// Starting joint status and bans, from what you told Claude on Nov 16, 2026.
window.SEED_JOINTS = { elbow: 'sore', knee: 'sore', shoulder: 'ok', wrist: 'ok', lowback: 'ok' };
window.SEED_BANS = {
  dip: { reason: 'pain', joint: 'elbow', note: 'Likely cause of elbow pain (Nov 2026)' },
  skullcrusher: { reason: 'pain', joint: 'elbow', note: 'Likely cause of elbow pain (Nov 2026)' },
};
window.SEED_PAIN = [
  { at: '2026-11-15T12:00:00-08:00', joint: 'elbow', ex: 'dip', severity: 'hurts', note: 'Elbow pain after push day. Dips or skullcrushers, maybe tennis elbow.' },
  { at: '2026-11-15T12:00:00-08:00', joint: 'knee', ex: null, severity: 'hurts', note: 'Knees are weak. Squats bother them.' },
];

// ---------- Home and extra exercises (dumbbells + bodyweight) ----------
window.EXERCISES.push(
  { id: 'glute_bridge', name: 'Glute bridge', group: 'Glutes', eq: [], kind: 'mid', unit: 'bw', start: 15, stress: {}, fitbod: ['Glute Bridge'] },
  { id: 'sl_glute_bridge', name: 'Single-leg glute bridge', group: 'Glutes', eq: [], kind: 'mid', unit: 'bw', start: 10, stress: {}, fitbod: ['Single Leg Glute Bridge'] },
  { id: 'db_hip_thrust', name: 'Dumbbell hip thrust', group: 'Glutes', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 12, stress: {}, fitbod: ['Dumbbell Hip Thrust'] },
  { id: 'donkey_kick', name: 'Donkey kick', group: 'Glutes', eq: [], kind: 'iso', unit: 'bw', start: 15, stress: {}, fitbod: ['Donkey Kick', 'Glute Kickback'] },
  { id: 'fire_hydrant', name: 'Fire hydrant', group: 'Glutes', eq: [], kind: 'iso', unit: 'bw', start: 15, stress: {}, fitbod: ['Fire Hydrant'] },
  { id: 'clamshell', name: 'Clamshell', group: 'Glutes', eq: [], kind: 'iso', unit: 'bw', start: 20, stress: {}, fitbod: ['Clamshell'] },
  { id: 'bw_squat', name: 'Bodyweight squat', group: 'Quads', eq: [], kind: 'mid', unit: 'bw', start: 15, stress: { knee: 1 }, fitbod: ['Bodyweight Squat', 'Air Squat'] },
  { id: 'db_sumo_squat', name: 'Dumbbell sumo squat', group: 'Quads', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 12, stress: { knee: 1 }, fitbod: ['Dumbbell Sumo Squat', 'Plie Dumbbell Squat'] },
  { id: 'db_goblet_squat', name: 'Dumbbell goblet squat', group: 'Quads', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 12, stress: { knee: 2 }, fitbod: ['Dumbbell Goblet Squat'] },
  { id: 'curtsy_lunge', name: 'Curtsy lunge', group: 'Glutes', eq: [], kind: 'mid', unit: 'bw', start: 10, stress: { knee: 2 }, fitbod: ['Curtsy Lunge'] },
  { id: 'standing_db_press', name: 'Standing dumbbell press', group: 'Shoulders', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 12, stress: { shoulder: 1, elbow: 1 }, fitbod: ['Standing Dumbbell Press'] },
  { id: 'db_front_raise', name: 'Dumbbell front raise', group: 'Shoulders', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 5, stress: {}, fitbod: ['Dumbbell Front Raise'] },
  { id: 'db_kickback', name: 'Dumbbell triceps kickback', group: 'Triceps', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 5, stress: { elbow: 1 }, fitbod: ['Dumbbell Tricep Kickback', 'Tricep Dumbbell Kickback'] },
  { id: 'db_oh_ext', name: 'Overhead dumbbell extension', group: 'Triceps', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 12, stress: { elbow: 2 }, fitbod: ['Dumbbell Overhead Tricep Extension'] },
  { id: 'floor_fly', name: 'Floor dumbbell fly', group: 'Chest', eq: ['dumbbell'], kind: 'iso', unit: 'lb', start: 12, stress: { shoulder: 1 }, fitbod: ['Floor Fly'] },
  { id: 'knee_pushup', name: 'Knee push-up', group: 'Chest', eq: [], kind: 'mid', unit: 'bw', start: 10, stress: { wrist: 1 }, fitbod: ['Knee Push Up'] },
  { id: 'incline_pushup', name: 'Incline push-up', group: 'Chest', eq: [], kind: 'mid', unit: 'bw', start: 10, stress: { wrist: 1 }, fitbod: ['Incline Push Up'] },
  { id: 'pike_pushup', name: 'Pike push-up', group: 'Shoulders', eq: [], kind: 'mid', unit: 'bw', start: 8, stress: { shoulder: 1, wrist: 1 }, fitbod: ['Pike Push Up'] },
  { id: 'superman', name: 'Superman', group: 'Back', eq: [], kind: 'core', unit: 'bw', start: 12, stress: {}, fitbod: ['Superman'] },
  { id: 'mountain_climber', name: 'Mountain climber', group: 'Core', eq: [], kind: 'core', unit: 'sec', start: 30, stress: { wrist: 1 }, fitbod: ['Mountain Climber'] },
  { id: 'leg_raise', name: 'Lying leg raise', group: 'Core', eq: [], kind: 'core', unit: 'bw', start: 12, stress: { lowback: 1 }, fitbod: ['Lying Leg Raise', 'Leg Raise'] },
  { id: 'side_plank', name: 'Side plank', group: 'Core', eq: [], kind: 'core', unit: 'sec', start: 30, stress: { shoulder: 1 }, fitbod: ['Side Plank'] },
  { id: 'flutter_kick', name: 'Flutter kicks', group: 'Core', eq: [], kind: 'core', unit: 'sec', start: 30, stress: {}, fitbod: ['Flutter Kicks'] },
  { id: 'star_jump', name: 'Star jump', group: 'Cardio', eq: [], kind: 'core', unit: 'sec', start: 30, stress: { knee: 2 }, fitbod: ['Jumping Jacks', 'Star Jump'] },
  { id: 'db_thruster', name: 'Dumbbell thruster', group: 'Quads', eq: ['dumbbell'], kind: 'mid', unit: 'lb', start: 12, stress: { knee: 1, shoulder: 1 }, fitbod: ['Dumbbell Thruster'] }
);

// More day templates. Equipment and joint rules filter these, so they work at the gym or at home.
Object.assign(window.DAYS, {
  upper: { name: 'Upper body', slots: [
    { label: 'Press', ex: ['db_bench', 'db_floor_press', 'pushup', 'knee_pushup', 'incline_pushup'] },
    { label: 'Row', ex: ['db_row', 'seated_cable_row', 'db_bo_row'] },
    { label: 'Shoulders', ex: ['landmine_press', 'standing_db_press', 'db_shoulder_press', 'pike_pushup'] },
    { label: 'Vertical pull', ex: ['neutral_pullup', 'kneel_pulldown', 'superman'] },
    { label: 'Side delts', ex: ['db_lateral', 'cable_lateral'] },
    { label: 'Biceps', ex: ['hammer_curl', 'db_curl'] },
    { label: 'Triceps', ex: ['rope_pushdown', 'db_kickback', 'db_oh_ext'] },
    { label: 'Core', core: true, ex: ['dead_bug', 'plank', 'pallof', 'side_plank'] },
  ] },
  lower: { name: 'Lower body', slots: [
    { label: 'Hinge', ex: ['bb_rdl', 'db_rdl', 'kb_deadlift'] },
    { label: 'Glutes', ex: ['hip_thrust', 'db_hip_thrust', 'glute_bridge'] },
    { label: 'Squat', ex: ['box_goblet_squat', 'db_sumo_squat', 'bw_squat', 'goblet_squat', 'db_goblet_squat'] },
    { label: 'Lunge', ex: ['reverse_lunge', 'step_up', 'split_squat', 'curtsy_lunge'] },
    { label: 'Hamstrings', ex: ['sl_rdl', 'cable_leg_curl', 'sl_glute_bridge'] },
    { label: 'Calves', ex: ['db_calf_raise', 'sl_calf_raise'] },
    { label: 'Core', core: true, ex: ['leg_raise', 'ab_wheel', 'plank', 'dead_bug'] },
  ] },
  full: { name: 'Full body', slots: [
    { label: 'Squat', ex: ['box_goblet_squat', 'db_sumo_squat', 'bw_squat', 'goblet_squat'] },
    { label: 'Press', ex: ['db_bench', 'db_floor_press', 'pushup', 'knee_pushup'] },
    { label: 'Hinge', ex: ['db_rdl', 'bb_rdl'] },
    { label: 'Row', ex: ['db_row', 'db_bo_row', 'seated_cable_row'] },
    { label: 'Glutes', ex: ['hip_thrust', 'db_hip_thrust', 'glute_bridge'] },
    { label: 'Shoulders', ex: ['db_lateral', 'standing_db_press'] },
    { label: 'Core', core: true, ex: ['plank', 'dead_bug', 'bicycle_crunch'] },
  ] },
  glutes: { name: 'Glutes & legs', slots: [
    { label: 'Glutes', ex: ['db_hip_thrust', 'hip_thrust', 'glute_bridge'] },
    { label: 'Hinge', ex: ['db_rdl', 'sl_rdl'] },
    { label: 'Squat', ex: ['db_sumo_squat', 'bw_squat', 'db_goblet_squat', 'box_goblet_squat'] },
    { label: 'Lunge', ex: ['reverse_lunge', 'curtsy_lunge', 'split_squat', 'step_up'] },
    { label: 'Single leg glutes', ex: ['sl_glute_bridge', 'sl_rdl'] },
    { label: 'Glute burnout', ex: ['donkey_kick', 'fire_hydrant', 'clamshell'] },
    { label: 'Calves', ex: ['db_calf_raise', 'sl_calf_raise'] },
    { label: 'Core', core: true, ex: ['leg_raise', 'flutter_kick', 'plank', 'dead_bug'] },
  ] },
  upper_core: { name: 'Upper body & core', slots: [
    { label: 'Press', ex: ['knee_pushup', 'incline_pushup', 'pushup', 'db_floor_press'] },
    { label: 'Row', ex: ['db_bo_row', 'db_row'] },
    { label: 'Shoulders', ex: ['standing_db_press', 'pike_pushup'] },
    { label: 'Side delts', ex: ['db_lateral', 'db_front_raise'] },
    { label: 'Back delts', ex: ['rear_delt_fly', 'superman'] },
    { label: 'Arms', ex: ['db_curl', 'hammer_curl'] },
    { label: 'Triceps', ex: ['db_kickback', 'db_oh_ext'] },
    { label: 'Core', core: true, ex: ['dead_bug', 'side_plank', 'bicycle_crunch', 'russian_twist'] },
  ] },
  circuit: { name: 'Full-body circuit', circuit: true, slots: [
    { label: 'Squat press', ex: ['db_thruster', 'bw_squat'] },
    { label: 'Cardio', ex: ['mountain_climber', 'star_jump'] },
    { label: 'Lunge', ex: ['reverse_lunge', 'curtsy_lunge'] },
    { label: 'Push', ex: ['knee_pushup', 'pushup', 'incline_pushup'] },
    { label: 'Row', ex: ['db_bo_row'] },
    { label: 'Glutes', ex: ['glute_bridge', 'db_hip_thrust'] },
    { label: 'Core', core: true, ex: ['flutter_kick', 'plank', 'bicycle_crunch'] },
  ] },
});

// Workout splits to pick in setup. order = the rotation.
window.SPLITS = {
  ppl: { name: 'Chest & triceps, back & biceps, legs', order: ['push', 'pull', 'legs'] },
  ul: { name: 'Upper body, lower body', order: ['upper', 'lower'] },
  full: { name: 'Full body every time', order: ['full'] },
  glute: { name: 'Glutes & legs focus', order: ['glutes', 'upper_core', 'glutes', 'circuit'] },
};

// Goals change reps and rest. tone = more reps, short rests.
window.GOALS = {
  strength: { name: 'Get stronger', reps: null, restScale: 1 },
  tone: { name: 'Tone and lose weight', reps: { big: 12, mid: 12, iso: 15, core: 20 }, restScale: 0.4, repCap: 20 },
};
