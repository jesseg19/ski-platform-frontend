export interface BaseJump {
    name: string;
    baseDifficulty: number;
    allowedGrabs: 'all' | string[];
}

export const JUMP_BASES: Record<number, BaseJump[]> = {
    1: [ // Beginner: On-Axis, Natural, No doubles
        { name: "180", baseDifficulty: 10, allowedGrabs: ['Safety', 'Mute', 'Japan'] },
        { name: "360", baseDifficulty: 15, allowedGrabs: ['Safety', 'Mute', 'Japan'] },
        { name: "540", baseDifficulty: 22, allowedGrabs: ['Safety', 'Mute', 'Japan'] },
        { name: "Switch 180", baseDifficulty: 20, allowedGrabs: ['Safety', 'Mute', 'Japan'] },
        { name: "Switch 360", baseDifficulty: 20, allowedGrabs: ['Safety', 'Mute', 'Japan'] },
        { name: "Switch 540", baseDifficulty: 20, allowedGrabs: ['Safety', 'Mute', 'Japan'] },
        { name: "Unnatural 180", baseDifficulty: 20, allowedGrabs: ['Safety', 'Mute'] },
        { name: "Unnatural 360", baseDifficulty: 20, allowedGrabs: ['Safety', 'Mute'] },
        { name: "Unnatural 540", baseDifficulty: 20, allowedGrabs: ['Safety', 'Mute'] },
        { name: "Switch Unnatural 180", baseDifficulty: 20, allowedGrabs: ['Safety', 'Mute'] },
        { name: "Switch Unnatural 360", baseDifficulty: 20, allowedGrabs: ['Safety', 'Mute'] },
        { name: "Switch Unnatural 540", baseDifficulty: 20, allowedGrabs: ['Safety', 'Mute'] },
    ],
    2: [ // Advanced: Common Corks/Rodeos, Natural rotations up to 900
        { name: "540", baseDifficulty: 35, allowedGrabs: 'all' },
        { name: "720", baseDifficulty: 35, allowedGrabs: 'all' },
        { name: "Unnatural 540", baseDifficulty: 45, allowedGrabs: 'all' },
        { name: "Unnatural 720", baseDifficulty: 50, allowedGrabs: 'all' },
        { name: "Switch 540", baseDifficulty: 40, allowedGrabs: 'all' },
        { name: "Switch 720", baseDifficulty: 45, allowedGrabs: 'all' },
        { name: "Switch Unnatural 540", baseDifficulty: 50, allowedGrabs: 'all' },
        { name: "Switch Unnatural 720", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "Cork 360", baseDifficulty: 55, allowedGrabs: ['Safety', 'Blunt', 'Nose'] },
        { name: "Cork 540", baseDifficulty: 55, allowedGrabs: ['Safety', 'Blunt', 'Nose'] },
        { name: "Switch Rodeo 540", baseDifficulty: 50, allowedGrabs: ['Safety', 'Japan'] },
        { name: "Switch Rodeo 720", baseDifficulty: 55, allowedGrabs: ['Safety', 'Japan'] },
        { name: "Rodeo 540", baseDifficulty: 52, allowedGrabs: ['Safety', 'Mute', 'Japan'] },
        { name: "Misty 540", baseDifficulty: 52, allowedGrabs: ['Safety', 'Mute', 'Japan'] },
        { name: "Backflip", baseDifficulty: 42, allowedGrabs: ['Mute', 'Japan'] },

    ],
    3: [ // Expert: Bio/Misty, 900s, Switch Corks
        { name: "Underflip", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "720", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "900", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "Switch 900", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "Switch 1080", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "Cork 360", baseDifficulty: 60, allowedGrabs: 'all' },
        { name: "Cork 540", baseDifficulty: 60, allowedGrabs: 'all' },
        { name: "Cork 720", baseDifficulty: 60, allowedGrabs: 'all' },
        { name: "Cork 900", baseDifficulty: 60, allowedGrabs: 'all' },
        { name: "Misty 540", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Misty 720", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Bio 540", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Bio 720", baseDifficulty: 75, allowedGrabs: 'all' },
        { name: "Bio 900", baseDifficulty: 85, allowedGrabs: 'all' },
        { name: "Switch Rodeo 540", baseDifficulty: 70, allowedGrabs: 'all' },
        { name: "Switch Rodeo 720", baseDifficulty: 75, allowedGrabs: 'all' },
        { name: "Switch Cork 900", baseDifficulty: 85, allowedGrabs: 'all' },
        { name: "Switch Bio 900", baseDifficulty: 75, allowedGrabs: 'all' },
        { name: "Switch Bio 1080", baseDifficulty: 85, allowedGrabs: 'all' },
        { name: "Unnatural 720", baseDifficulty: 70, allowedGrabs: 'all' },
        { name: "Unnatural 900", baseDifficulty: 70, allowedGrabs: 'all' },
        { name: "Switch Unnatural 900", baseDifficulty: 90, allowedGrabs: 'all' },
        { name: "Switch Unnatural 1080", baseDifficulty: 95, allowedGrabs: 'all' },
        { name: "Unnatural Cork 720", baseDifficulty: 60, allowedGrabs: 'all' },
        { name: "Unnatural Cork 900", baseDifficulty: 60, allowedGrabs: 'all' },
        { name: "Unnatural Misty 540", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Unnatural Misty 720", baseDifficulty: 75, allowedGrabs: 'all' },
        { name: "Unnatural Bio 540", baseDifficulty: 70, allowedGrabs: 'all' },
        { name: "Unnatural Bio 720", baseDifficulty: 80, allowedGrabs: 'all' },
        { name: "Switch Unnatural Rodeo 540", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Switch Unnatural Rodeo 720", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Switch Unnatural Cork 900", baseDifficulty: 85, allowedGrabs: 'all' },
        { name: "Switch Unnatural Bio 900", baseDifficulty: 90, allowedGrabs: 'all' },
        { name: "Switch Unnatural Bio 1080", baseDifficulty: 95, allowedGrabs: 'all' },
    ],
    4: [ // Insane: 1080+, Doubles, Hard Bio/Misty
        { name: "Underflip", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "720", baseDifficulty: 35, allowedGrabs: 'all' },
        { name: "900", baseDifficulty: 40, allowedGrabs: 'all' },
        { name: "Switch 900", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "Switch 1080", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "Cork 360", baseDifficulty: 40, allowedGrabs: 'all' },
        { name: "Cork 540", baseDifficulty: 40, allowedGrabs: 'all' },
        { name: "Cork 720", baseDifficulty: 50, allowedGrabs: 'all' },
        { name: "Cork 900", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "Misty 540", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "Misty 720", baseDifficulty: 55, allowedGrabs: 'all' },
        { name: "Bio 540", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Bio 720", baseDifficulty: 75, allowedGrabs: 'all' },
        { name: "Bio 900", baseDifficulty: 85, allowedGrabs: 'all' },
        { name: "Switch Rodeo 540", baseDifficulty: 40, allowedGrabs: 'all' },
        { name: "Switch Rodeo 720", baseDifficulty: 45, allowedGrabs: 'all' },
        { name: "Switch Cork 900", baseDifficulty: 85, allowedGrabs: 'all' },
        { name: "Switch Bio 900", baseDifficulty: 75, allowedGrabs: 'all' },
        { name: "Switch Bio 1080", baseDifficulty: 85, allowedGrabs: 'all' },
        { name: "Unnatural 720", baseDifficulty: 70, allowedGrabs: 'all' },
        { name: "Unnatural 900", baseDifficulty: 70, allowedGrabs: 'all' },
        { name: "Switch Unnatural 900", baseDifficulty: 90, allowedGrabs: 'all' },
        { name: "Switch Unnatural 1080", baseDifficulty: 95, allowedGrabs: 'all' },
        { name: "Unnatural Cork 720", baseDifficulty: 60, allowedGrabs: 'all' },
        { name: "Unnatural Cork 900", baseDifficulty: 60, allowedGrabs: 'all' },
        { name: "Unnatural Misty 540", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Unnatural Misty 720", baseDifficulty: 75, allowedGrabs: 'all' },
        { name: "Unnatural Bio 540", baseDifficulty: 70, allowedGrabs: 'all' },
        { name: "Unnatural Bio 720", baseDifficulty: 80, allowedGrabs: 'all' },
        { name: "Switch Unnatural Rodeo 540", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Switch Unnatural Rodeo 720", baseDifficulty: 65, allowedGrabs: 'all' },
        { name: "Switch Unnatural Cork 900", baseDifficulty: 85, allowedGrabs: 'all' },
        { name: "Switch Unnatural Bio 900", baseDifficulty: 90, allowedGrabs: 'all' },
        { name: "Switch Unnatural Bio 1080", baseDifficulty: 95, allowedGrabs: 'all' },
        { name: "1080", baseDifficulty: 90, allowedGrabs: 'all' },
        { name: "Double Cork 720", baseDifficulty: 110, allowedGrabs: ['Mute', 'Safety', 'Japan'] },
        { name: "Double Cork 900", baseDifficulty: 110, allowedGrabs: ['Mute', 'Safety', 'Japan'] },
        { name: "Double Cork 1080", baseDifficulty: 150, allowedGrabs: 'all' },
        { name: "Switch Double Rodeo 900", baseDifficulty: 180, allowedGrabs: 'all' },
        { name: "Double Rodeo 900", baseDifficulty: 180, allowedGrabs: 'all' },
        { name: "Double Bio 1080", baseDifficulty: 210, allowedGrabs: 'all' },
        { name: "1260", baseDifficulty: 230, allowedGrabs: 'all' },
    ]
};

export const GRAB_LIST = [
    { name: "Safety", difficulty: 2 },
    { name: "Lead Safety", difficulty: 10 },
    { name: "Mute", difficulty: 4 },
    { name: "Japan", difficulty: 5 },
    { name: "Blunt", difficulty: 8 },
    { name: "Lead Blunt", difficulty: 17 },
    { name: "Stale", difficulty: 8 },
    { name: "Nose", difficulty: 10 },
    { name: "Critical", difficulty: 12 },
    { name: "Octo", difficulty: 15 },
    { name: "Truck driver", difficulty: 15 },
    { name: "Double Japan", difficulty: 15 },
    { name: "Esco", difficulty: 15 },
    { name: "Lead Mute", difficulty: 15 },
    { name: "Guitar", difficulty: 20 },
];



export interface RailBase {
    name: string;
    baseDifficulty: number;
    level: number;
    compatibleExits: 'all' | string[];
    allowSwaps: boolean;
}

export const RAIL_BASES: Record<number, RailBase[]> = {
    1: [ // Beginner
        { name: "Slide", baseDifficulty: 5, level: 1, compatibleExits: ['Forward', 'To Switch'], allowSwaps: true },
        { name: "Lipslide", baseDifficulty: 10, level: 1, compatibleExits: ['Forward', 'To Switch'], allowSwaps: true },
        { name: "Switch On", baseDifficulty: 10, level: 1, compatibleExits: 'all', allowSwaps: true },

    ],
    2: [ // Advanced
        { name: "Slide", baseDifficulty: 5, level: 2, compatibleExits: 'all', allowSwaps: true },
        { name: "Slide", baseDifficulty: 5, level: 2, compatibleExits: 'all', allowSwaps: true },
        { name: "Switch On", baseDifficulty: 10, level: 2, compatibleExits: 'all', allowSwaps: true },
        { name: "Switch On", baseDifficulty: 10, level: 2, compatibleExits: 'all', allowSwaps: true },
        { name: "270 On", baseDifficulty: 25, level: 2, compatibleExits: ['Forward', 'To Switch', '270 Out'], allowSwaps: false },
        { name: "Switch 270 On", baseDifficulty: 30, level: 2, compatibleExits: ['Forward', 'To Switch', '270 Out', 'Pretzel 270 Out'], allowSwaps: false },

    ],
    3: [ // Expert
        { name: "Slide", baseDifficulty: 5, level: 3, compatibleExits: 'all', allowSwaps: true },
        { name: "Switch On", baseDifficulty: 10, level: 3, compatibleExits: 'all', allowSwaps: true },
        { name: "270 On", baseDifficulty: 25, level: 3, compatibleExits: ['270 Out', '450 Out', 'Pretzel 270 Out', 'Pretzel 450 Out'], allowSwaps: true },
        { name: "Lip 270 On", baseDifficulty: 35, level: 3, compatibleExits: ['270 Out', '450 Out', 'Pretzel 270 Out', 'Pretzel 450 Out'], allowSwaps: true },
        { name: "Unnatural 270 On", baseDifficulty: 50, level: 3, compatibleExits: ['270 Out', '450 Out', 'Pretzel 270 Out', 'Pretzel 450 Out'], allowSwaps: true },
        { name: "Switch 270 On", baseDifficulty: 25, level: 3, compatibleExits: ['270 Out', '450 Out', 'Pretzel 270 Out', 'Pretzel 450 Out'], allowSwaps: true },
        { name: "Switch Unnatural 270 On", baseDifficulty: 50, level: 3, compatibleExits: ['270 Out', '450 Out', 'Pretzel 270 Out', 'Pretzel 450 Out'], allowSwaps: true },
        { name: "450 On", baseDifficulty: 50, level: 3, compatibleExits: ['270 Out', '450 Out'], allowSwaps: false },
        { name: "Switch 450 On", baseDifficulty: 55, level: 3, compatibleExits: ['270 Out', '450 Out'], allowSwaps: false },
    ],
    4: [ // Insane
        { name: "Slide", baseDifficulty: 5, level: 4, compatibleExits: 'all', allowSwaps: true },
        { name: "Switch On", baseDifficulty: 10, level: 4, compatibleExits: 'all', allowSwaps: true },
        { name: "270 On", baseDifficulty: 20, level: 4, compatibleExits: ['270 Out', 'Pretzel 270 Out', 'Pretzel 450 Out', '450 Out', '630 Out'], allowSwaps: true },
        { name: "Switch 270 On", baseDifficulty: 20, level: 4, compatibleExits: ['270 Out', 'Pretzel 270 Out', 'Pretzel 450 Out', '450 Out', '630 Out'], allowSwaps: true },
        { name: "Switch Unnatural 270 On", baseDifficulty: 20, level: 4, compatibleExits: ['270 Out', 'Pretzel 270 Out', 'Pretzel 450 Out', '450 Out', '630 Out'], allowSwaps: true },
        { name: "Lip 270 On", baseDifficulty: 20, level: 4, compatibleExits: ['270 Out', 'Pretzel 270 Out', 'Pretzel 450 Out', '450 Out', '630 Out'], allowSwaps: true },
        { name: "Unnatural 270 On", baseDifficulty: 45, level: 4, compatibleExits: ['To Switch', '270 Out', 'Pretzel 270 Out', 'Pretzel 450 Out', '450 Out', '630 Out'], allowSwaps: true },
        { name: "Unnatural Lip 270 On", baseDifficulty: 45, level: 4, compatibleExits: ['To Switch', '270 Out', 'Pretzel 270 Out', 'Pretzel 450 Out', '450 Out', '630 Out'], allowSwaps: true },
        { name: "450 On", baseDifficulty: 70, level: 4, compatibleExits: ['To Switch', '270 Out', 'Pretzel 270 Out', 'Pretzel 450 Out', '450 Out', '630 Out'], allowSwaps: true },
        { name: "Lip 450 On", baseDifficulty: 70, level: 4, compatibleExits: ['To Switch', '270 Out', 'Pretzel 270 Out', 'Pretzel 450 Out', '450 Out', '630 Out'], allowSwaps: true },
        { name: "Unnatural 450 On", baseDifficulty: 70, level: 4, compatibleExits: ['To Switch', '270 Out', 'Pretzel 270 Out', 'Pretzel 450 Out', '450 Out', '630 Out'], allowSwaps: true },
        { name: "630 On", baseDifficulty: 90, level: 4, compatibleExits: ['270 Out', '450 Out', 'Forward'], allowSwaps: false },
    ]
};

export const RAIL_MODIFIERS = {
    swaps: [
        { name: "Front Swap", difficulty: 15 },
        { name: "Back Swap", difficulty: 15 },
        { name: "Front 360 Swap", difficulty: 45 },
        { name: "Back 360 Swap", difficulty: 45 },
    ],
    exits: [
        { name: "Forward", difficulty: 0 },
        { name: "To Switch", difficulty: 5 },
        { name: "270 Out", difficulty: 10 },
        { name: "Pretzel 270 Out", difficulty: 35 },
        { name: "Pretzel 450 Out", difficulty: 55 },
        { name: "450 Out", difficulty: 35 },
        { name: "630 Out", difficulty: 65 },
    ]
};

//game of S.K.I. constants

// --- JUMP TRICK OPTIONS  ---
export const JUMP_DEFAULT_TRICKS = ["Backflip", "Frontflip", "Zero Spin", "Underflip"];
export const JUMP_TAKE_OFF_VARIATIONS = ["Nose Butter", "Tail Butter", "Take Off Holding Grab", "Blender", "Carving", "Lazy boy", "Tokyo Drift"];
export const JUMP_LANDING_VARIATIONS = ["Land Holding Grab"];
export const JUMP_STANCE_OPTIONS = ["Forward", "Switch"];
export const JUMP_DIRECTION_OPTIONS = ["Left", "Right"];
export const JUMP_NUMBER_OF_FLIPS_OPTIONS = ["Single", "Double"];
export const JUMP_AXIS_OPTIONS = ["Bio", "Rodeo", "Cork", "Misty", "On Axis"];
export const JUMP_DEGREE_OF_ROTATION_OPTIONS = ["180", "360", "540", "720", "900", "1080", "1260", "1440"];
export const JUMP_GRAB_OPTIONS = ["Mute", "Safety", "Blunt", "Nose", "Stale", "Japan", "Critical", "Octo", "Screamin' Seamen", "Esco", "Seatbelt", "Dub Japan", "Truck", "Bow and Arrow"];

// --- RAIL TRICK OPTIONS ---
export const RAIL_DEFAULT_TRICKS = ["Kfed", "Ellen", "Britney", "Ray-fed"];
export const RAIL_TAKE_OFF_VARIATIONS = ["Nose Butter", "Tail Butter", "Take Off Holding Grab", "Blender", "Tokyo Drift"];
export const RAIL_LANDING_VARIATIONS = ["Land Holding Grab"];
export const RAIL_SETUP_STANCE_OPTIONS = JUMP_STANCE_OPTIONS;
export const RAIL_SETUP_DIRECTION_OPTIONS = ["Left", "Right", "Left foot", "Right foot"];
export const RAIL_SETUP_TAKEOFF_FORWARD_OPTIONS = ["Regular", "Lip"];
export const RAIL_SETUP_TAKEOFF_SWITCH_OPTIONS = ["Lip", "Tails"];
export const RAIL_TRICK_SPIN_OPTIONS = ["180", "270", "360", "450", "630", "810"];
export const RAIL_SWAP_TYPE_OPTIONS = ["Front swap", "Back swap", "Front 360 swap", "Back 360 swap"];
export const RAIL_SPIN_OUT_TYPE_OPTIONS = ["To Switch", "To Forward", "Backside", "Frontside"];

export const allTrickTerms = [
    ...JUMP_AXIS_OPTIONS,
    ...JUMP_DEFAULT_TRICKS,
    ...JUMP_DEGREE_OF_ROTATION_OPTIONS,
    ...JUMP_DIRECTION_OPTIONS,
    ...JUMP_GRAB_OPTIONS,
    ...JUMP_LANDING_VARIATIONS,
    ...JUMP_NUMBER_OF_FLIPS_OPTIONS,
    ...JUMP_STANCE_OPTIONS,
    ...JUMP_TAKE_OFF_VARIATIONS,
    ...RAIL_DEFAULT_TRICKS,
    ...RAIL_LANDING_VARIATIONS,
    ...RAIL_SETUP_DIRECTION_OPTIONS,
    ...RAIL_SETUP_STANCE_OPTIONS,
    ...RAIL_SETUP_TAKEOFF_FORWARD_OPTIONS,
    ...RAIL_SETUP_TAKEOFF_SWITCH_OPTIONS,
    ...RAIL_SPIN_OUT_TYPE_OPTIONS,
    ...RAIL_SWAP_TYPE_OPTIONS,
    ...RAIL_TAKE_OFF_VARIATIONS,
    ...RAIL_TRICK_SPIN_OPTIONS,
];

