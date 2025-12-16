import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ImageBackground, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Custom Button Component for Difficulty Levels ---
interface DifficultyButtonProps {
  title: string;
  level: number;
  onPress: (level: number) => void;
  isSelected: boolean;
}
const DifficultyButton: React.FC<DifficultyButtonProps> = ({ title, level, onPress, isSelected }) => (
  <TouchableOpacity
    style={[
      diceStyles.difficultyButton,
      isSelected ? diceStyles.difficultyButtonSelected : diceStyles.difficultyButtonDefault
    ]}
    onPress={() => onPress(level)}
  >
    <ThemedText style={isSelected ? diceStyles.difficultyTextSelected : diceStyles.difficultyTextDefault}>
      {title}
    </ThemedText>
  </TouchableOpacity>
);

// --- Custom Segmented Control for Mode (Jumps/Rails) ---
type Mode = 'jumps' | 'rails';

interface ModeSwitchProps {
  selectedMode: Mode;
  onSelectMode: (mode: Mode) => void;
}
const ModeSwitch: React.FC<ModeSwitchProps> = ({ selectedMode, onSelectMode }) => {
  return (
    <View style={diceStyles.modeSwitchContainer}>
      <TouchableOpacity
        style={[
          diceStyles.modeSwitchButton,
          selectedMode === 'jumps' ? diceStyles.modeSwitchButtonSelected : diceStyles.modeSwitchButtonDefault
        ]}
        onPress={() => onSelectMode('jumps')}
      >
        <Ionicons name="dice-outline" size={20} color={selectedMode === 'jumps' ? Theme.cardBackground : Theme.primary} />
        <ThemedText style={selectedMode === 'jumps' ? diceStyles.modeSwitchTextSelected : diceStyles.modeSwitchTextDefault}>
          Jumps
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          diceStyles.modeSwitchButton,
          selectedMode === 'rails' ? diceStyles.modeSwitchButtonSelected : diceStyles.modeSwitchButtonDefault
        ]}
        onPress={() => onSelectMode('rails')}
      >
        <Ionicons name="snow-outline" size={20} color={selectedMode === 'rails' ? Theme.cardBackground : Theme.primary} />
        <ThemedText style={selectedMode === 'rails' ? diceStyles.modeSwitchTextSelected : diceStyles.modeSwitchTextDefault}>
          Rails
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};


// --- Difficulty Level Mapping  ---
const DIFFICULTY_LEVELS = [
  { displayName: 'I', name: 'Beginner', maxDifficulty: 25, minDifficulty: 10, value: 1 },
  // { displayName: 'II', name: 'Intermediate', maxDifficulty: 50, minDifficulty: 21, value: 2 },
  { displayName: 'II', name: 'Advanced', maxDifficulty: 65, minDifficulty: 21, value: 3 },
  { displayName: 'III', name: 'Expert', maxDifficulty: 100, minDifficulty: 40, value: 4 },
  { displayName: 'IV', name: 'Insane', maxDifficulty: 250, minDifficulty: 60, value: 5 },
];

// --- Base Trick Component Interface ---
interface TrickComponent {
  name: string;
  difficulty: number;
}

// --- JUMP TRICK GENERATION LOGIC ---
const stanceOptions: TrickComponent[] = [
  { name: "Forward", difficulty: 1 },
  { name: "Switch", difficulty: 5 },
];
const spinDirectionOptions: TrickComponent[] = [
  { name: "Natural", difficulty: 1 },
  { name: "Unnatural", difficulty: 10 },
];
const numberOfFlipsOptions: TrickComponent[] = [
  { name: "", difficulty: 1 },
  { name: "Double", difficulty: 60 },
];
const axisOptions: TrickComponent[] = [
  { name: "Bio", difficulty: 22 },
  { name: "Rodeo", difficulty: 17 },
  { name: "Cork", difficulty: 15 },
  { name: "Misty", difficulty: 15 },
  { name: "On Axis", difficulty: 1 },
];
const degreeOfRotationOptions: TrickComponent[] = [
  { name: "180", difficulty: 3 },
  { name: "360", difficulty: 2 },
  { name: "540", difficulty: 4 },
  { name: "720", difficulty: 7 },
  { name: "900", difficulty: 12 },
  { name: "1080", difficulty: 20 },
  { name: "1260", difficulty: 55 },
];
const grabOptions: TrickComponent[] = [
  { name: "Mute", difficulty: 5 },
  { name: "Safety", difficulty: 1 },
  { name: "Blunt", difficulty: 6 },
  { name: "Nose", difficulty: 8 },
  { name: "Stale", difficulty: 9 },
  { name: "Japan", difficulty: 5 },
  { name: "Critical", difficulty: 9 },
  { name: "Octo", difficulty: 12 },
  { name: "Screamin' Seamen", difficulty: 18 },
  { name: "Esco", difficulty: 12 },
  { name: "Seatbelt", difficulty: 12 },
  { name: "Dub Japan", difficulty: 10 },
  { name: "Truck driver", difficulty: 12 },

];

interface Trick {
  stance: string;
  spinDirection: string;
  numberOfFlips: string;
  axis: string;
  degreeOfRotation: string;
  grab: string;
}

function isValidTrick(trick: Trick, selectedDifficulty: number): boolean {

  // bio/misty can't be double under 900
  if ((trick.axis === 'Bio' || trick.axis === 'Misty') && parseInt(trick.degreeOfRotation) < 900 && trick.numberOfFlips === "Double") {
    return false;
  }
  // switch bio/misty can't be double under 1080
  if ((trick.axis === 'Bio' || trick.axis === 'Misty') && parseInt(trick.degreeOfRotation) < 1080 && trick.stance === "Switch" && trick.numberOfFlips === "Double") {
    return false;
  }
  // cork/rodeo can't be double under 720
  if ((trick.axis === 'Cork' || trick.axis === 'Rodeo') && parseInt(trick.degreeOfRotation) <= 540 && trick.numberOfFlips === "Double") {
    return false;
  }
  // switch cork/rodeo can't be double under 900
  if ((trick.axis === 'Cork' || trick.axis === 'Rodeo') && trick.stance === "Switch" && parseInt(trick.degreeOfRotation) < 900 && trick.numberOfFlips === "Double") {
    return false;
  }
  //can't flip on axis
  if (trick.numberOfFlips === "Double" && trick.axis === "") {
    return false;
  }
  // nothing under 360 for anything but cork or on axis
  if (trick.axis !== "" && trick.axis !== "Cork" && parseInt(trick.degreeOfRotation) <= 360) {
    return false;
  }
  if (trick.axis === "Cork" && (parseInt(trick.degreeOfRotation) <= 180 || trick.stance === "Switch" && parseInt(trick.degreeOfRotation) <= 360)) {
    return false;
  }
  // sw misty/bio can't be 540 or under
  if ((trick.axis === "Misty" || trick.axis === "Bio") && trick.stance === "Switch" && parseInt(trick.degreeOfRotation) <= 720) {
    return false;
  }
  if (trick.grab === "Screamin' Seamen" && parseInt(trick.degreeOfRotation) >= 900) {
    return false;
  }
  if (trick.degreeOfRotation === "1260" && trick.numberOfFlips !== "Double") {
    return false;
  }

  // //level 1 restrictions
  // if (selectedDifficulty === 1 && trick.axis !== "On Axis") {
  //   return false;
  // }
  // if (selectedDifficulty === 1 && parseInt(trick.degreeOfRotation) >= 900) {
  //   return false;
  // }

  // if (selectedDifficulty && (trick.axis === "Bio" || trick.axis === "Misty")) {
  //   return false;
  // }

  // if (selectedDifficulty < 4 && parseInt(trick.degreeOfRotation) >= 900) {
  //   return false;
  // }

  // if (selectedDifficulty < 4 && trick.spinDirection === "Switch" && trick.axis === "Cork" && parseInt(trick.degreeOfRotation) > 720) {
  //   return false;
  // }
  // if (selectedDifficulty < 5 && trick.numberOfFlips === "Double") {
  //   return false;
  // }
  return true;
}


function generateTrick(maxDifficulty: number, minDifficulty: number, selectedDifficulty: number): Trick {
  // Level-Specific Pre-Filtering & Probability Weighting

  // Dynamic Array for available components based on level
  let availableAxis = axisOptions;
  let availableRotation = degreeOfRotationOptions;
  let availableFlips = numberOfFlipsOptions;
  let availableSpinDirection = spinDirectionOptions;
  let availableGrabs = grabOptions;

  if (selectedDifficulty === 1) {

    //  Level 1 must be "On Axis" and simple Stance/Spin Direction
    availableAxis = axisOptions.filter(axes => axes.name === "On Axis");
    availableSpinDirection = spinDirectionOptions.filter(spin => spin.name === "Natural");
    availableFlips = numberOfFlipsOptions.filter(flips => flips.name === ""); // No doubles
    availableGrabs = grabOptions.filter(grab => grab.name !== "Screamin' Seamen"); // No Screamin' Seamen

    // Weight the Rotation Pool to favor 360/540
    // Keep the limit below 720 (as you had before)
    let baseL1Rotation = degreeOfRotationOptions.filter(deg => parseInt(deg.name) < 720);

    // Add 360 and 540 multiple times to bias the random selection
    let weightedL1Rotation = [
      ...baseL1Rotation.filter(d => d.name === '360'),
      ...baseL1Rotation.filter(d => d.name === '360'), // Heavy Weight
      ...baseL1Rotation.filter(d => d.name === '540'), // Heavy Weight
      ...baseL1Rotation.filter(d => d.name === '180'), // Low Weight
    ];

    availableRotation = weightedL1Rotation;
  }

  // --- Level 2 : More Natural Flips, Common Axes ---
  if (selectedDifficulty === 2) {
    // Make Unnatural less likely to be chosen 
    availableSpinDirection = [
      { name: "Natural", difficulty: 1 },
      { name: "Natural", difficulty: 1 },
      { name: "Natural", difficulty: 1 },
      { name: "Natural", difficulty: 1 },
      { name: "Unnatural", difficulty: 10 },
    ];
    // Reduce chance of Bio
    availableAxis = axisOptions.filter(a => a.name !== 'Bio').concat({ name: "Bio", difficulty: 22 });

    // Level 2 Rotation: 540-900 (mostly 540/720)
    availableRotation = degreeOfRotationOptions.filter(deg => parseInt(deg.name) >= 540 && parseInt(deg.name) <= 900);

    // Switch Cork/Rodeo are more common than Switch Misty/Bio
    // We handle this via dynamic difficulty in the loop below.
  }

  // --- Level 3 (Expert): Even Mix, Cork with Hard Grabs, 720/900 Mix ---
  if (selectedDifficulty === 3) {
    // Equal chance for Natural/Unnatural (default 1/1 mix is fine, but we'll use weighting for control)
    availableSpinDirection = [
      { name: "Natural", difficulty: 1 },
      { name: "Unnatural", difficulty: 10 },
    ];
    // Ensure 720 and 900 are mixed well (bias towards 720 slightly to reduce 900 spam)
    availableRotation = degreeOfRotationOptions.filter(deg => parseInt(deg.name) >= 720 && parseInt(deg.name) <= 1080);
    // Add extra 720 options to the pool
    availableRotation.push(
      ...degreeOfRotationOptions.filter(d => d.name === '720'),
      ...degreeOfRotationOptions.filter(d => d.name === '900')
    );
  }

  // --- Level 4 (Insane): More 1080s, Occasional Doubles, 900 with Hard Grabs ---
  if (selectedDifficulty === 4) {
    // Increase Double chance significantly for this level (but not 100%)
    availableFlips = [
      { name: "", difficulty: 1 }, // Single Flip (75%)
      { name: "", difficulty: 1 },
      { name: "", difficulty: 1 },
      { name: "Double", difficulty: 60 }, // Double Flip (25%)
    ];
    // Bias for 1080, still allow 900 with hard grabs, reduce 1260 chance
    availableRotation = degreeOfRotationOptions.filter(deg => parseInt(deg.name) >= 900);
    // Add extra 900/1080 options to the pool for weighted selection
    availableRotation.push(
      ...degreeOfRotationOptions.filter(d => d.name === '900'),
      ...degreeOfRotationOptions.filter(d => d.name === '1080')
    );
  }

  // General Filtering (copied from your original to ensure basic logic is maintained)
  availableAxis = availableAxis.filter(axes => {
    if (selectedDifficulty === 1 && axes.name !== "On Axis") return false;
    if (selectedDifficulty < 3 && (axes.name === "Bio" || axes.name === "Misty")) return false;
    return true;
  });

  availableRotation = availableRotation.filter(deg => {
    if (selectedDifficulty === 1 && parseInt(deg.name) >= 720) return false;
    if (selectedDifficulty < 4 && parseInt(deg.name) >= 1080) return false; // Max 900/1080 for Expert/Insane
    if (selectedDifficulty < 5 && parseInt(deg.name) >= 1260) return false;
    return true;
  });

  availableFlips = availableFlips.filter(flips => {
    if (selectedDifficulty < 5 && flips.name === "Double" && selectedDifficulty < 4) return false; // Level 1-3 No Doubles
    return true;
  });


  for (let i = 0; i < 50; i++) {

    // Select components based on the filtered/weighted pools
    const stance = stanceOptions[Math.floor(Math.random() * stanceOptions.length)];
    const spinDirection = availableSpinDirection[Math.floor(Math.random() * availableSpinDirection.length)];
    const numberOfFlips = availableFlips[Math.floor(Math.random() * availableFlips.length)];
    const spinAmount = availableRotation[Math.floor(Math.random() * availableRotation.length)];
    const axes = availableAxis[Math.floor(Math.random() * availableAxis.length)];
    const grab = availableGrabs[Math.floor(Math.random() * availableGrabs.length)];

    // Calculate initial total difficulty
    let totalDifficulty = stance.difficulty + numberOfFlips.difficulty + spinAmount.difficulty + axes.difficulty + grab.difficulty;

    // Start with the base spin direction difficulty
    let spinDirDiff = spinDirection.difficulty;

    // --- Dynamic Difficulty Logic ---

    if (spinDirection.name === "Unnatural" && axes.name !== "On Axis") {
      spinDirDiff += 15;
    }

    //  Level 2 (Advanced) - Switch Cork/Rodeo is easier than Switch Misty/Bio
    // We make Switch Misty/Bio much harder than Switch Cork/Rodeo
    if (selectedDifficulty === 2 && stance.name === "Switch" && spinAmount.name === '720') {
      if (axes.name === 'Misty' || axes.name === 'Bio') {
        totalDifficulty += 30; // Make them very rare by adding a huge penalty
      }
    }

    //  Level 3/4 (Expert/Insane) - Smaller Spin + Hard Grab Bonus
    // This allows Cork 3/5 with hard grabs to compete with 900s
    if (selectedDifficulty >= 3 && (spinAmount.name === '540' || spinAmount.name === '720')) {
      if (grab.difficulty >= 10) { // e.g., Octo, Screamin' Seamen, Esco, etc.
        totalDifficulty += 15;
      }
    }

    // Add the modified spin direction difficulty
    totalDifficulty += spinDirDiff;


    // Check difficulty range against the *adjusted* score
    if (totalDifficulty > maxDifficulty || totalDifficulty < minDifficulty) {
      continue;
    }

    const selectedTrick = {
      stance: stance.name,
      spinDirection: spinDirection.name,
      numberOfFlips: numberOfFlips.name,
      grab: grab.name,
      degreeOfRotation: spinAmount.name,
      axis: axes.name !== "On Axis" ? axes.name : "",
    };

    // Only run the remaining, combinatorial isValidTrick rules
    if (isValidTrick(selectedTrick, selectedDifficulty)) {
      return selectedTrick;
    }
  }

  // Fallback
  return { stance: 'Forward', spinDirection: 'Natural', numberOfFlips: '', grab: 'Mute', degreeOfRotation: '360', axis: '' };
}

// --- END JUMP TRICK LOGIC ---

// --- ------------------- ---
// --- RAIL TRICK LOGIC    ---
// --- ------------------- ---

// --- Rail Trick Component Definitions ---
const railStance: TrickComponent[] = [
  { name: 'Forward', difficulty: 1 },
  { name: 'Switch', difficulty: 5 },
];
const railDirection: TrickComponent[] = [
  { name: 'Natural', difficulty: 1 },
  { name: 'Unnatural', difficulty: 30 },
];
const railTakeoff: TrickComponent[] = [
  { name: 'Regular', difficulty: 1 },
  { name: 'Lip', difficulty: 5 },
  { name: 'Tails', difficulty: 8 },
];
const railSpinIn: TrickComponent[] = [
  { name: '', difficulty: 1 }, // e.g., 50-50 or slide
  // { name: '180', difficulty: 5 }, // To switch 50-50
  { name: '270', difficulty: 10 },
  { name: '450', difficulty: 50 },
  // { name: '630 on', difficulty: 80 },
];
const railSwap: TrickComponent[] = [
  { name: 'Front Swap', difficulty: 8 },
  { name: 'Back Swap', difficulty: 8 },
  { name: 'Front 360 Swap', difficulty: 40 },
  { name: 'Back 360 Swap', difficulty: 40 },
];
const railSpinOut: TrickComponent[] = [
  { name: 'Forward', difficulty: 1 },
  { name: 'To Switch', difficulty: 3 },
  // { name: 'Pretzel 180', difficulty: 8 },
  { name: 'Back 270 Out', difficulty: 12 },
  { name: 'Front 270 Out', difficulty: 12 },
  { name: 'Pretzel 270 Out', difficulty: 15 },
  { name: 'Back 450 Out', difficulty: 25 },
  { name: 'Front 450 Out', difficulty: 25 },
  { name: 'Back 630 Out', difficulty: 55 },
  { name: 'Front 630 Out', difficulty: 55 },
];

// Interface to hold the generated rail trick parts
interface GeneratedRailTrick {
  stance: TrickComponent;
  direction: TrickComponent;
  // foot: TrickComponent;
  takeoff: TrickComponent;
  spinIn: TrickComponent;
  swaps: TrickComponent[];
  spinOut: TrickComponent;
}

/**
 * Checks for specific conflicting combos based on difficulty level.
 */
function isValidRailTrick(trick: GeneratedRailTrick, selectedDifficulty: number): boolean {
  // Rule: 'Tails' takeoff is only for 'Switch' stance
  if (trick.stance.name === 'Forward' && trick.takeoff.name === 'Tails') {
    return false;
  }
  // Rule: 'Regular' takeoff is only for 'Forward' stance
  if (trick.stance.name === 'Switch' && trick.takeoff.name === 'Regular') {
    return false;
  }

  // Rule: Level 1 - 450 out only if no swap
  if (selectedDifficulty === 1 && trick.swaps.length > 0 && trick.spinOut.name.includes('450')) {
    return false;
  }

  // Rule: Level 2 - No 270 on + swap
  if (selectedDifficulty === 2 && trick.spinIn.name === '270' && trick.swaps.length > 0) {
    return false;
  }

  // Rule: Don't combine 'Lip'/'Straddle' with '180' on (it's awkward)
  if (trick.spinIn.name === '180' && (trick.takeoff.name === 'Lip' || trick.takeoff.name === 'Straddle')) {
    return false;
  }

  // Rule: Max 3 swaps (hard cap)
  if (trick.swaps.length > 3) {
    return false;
  }
  // Rule: Level 4/Insane - Limit complexity of 630 on
  if (trick.spinIn.name.includes('630')) {
    // If it's a 630 in, limit total complexity significantly
    if (trick.swaps.length > 1 || trick.spinOut.name.includes('270') || trick.spinOut.name.includes('450')) {
      return false; // Block 630 on + multiple swaps OR complex spin outs
    }
  }

  // Rule: Level 4/Insane - Prevent back-to-back 360 swaps
  if (selectedDifficulty >= 4) {
    let threeSixtySwapCount = 0;
    for (const swap of trick.swaps) {
      if (swap.name.includes('360')) {
        threeSixtySwapCount++;
      } else {
        // If there's a non-360 swap in between, we reset the count.
        threeSixtySwapCount = 0;
      }
      if (threeSixtySwapCount >= 2) {
        return false;
      }
    }
  }

  return true;

}

/**
 * filters components by difficulty level and has swap probability.
 */
function generateRailTrick(maxDifficulty: number, minDifficulty: number, selectedDifficulty: number): GeneratedRailTrick {
  let selectedTrick: GeneratedRailTrick;
  let totalDifficulty = 0;

  // --- Filter components based on selected difficulty LEVEL ---
  const availableSpinIn = railSpinIn.filter(t => {
    if (t.name === '270' && selectedDifficulty < 2) return false; // Lvl 2+
    if (t.name === '450' && selectedDifficulty < 3) return false; // Lvl 3+
    if (t.name === '630' && selectedDifficulty < 5) return false; // Lvl 5+
    return true;
  });

  const availableSwaps = railSwap.filter(t => {
    if (t.name.includes('360') && selectedDifficulty < 4) return false; // Lvl 4+
    return true;
  });

  const availableSpinOut = railSpinOut.filter(t => {
    if (t.name.includes('630') && selectedDifficulty < 3) return false; // Lvl 3+
    return true;
  });

  while (true) {
    totalDifficulty = 0;

    const stance = railStance[Math.floor(Math.random() * railStance.length)];
    const direction = railDirection[Math.floor(Math.random() * railDirection.length)];
    // const foot = railFoot[Math.floor(Math.random() * railFoot.length)];

    const spinIn = availableSpinIn[Math.floor(Math.random() * availableSpinIn.length)];
    const spinOut = availableSpinOut[Math.floor(Math.random() * availableSpinOut.length)];

    // Filter takeoff based on stance (as before)
    const availableTakeoff = railTakeoff.filter(t => {
      if (stance.name === 'Forward' && t.name === 'Tails') return false;
      if (stance.name === 'Switch' && t.name === 'Regular') return false;
      return true;
    });
    const takeoff = availableTakeoff[Math.floor(Math.random() * availableTakeoff.length)];


    //  --- Determine number of swaps  ---
    const swapRand = Math.random();
    let numSwaps = 0;

    if (selectedDifficulty === 1) { // Beginner: 40% chance of 1 swap
      if (swapRand > 0.6) numSwaps = 1;
    } else if (selectedDifficulty === 2) { // Intermediate: 40% 1 swap, 20% 2 swaps
      if (swapRand > 0.8) numSwaps = 2;
      else if (swapRand > 0.4) numSwaps = 1;
    } else if (selectedDifficulty === 3) { // Advanced: 55% 1 swap, 15% 2 swaps
      if (swapRand > 0.85) numSwaps = 2;
      else if (swapRand > 0.3) numSwaps = 1;
    } else if (selectedDifficulty === 4) { // Expert: 40% 1 swap, 30% 2 swaps, 10% 3 swaps
      if (swapRand > 0.9) numSwaps = 3;
      else if (swapRand > 0.6) numSwaps = 2;
      else if (swapRand > 0.2) numSwaps = 1;
    } else if (selectedDifficulty === 5) { // Insane: 30% 1 swap, 40% 2 swaps, 20% 3 swaps
      if (swapRand > 0.8) numSwaps = 3;
      else if (swapRand > 0.4) numSwaps = 2;
      else if (swapRand > 0.1) numSwaps = 1;
    }
    // --- End of new swap logic ---

    //  Select swaps
    const swaps: TrickComponent[] = [];
    if (availableSwaps.length > 0) {
      for (let i = 0; i < numSwaps; i++) {
        const swap = availableSwaps[Math.floor(Math.random() * availableSwaps.length)];
        swaps.push(swap);
      }
    }

    //  Pretzel Combo Difficulty Logic ---
    let pretzelComboDifficulty = 0;
    let currentSpinDirection: 'Frontside' | 'Backside' | 'None' = 'None';

    // Set initial spin direction from SpinIn
    if (spinIn.name !== '' && spinIn.name !== '180') {
      if (stance.name === 'Forward') {
        // Standard convention: Forward Left = Backside, Forward Right = Frontside
        currentSpinDirection = direction.name === 'Left' ? 'Backside' : 'Frontside';
      } else { // Switch
        // Standard convention: Switch Left = Frontside, Switch Right = Backside
        currentSpinDirection = direction.name === 'Left' ? 'Frontside' : 'Backside';
      }
    }

    // Process Swaps and check for same-way combos
    for (let i = 0; i < swaps.length; i++) {
      const swapName = swaps[i].name;

      if (currentSpinDirection !== 'None') {
        // Check if this swap is "same-way" as the current spin direction
        if ((swapName.includes('Back') && currentSpinDirection === 'Backside') ||
          (swapName.includes('Front') && currentSpinDirection === 'Frontside')) {
          // This is a "same-way" swap (e.g., BS 270 -> Back Swap), add difficulty
          pretzelComboDifficulty += 15;
          // Direction *does not* change
        } else {
          // This is an "opposite-way" swap, no extra difficulty
          // But it *flips* the direction for the next component
          currentSpinDirection = (currentSpinDirection === 'Backside') ? 'Frontside' : 'Backside';
        }
      } else {
        // No spin in, this swap sets the direction for the next component
        currentSpinDirection = swapName.includes('Back') ? 'Backside' : 'Frontside';
      }

      // Check for "same-way" subsequent swaps (Back-to-Back, Front-to-Front)
      if (i > 0) {
        const prevSwapName = swaps[i - 1].name;
        if ((prevSwapName.includes('Back') && swapName.includes('Back')) ||
          (prevSwapName.includes('Front') && swapName.includes('Front'))) {
          // This is a Back-Back or Front-Front combo, add difficulty
          pretzelComboDifficulty += 15;
        }
      }
    }

    // Check Spin Out
    if (currentSpinDirection !== 'None' && spinOut.name.includes('Out')) {
      if ((spinOut.name.includes('Back') && currentSpinDirection === 'Backside') ||
        (spinOut.name.includes('Front') && currentSpinDirection === 'Frontside')) {
        // This is a "same-way" spin out, add difficulty
        // e.g., Backside 270 -> Back Swap -> Back 270 Out
        pretzelComboDifficulty += 20;
      }
    }

    // Calculate total difficulty
    totalDifficulty = stance.difficulty +
      takeoff.difficulty +
      spinIn.difficulty +
      spinOut.difficulty;

    swaps.forEach(s => { totalDifficulty += s.difficulty; });

    if (spinIn.name !== '' || spinOut.name.includes('Out')) {
      totalDifficulty += direction.difficulty;
    }
    // if (spinIn.name === '') {
    //   totalDifficulty += foot.difficulty;
    // }

    // Check Difficulty constraint
    if (totalDifficulty > maxDifficulty || totalDifficulty < minDifficulty) {
      continue;
    }

    selectedTrick = { stance, direction, takeoff, spinIn, swaps, spinOut };
    // selectedTrick = { stance, direction, foot, takeoff, spinIn, swaps, spinOut };

    // Check Validity constraint
    if (isValidRailTrick(selectedTrick, selectedDifficulty)) {
      break;
    }
  }

  return selectedTrick;
}

/**
 * Formats the generated rail trick object into a clean string for display.
 */
function formatRailTrick(trick: GeneratedRailTrick): string {
  const parts: string[] = [];

  // Stance 
  if (trick.stance.name === 'Switch') {
    parts.push('Switch');
  }

  // --- Rail Direction/Spin In Logic ---
  const hasSpinIn = trick.spinIn.name !== '';

  // Add Direction (ONLY if Unnatural)
  if (trick.direction.name === 'Unnatural') {
    parts.push('Unnatural');
  }

  //  Takeoff/Slide Type
  if (trick.takeoff.name !== 'Regular') {
    if (!hasSpinIn) {
      // Example: "Switch Lip Slide" or "Tails Slide"
      parts.push(trick.takeoff.name);
    } else {
      // Example: "Lip" for "Lip 270 On"
      parts.push(trick.takeoff.name);
    }
  }


  //  Spin In
  if (hasSpinIn) {
    // We push the full spin name, e.g., "270 On"
    parts.push(trick.spinIn.name + ' On');
  }

  //  Default Slide/Stance if no spin-in
  if (!hasSpinIn) {
    if (trick.takeoff.name !== 'Regular') {
      parts.push('Slide');
    }
  }


  // Swaps
  trick.swaps.forEach(swap => {
    parts.push(swap.name);
  });

  //  Spin Out
  if (trick.spinOut.name !== 'Forward') {
    // Include complex spins and "To Switch"
    parts.push(trick.spinOut.name);
  }

  // Final clean up
  let trickString = parts.join(' ').replace('  ', ' ').trim();

  // Specific cleanup for 'Tailslide' and 'Lipslide'
  trickString = trickString.replace('Lip Slide', 'Lipslide');
  trickString = trickString.replace('Tails Slide', 'Tails On');

  return trickString;
};




// --- HANDLER FOR BACK BUTTON ---
const handleBackToMenu = () => {
  router.replace('/(tabs)/game');
};


export default function TrickDiceScreen() {
  const [trickText, setTrickText] = useState('Press the dice to generate your challenge!');
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS[1]);
  const [mode, setMode] = useState<Mode>('jumps');

  const handleGenerateTrick = useCallback(() => {
    const { maxDifficulty, minDifficulty, value: difficultyValue } = selectedDifficulty;

    if (mode === 'jumps') {
      const trick = generateTrick(maxDifficulty, minDifficulty, difficultyValue);

      // Clean up the trick string for display
      const trickParts = [
        trick.stance !== 'Forward' ? trick.stance : '',
        trick.spinDirection !== 'Natural' ? trick.spinDirection : '',
        trick.numberOfFlips,
        trick.axis,
        trick.degreeOfRotation,
        trick.grab,
      ].filter(Boolean); // Filter out empty strings

      const trickString = trickParts.join(' ');
      setTrickText(trickString.trim());

    } else {
      // --- Generate Rail Trick ---
      const railTrick = generateRailTrick(maxDifficulty, minDifficulty, difficultyValue);
      const trickString = formatRailTrick(railTrick);
      setTrickText(trickString.trim());
    }

  }, [selectedDifficulty, mode]);

  const handleSelectDifficulty = (levelValue: number) => {
    const newDifficulty = DIFFICULTY_LEVELS.find(d => d.value === levelValue);
    if (newDifficulty) {
      setSelectedDifficulty(newDifficulty);
    }
  };

  const handleSelectMode = (newMode: Mode) => {
    setMode(newMode);
    setTrickText(newMode === 'jumps' ? 'Roll for a Jump Trick' : 'Roll for a Rail Trick');
  };

  return (
    <ImageBackground
      source={require('@/assets/images/background.png')}
      style={diceStyles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={diceStyles.mainContainer}>

        {/* --- Mode Selector (Jumps/Rails) --- */}
        <ModeSwitch selectedMode={mode} onSelectMode={handleSelectMode} />

        {/* --- Difficulty Selector Card --- */}
        <ThemedView style={diceStyles.card}>
          <ThemedText type="subtitle" style={diceStyles.cardTitle}>Set Difficulty Level</ThemedText>
          <ThemedText style={diceStyles.currentDifficulty}>
            Current: <ThemedText style={diceStyles.currentDifficulty} type="defaultSemiBold">{selectedDifficulty.name}</ThemedText>
          </ThemedText>
          <View style={diceStyles.difficultyButtonRow}>
            {DIFFICULTY_LEVELS.map((level) => (
              <DifficultyButton
                key={level.value}
                title={level.displayName}
                level={level.value}
                onPress={handleSelectDifficulty}
                isSelected={selectedDifficulty.value === level.value}
              />
            ))}
          </View>
        </ThemedView>

        {/* --- Trick Generator Button --- */}
        <TouchableOpacity
          style={diceStyles.generateButton}
          onPress={handleGenerateTrick}
        >
          <ThemedText style={diceStyles.generateButtonText}>
            ROLL FOR A {mode === 'jumps' ? 'JUMP' : 'RAIL'}
          </ThemedText>
          <Ionicons name="dice-outline" size={28} color={Theme.cardBackground} />
        </TouchableOpacity>

        {/* --- Display Trick Card --- */}
        <ThemedView style={diceStyles.card}>
          <ThemedText type="subtitle" style={diceStyles.cardTitle}>Generated Trick</ThemedText>
          <ThemedText style={diceStyles.trickDisplay}>
            {trickText}
          </ThemedText>
        </ThemedView>

        {/* --- Back Button --- */}
        <ThemedView style={diceStyles.backButtonContainer}>
          <TouchableOpacity onPress={handleBackToMenu}>
            <ThemedText style={diceStyles.backButtonText}>Back to Main Menu</ThemedText>
          </TouchableOpacity>
          <ThemedText style={diceStyles.warningText}> ⚠️ WARNING: Use Laps&apos; trick generator at your own risk. Always wear protective gear, check your environment, and only attempt tricks within your proven skill level. </ThemedText>
        </ThemedView>

      </SafeAreaView>
    </ImageBackground>
  );
}

const diceStyles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '120%',
  },
  mainContainer: {
    marginTop: "25%",
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 20,
    minHeight: 500,
  },


  // --- Mode Switch Styles ---
  modeSwitchContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: Theme.border,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.primary,
  },
  modeSwitchButton: {
    flex: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modeSwitchButtonDefault: {
    backgroundColor: Theme.cardBackground,
  },
  modeSwitchButtonSelected: {
    backgroundColor: Theme.primary,
  },
  modeSwitchTextDefault: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.primary,
  },
  modeSwitchTextSelected: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.cardBackground,
  },
  // --- End Mode Switch Styles ---
  card: {
    backgroundColor: Theme.cardBackground,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.primary,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
    paddingBottom: 5,
  },
  currentDifficulty: {
    fontSize: 16,
    color: Theme.darkText,
    marginBottom: 15,
  },
  difficultyButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  difficultyButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  difficultyButtonDefault: {
    backgroundColor: Theme.cardBackground,
    borderColor: Theme.primary,
  },
  difficultyButtonSelected: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  difficultyTextDefault: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.primary,
  },
  difficultyTextSelected: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.cardBackground,
  },
  generateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.success,
    borderRadius: 15,
    paddingVertical: 20,
    gap: 10,
    elevation: 6,
    shadowColor: Theme.darkText,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  generateButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.cardBackground,
    textTransform: 'uppercase', // Make it match the mode
  },
  trickDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.darkText,
    textAlign: 'center',
    paddingVertical: 15,
    minHeight: 60,
  },
  backButtonContainer: {
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backButtonText: {
    fontSize: 16,
    color: Theme.darkText,
    textDecorationLine: 'underline',
  },
  warningText: {
    fontSize: 12,
    color: Theme.warning,
    textAlign: 'center',
    marginTop: '5%',
  }
});