import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons'; // Assuming you use Ionicons

// --- Define Colors for Consistency ---
const Colors = {
  greenButton: '#85E34A',
  darkBlue: '#406080',
  textGrey: '#555',
  darkText: '#333',
  white: '#FFFFFF',
  lightBlue: '#F0F8FF',
  inputBorder: '#D0E0F0',
  overlay: 'rgba(0, 0, 0, 0.4)',
  danger: '#E74C3C',
  success: '#85E34A',
  darkCard: '#1D3D47', // For the parallax header
  lightCard: '#A1CEDC', // For the parallax header
};

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
        <Ionicons name="dice-outline" size={20} color={selectedMode === 'jumps' ? Colors.white : Colors.darkBlue} />
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
        <Ionicons name="snow-outline" size={20} color={selectedMode === 'rails' ? Colors.white : Colors.darkBlue} />
        <ThemedText style={selectedMode === 'rails' ? diceStyles.modeSwitchTextSelected : diceStyles.modeSwitchTextDefault}>
          Rails
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};


// --- Difficulty Level Mapping  ---
const DIFFICULTY_LEVELS = [
  { displayName: 'I', name: 'Beginner', maxDifficulty: 20, minDifficulty: 0, value: 1 },
  { displayName: 'II', name: 'Intermediate', maxDifficulty: 50, minDifficulty: 21, value: 2 },
  { displayName: 'III', name: 'Advanced', maxDifficulty: 75, minDifficulty: 51, value: 3 },
  { displayName: 'IV', name: 'Expert', maxDifficulty: 100, minDifficulty: 76, value: 4 },
  { displayName: 'V', name: 'Insane', maxDifficulty: 250, minDifficulty: 101, value: 5 },
];

// --- Base Trick Component Interface ---
interface TrickComponent {
  name: string;
  difficulty: number;
}

// --- JUMP TRICK GENERATION LOGIC ---
// ... (omitting all TrickComponent[] definitions for JUMPS for brevity) ...
// ... (they are unchanged from your original file) ...
const stanceOptions: TrickComponent[] = [
  { name: "Forward", difficulty: 1 },
  { name: "Switch", difficulty: 5 },
];
const spinDirectionOptions: TrickComponent[] = [
  { name: "Natural", difficulty: 1 },
  { name: "Unnatural", difficulty: 5 },
];
const numberOfFlipsOptions: TrickComponent[] = [
  { name: "", difficulty: 1 },
  { name: "Double", difficulty: 50 },
];
const axisOptions: TrickComponent[] = [
  { name: "Bio", difficulty: 15 },
  { name: "Rodeo", difficulty: 12 },
  { name: "Cork", difficulty: 5 },
  { name: "Misty", difficulty: 7 },
  { name: "On Axis", difficulty: 1 },
];
const degreeOfRotationOptions: TrickComponent[] = [
  { name: "180", difficulty: 1 },
  { name: "360", difficulty: 2 },
  { name: "540", difficulty: 4 },
  { name: "720", difficulty: 7 },
  { name: "900", difficulty: 12 },
  { name: "1080", difficulty: 20 },
  { name: "1260", difficulty: 55 },
  { name: "1440", difficulty: 70 },
];
const grabOptions: TrickComponent[] = [
  { name: "Mute", difficulty: 1 },
  { name: "Safety", difficulty: 1 },
  { name: "Blunt", difficulty: 3 },
  { name: "Nose", difficulty: 4 },
  { name: "Stale", difficulty: 5 },
  { name: "Japan", difficulty: 6 },
  { name: "Critical", difficulty: 7 },
  { name: "Octo", difficulty: 8 },
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
  //can't flip on axis
  if (trick.numberOfFlips === "Double" && trick.axis === "On Axis") {
    return false;
  }
  // nothing under 180 for anything but cork or on axis
  if (trick.axis !== "On Axis" && trick.axis !== "Cork" && trick.degreeOfRotation <= "360") {
    return false;
  }
  // sw misty/bio can't be 540 or under
  if ((trick.axis === "Misty" || trick.axis === "Bio") && trick.stance === "Switch" && (trick.degreeOfRotation === "180" || trick.degreeOfRotation === "360" || trick.degreeOfRotation === "540")) {
    return false;
  }

  //level 1 restrictions
  if (selectedDifficulty === 1 && trick.axis !== "On Axis") {
    return false;
  }
  if (selectedDifficulty === 1 && parseInt(trick.degreeOfRotation) >= 900) {
    return false;
  }

  if (selectedDifficulty && (trick.axis === "Bio" || trick.axis === "Misty")) {
    return false;
  }

  if (selectedDifficulty < 4 && parseInt(trick.degreeOfRotation) >= 900) {
    return false;
  }

  if (selectedDifficulty < 4 && trick.spinDirection === "Switch" && trick.axis === "Cork" && parseInt(trick.degreeOfRotation) > 720) {
    return false;
  }
  if (selectedDifficulty < 5 && trick.numberOfFlips === "Double") {
    return false;
  }
  return true;
}


function generateTrick(maxDifficulty: number, minDifficulty: number, selectedDifficulty: number): Trick {
  let selectedTrick: Trick;
  while (true) {
    const stance = stanceOptions[Math.floor(Math.random() * stanceOptions.length)];
    const spinDirection = spinDirectionOptions[Math.floor(Math.random() * spinDirectionOptions.length)];
    const numberOfFlips = numberOfFlipsOptions[Math.floor(Math.random() * numberOfFlipsOptions.length)];
    const spinAmount = degreeOfRotationOptions[Math.floor(Math.random() * degreeOfRotationOptions.length)];
    const axes = axisOptions[Math.floor(Math.random() * axisOptions.length)];
    const grab = grabOptions[Math.floor(Math.random() * grabOptions.length)];
    if (spinDirection.name === "Unnatural" && axes.name !== "On Axis") {
      spinDirection.difficulty += 10;
    }
    let totalDifficulty = stance.difficulty + spinDirection.difficulty + numberOfFlips.difficulty + spinAmount.difficulty + axes.difficulty + grab.difficulty;
    if (totalDifficulty > maxDifficulty + 1 && totalDifficulty < minDifficulty - 2) {
      continue;
    }
    selectedTrick = {
      stance: stance.name,
      spinDirection: spinDirection.name,
      numberOfFlips: numberOfFlips.name,
      grab: grab.name,
      degreeOfRotation: spinAmount.name,
      axis: axes.name !== "On Axis" ? axes.name : "",
    };
    if (isValidTrick(selectedTrick, selectedDifficulty)) {
      break;
    }
  }
  return selectedTrick;
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
// const railFoot: TrickComponent[] = [
//   { name: 'Left Foot', difficulty: 1 }, // For no-spin-on
//   { name: 'Right Foot', difficulty: 1 },
// ];
const railTakeoff: TrickComponent[] = [
  { name: 'Regular', difficulty: 1 }, // (Implied, often omitted)
  { name: 'Lip', difficulty: 5 },
  // { name: 'Straddle', difficulty: 8 },
  { name: 'Tails', difficulty: 5 }, // Only for switch
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
  { name: 'Forward', difficulty: 1 }, // (Implied, often omitted)
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
  if (trick.stance.name === 'Switch') {
    parts.push('Switch');
  }
  if (trick.spinIn.name === 'Natural') {
    parts.push(trick.direction.name);
  } else {
    // parts.push(trick.foot.name);
  }
  if (trick.takeoff.name !== 'Regular') {
    if (trick.stance.name === 'Switch' && trick.takeoff.name === 'Tails') {
      parts.push('Tails');
    } else if (trick.stance.name === 'Forward' && trick.takeoff.name !== 'Tails') {
      parts.push(trick.takeoff.name);
    }
  }
  if (trick.spinIn.name !== '' || trick.takeoff.name !== 'Regular') {
    parts.push(trick.spinIn.name + ' On');
  }
  trick.swaps.forEach(swap => {
    parts.push(swap.name);
  });
  if (trick.spinOut.name === 'Forward' && trick.spinIn.name !== '180') {
    // Omit "Forward"
  } else if (trick.spinOut.name === 'Switch' && trick.spinIn.name === '180') {
    // Omit "Switch"
  } else {
    parts.push(trick.spinOut.name);
  }
  const trickString = parts.join(' ').replace(' On Back', ' Back').replace(' On Front', ' Front');
  return trickString.trim();
};




// --- HANDLER FOR BACK BUTTON ---
const handleBackToMenu = () => {
  router.replace('/(tabs)/game');
};


export default function TrickDiceScreen() {
  const [trickText, setTrickText] = useState('Press the dice to generate your challenge!');
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS[1]); // Default to Intermediate
  const [mode, setMode] = useState<Mode>('jumps'); // 'jumps' or 'rails'

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

  }, [selectedDifficulty, mode]); // Add mode to dependencies

  const handleSelectDifficulty = (levelValue: number) => {
    const newDifficulty = DIFFICULTY_LEVELS.find(d => d.value === levelValue);
    if (newDifficulty) {
      setSelectedDifficulty(newDifficulty);
    }
  };

  const handleSelectMode = (newMode: Mode) => {
    setMode(newMode);
    // Reset text when changing mode
    setTrickText(newMode === 'jumps' ? 'Roll for a Jump Trick' : 'Roll for a Rail Trick');
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.lightCard, dark: Colors.darkCard }}
      headerImage={
        <View style={diceStyles.headerContainer}>
          {/* --- Dynamic Header Icon --- */}
          <Ionicons
            size={150}
            name={mode === 'jumps' ? "dice" : "snow"}
            color={Colors.white}
            style={diceStyles.diceIcon}
          />
        </View>
      }
    >
      <ThemedView style={diceStyles.mainContainer}>

        {/* --- Mode Selector (Jumps/Rails) --- */}
        <ModeSwitch selectedMode={mode} onSelectMode={handleSelectMode} />

        {/* --- Difficulty Selector Card --- */}
        <ThemedView style={diceStyles.card}>
          <ThemedText type="subtitle" style={diceStyles.cardTitle}>Set Difficulty Level</ThemedText>
          <ThemedText style={diceStyles.currentDifficulty}>
            Current: <ThemedText type="defaultSemiBold">{selectedDifficulty.name}</ThemedText>
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
          <Ionicons name="dice-outline" size={28} color={Colors.white} />
        </TouchableOpacity>

        {/* --- Display Trick Card --- */}
        <ThemedView style={diceStyles.card}>
          <ThemedText type="subtitle" style={diceStyles.cardTitle}>Your Random Challenge</ThemedText>
          <ThemedText style={diceStyles.trickDisplay}>
            {trickText}
          </ThemedText>
        </ThemedView>

        {/* --- Back Button --- */}
        <ThemedView style={diceStyles.backButtonContainer}>
          <TouchableOpacity onPress={handleBackToMenu}>
            <ThemedText style={diceStyles.backButtonText}>Back to Main Menu</ThemedText>
          </TouchableOpacity>
        </ThemedView>

      </ThemedView>
    </ParallaxScrollView>
  );
}

const diceStyles = StyleSheet.create({
  mainContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 20,
    minHeight: 500,
  },
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkCard,
  },
  diceIcon: {
    opacity: 0.8,
  },
  // --- Mode Switch Styles ---
  modeSwitchContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: Colors.inputBorder,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.darkBlue,
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
    backgroundColor: Colors.white,
  },
  modeSwitchButtonSelected: {
    backgroundColor: Colors.darkBlue,
  },
  modeSwitchTextDefault: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkBlue,
  },
  modeSwitchTextSelected: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  // --- End Mode Switch Styles ---
  card: {
    backgroundColor: Colors.white,
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
    color: Colors.darkBlue,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
    paddingBottom: 5,
  },
  currentDifficulty: {
    fontSize: 16,
    color: Colors.textGrey,
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
    backgroundColor: Colors.white,
    borderColor: Colors.darkBlue,
  },
  difficultyButtonSelected: {
    backgroundColor: Colors.darkBlue,
    borderColor: Colors.darkBlue,
  },
  difficultyTextDefault: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkBlue,
  },
  difficultyTextSelected: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  generateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.greenButton,
    borderRadius: 15,
    paddingVertical: 20,
    gap: 10,
    elevation: 6,
    shadowColor: Colors.darkText,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  generateButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    textTransform: 'uppercase', // Make it match the mode
  },
  trickDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
    textAlign: 'center',
    paddingVertical: 15,
    minHeight: 60,
  },
  backButtonContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.textGrey,
    textDecorationLine: 'underline',
  }
});