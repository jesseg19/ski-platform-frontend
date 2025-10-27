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

// --- Difficulty Level Mapping (Replaces the Slider) ---
const DIFFICULTY_LEVELS = [
  { displayName: 'I', name: 'Beginner', maxDifficulty: 30, value: 1 },
  { displayName: 'II', name: 'Intermediate', maxDifficulty: 50, value: 2 },
  { displayName: 'III', name: 'Advanced', maxDifficulty: 75, value: 3 },
  { displayName: 'IV', name: 'Expert', maxDifficulty: 100, value: 4 },
  { displayName: 'V', name: 'Insane', maxDifficulty: 150, value: 5 }, // Increased max for insane combos
];

// --- TRICK GENERATION LOGIC (UNCHANGED) ---
// Note: Keeping your existing logic, but updating the generateTrick to use a single maxDifficulty boundary.

type Stance = "Forward" | "Switch";
// ... (omitting other type definitions for brevity, assuming they are in the original file) ...
// ... (omitting all TrickComponent[] definitions for brevity, assuming they are in the original file) ...

interface TrickComponent {
  name: string;
  difficulty: number;
}
// Using your original difficulty mappings:
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
  { name: "1260", difficulty: 35 },
  { name: "1440", difficulty: 50 },
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

function isValidTrick(trick: Trick): boolean {
  // Rule 1: cork/off-axis tricks usually need at least a 360 spin
  if ((trick.axis !== 'On Axis') && parseInt(trick.degreeOfRotation) < 360) {
    return false;
  }

  // Rule 2: can't do under double misty/bio 720
  if ((trick.axis === 'Bio' || trick.axis === 'Misty') && parseInt(trick.degreeOfRotation) < 720 && trick.numberOfFlips === "Double") {
    return false;
  }

  if (trick.numberOfFlips === "Double" && trick.axis === "On Axis") {
    return false;
  }
  return true;
}


function generateTrick(maxDifficulty: number): Trick {
  let selectedTrick: Trick;

  while (true) {
    // Randomly select components
    const stance = stanceOptions[Math.floor(Math.random() * stanceOptions.length)];
    const spinDirection = spinDirectionOptions[Math.floor(Math.random() * spinDirectionOptions.length)];
    const numberOfFlips = numberOfFlipsOptions[Math.floor(Math.random() * numberOfFlipsOptions.length)];
    const spinAmount = degreeOfRotationOptions[Math.floor(Math.random() * degreeOfRotationOptions.length)];
    const axes = axisOptions[Math.floor(Math.random() * axisOptions.length)];
    const grab = grabOptions[Math.floor(Math.random() * grabOptions.length)];

    let totalDifficulty = stance.difficulty + spinDirection.difficulty + numberOfFlips.difficulty + spinAmount.difficulty + axes.difficulty + grab.difficulty;

    // Check 1: Difficulty constraint (allow up to 5 points over for variety)
    if (totalDifficulty > maxDifficulty + 5) {
      continue;
    }

    selectedTrick = {
      stance: stance.name,
      spinDirection: spinDirection.name,
      numberOfFlips: numberOfFlips.name,
      grab: grab.name,
      degreeOfRotation: spinAmount.name,
      axis: axes.name
    };

    // Check 2: Validity constraint
    if (isValidTrick(selectedTrick)) {
      break;
    }
  }

  return selectedTrick;
}
// --- END TRICK GENERATION LOGIC ---

// --- HANDLER FOR BACK BUTTON ---
const handleBackToMenu = () => {
  router.replace('/(tabs)/game');
};


export default function TrickDiceScreen() {
  const [trickText, setTrickText] = useState('Press the dice to generate your challenge!');
  // State to hold the currently selected difficulty object
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTY_LEVELS[1]); // Default to Intermediate

  const handleGenerateTrick = useCallback(() => {
    const { maxDifficulty, name } = selectedDifficulty;

    const trick = generateTrick(maxDifficulty);

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

  }, [selectedDifficulty]);

  const handleSelectDifficulty = (levelValue: number) => {
    const newDifficulty = DIFFICULTY_LEVELS.find(d => d.value === levelValue);
    if (newDifficulty) {
      setSelectedDifficulty(newDifficulty);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.lightCard, dark: Colors.darkCard }}
      headerImage={
        <View style={diceStyles.headerContainer}>
          <Ionicons size={150} name="dice" color={Colors.white} style={diceStyles.diceIcon} />
        </View>
      }
    >
      <ThemedView style={diceStyles.mainContainer}>

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
                title={level.displayName} // Use S, I, A, E, I for concise buttons
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
            ROLL FOR A TRICK
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