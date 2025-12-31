import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ImageBackground, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Theme } from '@/constants/theme';
import { GRAB_LIST, JUMP_BASES, RAIL_BASES, RAIL_MODIFIERS } from '@/constants/tricks';
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
  { displayName: 'II', name: 'Advanced', maxDifficulty: 60, minDifficulty: 15, value: 2 },
  { displayName: 'III', name: 'Expert', maxDifficulty: 100, minDifficulty: 40, value: 3 },
  { displayName: 'IV', name: 'Insane', maxDifficulty: 250, minDifficulty: 60, value: 4 },
];


function generateTrick(maxDifficulty: number, minDifficulty: number, selectedDifficulty: number): string {
  const possibleBases = JUMP_BASES[selectedDifficulty];

  // 1. Pick a random base from the level
  const base = possibleBases[Math.floor(Math.random() * possibleBases.length)];

  // 2. Filter grabs based on base.allowedGrabs
  const filteredGrabs = GRAB_LIST.filter(g =>
    base.allowedGrabs === 'all' || base.allowedGrabs.includes(g.name)
  );

  // 3. Find a grab that keeps the trick within the min/max range
  // We try a few times to find a grab that fits the numeric range
  let finalGrab = filteredGrabs[Math.floor(Math.random() * filteredGrabs.length)];

  for (let i = 0; i < 20; i++) {
    const testGrab = filteredGrabs[Math.floor(Math.random() * filteredGrabs.length)];
    if (testGrab === undefined) continue;

    const total = base.baseDifficulty + testGrab.difficulty;
    console.log(`Testing grab ${testGrab.name} with total difficulty ${total}`);
    if (total >= minDifficulty && total <= maxDifficulty) {
      finalGrab = testGrab;
      break;
    }
  }
  console.log(`Selected grab: ${finalGrab.name} with difficulty ${base.baseDifficulty + finalGrab.difficulty}`);

  return `${base.name} ${finalGrab.name}`;
}

// --- END JUMP TRICK LOGIC ---

// --- ------------------- ---
// --- RAIL TRICK LOGIC    ---
// --- ------------------- ---

function generateRailTrick(selectedLevel: number, minDifficulty: number, maxDifficulty: number): string {
  const possibleBases = RAIL_BASES[selectedLevel] || RAIL_BASES[1];

  for (let i = 0; i < 30; i++) { // Increased iterations to find complex combos
    const base = possibleBases[Math.floor(Math.random() * possibleBases.length)];
    let currentDifficulty = base.baseDifficulty;
    let parts = [base.name === "Slide" ? "" : base.name];

    // --- Swaps Logic ---
    // Level 2: 60% chance of swap. Level 3+: 80% chance.
    const swapRoll = Math.random();
    const swapChance = selectedLevel === 2 ? 0.55 : selectedLevel >= 3 ? 0.7 : 0.3;

    if (base.allowSwaps && swapRoll < swapChance) {
      const availableSwaps = selectedLevel >= 3 ? RAIL_MODIFIERS.swaps : RAIL_MODIFIERS.swaps.slice(0, 2);

      // Roll for a second swap (Double Swap) for Level 3/4
      const isDoubleSwap = selectedLevel >= 3 && Math.random() > 0.6;

      if (isDoubleSwap) {
        const s1 = availableSwaps[Math.floor(Math.random() * availableSwaps.length)];
        if (s1.name.includes("360")) {
          parts.push(s1.name);
          currentDifficulty += (s1.difficulty);
        } else {
          const s2 = availableSwaps[Math.floor(Math.random() * availableSwaps.length)];
          parts.push(s1.name, s2.name);
          currentDifficulty += (s1.difficulty + s2.difficulty);
        }
      } else {
        const s1 = availableSwaps[Math.floor(Math.random() * availableSwaps.length)];
        parts.push(s1.name);
        currentDifficulty += s1.difficulty;
      }
    }

    // --- Exits Logic ---
    // Filter for exits that fit the remaining difficulty budget
    const exitOptions = RAIL_MODIFIERS.exits.filter(e => {
      const isCompatible = base.compatibleExits === 'all' || base.compatibleExits.includes(e.name);
      const withinBudget = (currentDifficulty + e.difficulty <= maxDifficulty);
      return isCompatible && withinBudget;
    });

    // For Level 2, try to force a "270 Out" if budget allows. For Level 3+, try for bigger exits. 
    let exit = exitOptions[Math.floor(Math.random() * exitOptions.length)];

    if (selectedLevel === 2) {
      const bigExit = exitOptions.find(e => e.name === "270 Out");
      if (bigExit && Math.random() > 0.4) exit = bigExit;
    }
    if (selectedLevel >= 3) {
      const massiveExit = exitOptions.find(e => e.name === "450 Out" || e.name === "Pretzel 450 Out");
      if (massiveExit && Math.random() > 0.35) exit = massiveExit;
    }

    if (exit && exit.name !== "Forward") {
      parts.push(exit.name);
      currentDifficulty += exit.difficulty;
    }

    // --- Range Check ---
    if (currentDifficulty >= minDifficulty && currentDifficulty <= maxDifficulty) {
      return parts.filter(p => p !== "").join(" ");
    }
  }

  return RAIL_BASES[selectedLevel][0].name;
}


// --- HANDLER FOR BACK BUTTON ---
const handleBackToMenu = () => {
  router.replace('/(tabs)/game');
};


export default function TrickDiceScreen() {
  const [trickText, setTrickText] = useState('Press the dice to generate your trick!');
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS[1]);
  const [mode, setMode] = useState<Mode>('jumps');

  const handleGenerateTrick = useCallback(() => {
    const { maxDifficulty, minDifficulty, value: difficultyValue } = selectedDifficulty;

    if (mode === 'jumps') {
      const trick = generateTrick(maxDifficulty, minDifficulty, difficultyValue);
      setTrickText(trick);
    } else {
      const railTrick = generateRailTrick(difficultyValue, minDifficulty, maxDifficulty);
      setTrickText(railTrick);
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
    marginTop: 10,
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
    textTransform: 'uppercase',
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