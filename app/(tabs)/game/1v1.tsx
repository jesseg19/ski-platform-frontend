import React, { useCallback } from 'react';
import { Alert, ImageBackground, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../auth/AuthContext';
import { useChallenge } from '../../context/ChallengeContext';
import { useGame } from '../../context/GameContext';

// Import the new components
import { CustomButton } from '@/components/CustomButton';
import { GameChallengeModal } from '@/components/GameChallengeModal';
import { GameRoundActions } from '@/components/GameRoundActions';
import { TrickCallModal } from '@/components/TrickCallModal';

import api from '@/auth/axios';
import { mainStyles } from '@/constants/AppStyles';




// --- CONSTANTS (Keep utility logic outside the component) ---
const GAME_LETTERS = ['S', 'K', 'I'];
const MAX_LETTERS = GAME_LETTERS.length;


const isLastTry = (currentLetters: number): boolean => currentLetters === MAX_LETTERS - 1;

// 1. Define the individual Player object structure
interface GamePlayer {
  userId: number;
  username: string;
  finalLetters: number;
  playerNumber: 1 | 2;
}

// 2. Define the individual Trick object structure (assuming this is correct)
interface GameTrick {
  turnNumber: number;
  setterId: number;
  receiverId: number;
  setterLanded: boolean;
  receiverLanded: boolean;
  trickDetails: string;
}

// 3. Define the main ActiveGameProps interface
interface ActiveGameProps {
  gameId: number;
  currentTurnUserId: number | null;
  totalTricks: number;
  players: GamePlayer[];
  tricks: GameTrick[];
  createdAt: string;
  lastActivityAt: string;
  status: string;
}

export default function GameScreen1v1() {
  const { resetGameKey, gameKey } = useGame();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeGame } = params;

  const {
    isConnected,
    sendChallenge,
    sentChallengeStatus,
    resetSentChallenge
  } = useChallenge();

  // 1. CONSOLIDATE PARAMETER PARSING
  let initialGameProps: ActiveGameProps | null = null;
  if (activeGame && typeof activeGame === 'string') {
    try {
      // Deserialize the JSON string back into an object
      initialGameProps = JSON.parse(activeGame) as ActiveGameProps;
      console.log('Active Game Loaded from Params:', initialGameProps.gameId);
    } catch (e) {
      console.error("Failed to parse active game data:", e);
    }
  }

  // --- STATE INITIALIZATION ---

  // Function to calculate initial state from props or set defaults
  const getInitialState = (props: ActiveGameProps | null) => {

    // const player1Data = initialGameProps?.players.find(p => p.playerNumber === 1);
    // let player2Data = initialGameProps?.players.find(p => p.playerNumber === 2);

    const currentUser = user;
    const currentUserUsername = currentUser?.username || 'Player 1';
    // Default values for a fresh game
    let p1Username = currentUserUsername;
    let p2Username = '';
    let p1User = null;
    let p2User = null;
    let whosSet = currentUserUsername; // Default starter for a fresh game
    let p1Letters = 0;
    let p2Letters = 0;
    let namesModalVisible = true;
    let calledTrick = 'Awaiting set call...';
    let currentMessage = 'Welcome to Ski Platform!';


    // console.log("challenger:", player1Data);
    // console.log("opponent:", player2Data);

    //  p1Username = player1Data?.username || 'Player 1';
    //  p2Username = player2Data?.username || 'Player 2';

    const whoStarts = () => Math.random() < 0.5 ? p1Username : p2Username;

    if (props && currentUser) {
      const userGameData = props.players.find(p => p.userId === currentUser.id);
      const opponentGameData = props.players.find(p => p.userId !== currentUser.id);

      if (userGameData && opponentGameData) {
        p1Username = userGameData.username;
        p2Username = opponentGameData.username;
        p1User = userGameData;
        p2User = opponentGameData; // The opponent is who p2User tracks
        p1Letters = userGameData.finalLetters;
        p2Letters = opponentGameData.finalLetters;
      }

      const lastTrick = props.tricks[props.tricks.length - 1];
      const initialWhosSet = lastTrick
        ? (lastTrick.setterId === currentUser.id ? p1Username : p2Username)
        : p1Username; // Assuming the current user (P1) starts if no tricks exist

      whosSet = initialWhosSet;
      namesModalVisible = false;
      calledTrick = 'Awaiting set call...';
      currentMessage = `Resumed game with ${p2Username}.`;

      return {
        gameId: props.gameId,
        p1Username,
        p1User,
        p2User,
        p2Username,
        whosSet,
        p1Letters,
        p2Letters,
        calledTrick,
        currentMessage,
        namesModalVisible,
        isChallengeActive: false,
      };
    }

    // Default state for a FRESH game (if props is null or user is null)
    return {
      gameId: -1,
      p1Username: currentUserUsername,
      p1User: null,
      p2User: null, // Initial P2 is null, set by the modal
      p2Username: '', // Set by the modal
      whosSet: whoStarts(), // This needs to be 'Player 1' or 'Player 2' string initially.
      p1Letters: 0,
      p2Letters: 0,
      calledTrick,
      currentMessage,
      namesModalVisible: true,
      isChallengeActive: false,
    };
  };

  // 2. USE THE INITIALIZER FUNCTION FOR ALL STATE VARIABLES
  const initialState = getInitialState(initialGameProps);

  // Initial state variables that are easier to destructure
  const [gameId, setGameId] = React.useState<-1 | number>(initialState.gameId);
  const [namesModalVisible, setNamesModalVisible] = React.useState(initialState.namesModalVisible);
  const [p1Username, setP1Username] = React.useState(initialState.p1Username);
  const [p1User, setP1User] = React.useState(initialState.p1User);
  const [p2User, setP2User] = React.useState(initialState.p2User);
  const [p2Username, setP2Username] = React.useState(initialState.p2Username);
  const [whosSet, setWhosSet] = React.useState(initialState.whosSet);
  const [p1Letters, setP1Letters] = React.useState(initialState.p1Letters);
  const [p2Letters, setP2Letters] = React.useState(initialState.p2Letters);
  const [calledTrick, setCalledTrick] = React.useState(initialState.calledTrick);
  const [currentMessage, setCurrentMessage] = React.useState(initialState.currentMessage);
  const [isChallengeActive, setIsChallengeActive] = React.useState(initialState.isChallengeActive);

  // ... all other state variables retain their original definitions
  const [setCallModalVisible, setSetCallModalVisible] = React.useState(false);
  const [p1Action, setP1Action] = React.useState<'land' | 'fail' | null>(null);
  const [p2Action, setP2Action] = React.useState<'land' | 'fail' | null>(null);
  const [lastTryPlayer, setLastTryPlayer] = React.useState<string | null>(null);
  const [gameStatus, setGameStatus] = React.useState<'playing' | 'gameOver'>('playing');
  const [pauseOrQuitModalVisible, setPauseOrQuitModalVisible] = React.useState(false);
  const [trickState, setTrickState] = React.useState({
    stance: null, spinDirection: null, numberOfFlips: null, axis: null, degreeOfRotation: null, grab: null
  });

  // --- UTILITY/API FUNCTIONS (Kept here as they rely heavily on component state) ---

  const handleBackToMenu = useCallback(() => {
    setPauseOrQuitModalVisible(true);

  }, [resetGameKey, router]);

  const handlePauseGame = () => {
    api.put(`/api/games/${gameId}/pause`);
    setPauseOrQuitModalVisible(false);
    resetGameKey();
    router.navigate('/(tabs)/game');
  };

  const handleQuitGame = () => {
    api.delete(`/api/games/${gameId}/cancel`);
    setPauseOrQuitModalVisible(false);
    resetGameKey();
    router.navigate('/(tabs)/game');
  };

  // const fetchGameDetails = useCallback(async (id: string) => {
  //   try {
  //     // ... (Your fetchGameDetails logic remains the same)
  //     const response = await api.get(`/api/games/${id}`);
  //     const game = response.data;

  //     const isP1Creator = game.creator.id === user?.id;
  //     const opponent = isP1Creator ? game.opponent : game.creator;

  //     setP2User({ userId: opponent.userId, username: opponent.username });
  //     setP2Username(opponent.username);
  //     setGameId(game.id);
  //     setWhosSet(game.currentSetterUsername || whoStarts());

  //     const myLetters = isP1Creator ? game.creatorLetters : game.opponentLetters;
  //     const opponentLetters = isP1Creator ? game.opponentLetters : game.creatorLetters;
  //     setP1Letters(myLetters);
  //     setP2Letters(opponentLetters);

  //     setCurrentMessage(`Resumed game with ${opponent.username}. ${game.currentTrick || 'Awaiting set call...'}`);
  //     setCalledTrick(game.currentTrick || 'Awaiting set call...');

  //   } catch (error) {
  //     console.error('Failed to fetch game details:', error);
  //     Alert.alert('Error', 'Could not load game details. Returning to menu.');
  //     handleBackToMenu();
  //   }
  // }, [user?.id, handleBackToMenu]);
  const otherPlayerName = whosSet === p1Username ? p2Username : p1Username;
  const isCurrentSetter = whosSet === p1Username;

  async function saveRound(gameId: number, setter: string, trick: string, setterLanded: boolean | null, receiverLanded: boolean, letterGivenTo: string | null) {
    try {
      const response = await api.post(`/api/games/${gameId}/resolveRound`, {
        setterUsername: setter,
        receiverUsername: otherPlayerName,
        trickDetails: trick,
        setterLanded: setterLanded,
        receiverLanded: receiverLanded,
        letterAssignToUsername: letterGivenTo,
      });
      console.log("Round outcome saved successfully!" + response.data);
    } catch (error) {
      console.error("Failed to save round outcome:", error);
      Alert.alert("Error", "Failed to save game progress. ");
    }
    if (letterGivenTo) {
      try {
        const playerToGiveLetter = letterGivenTo === p1Username ? p1User : letterGivenTo === p2Username ? p2User : null;
        let playerLetter = playerToGiveLetter === p1User ? p1Letters : p2Letters;
        if (playerToGiveLetter && playerToGiveLetter.finalLetters !== undefined) {
          await api.put(`/api/games/${gameId}/players/${playerToGiveLetter.userId}/letters?letterCount=${playerLetter + 1}`, {});
          console.log("playerToGiveLetter:", playerLetter);
        }
      } catch (error) {
        console.error("Failed to save letter to player:", error);
        Alert.alert("Error", "Failed to save letter to player.");
      }
    }
  }

  async function saveGameResult(gameId: number, winner: string, loser: string) {
    console.log("Saving game result:", gameId, winner, loser, winner === p1Username ? p1Letters : p2Letters, loser === p1Username ? p1Letters : p2Letters);
    try {
      const response = await api.post(`/api/games/${gameId}/end`, {
        winnerUsername: winner,
        loserUsername: loser,
        winnerFinalLetters: winner === p1Username ? p1Letters : p2Letters,
        loserFinalLetters: loser === p1Username ? p1Letters : p2Letters,
      });
      console.log("Game result saved successfully!" + response.data);
      router.navigate('/(tabs)/game');

    } catch (error) {
      console.error("Failed to save game result:", error);
      Alert.alert("Error", "Failed to save game result.");
    }
  }

  const resolveRound = useCallback(async (setterLanded: boolean, receiverLanded: boolean) => {
    // Stop all logic if the game is over or already in a special last-try state


    let playerWhoGotLetter: string | null = null;
    let newP1Letters = p1Letters;
    let newP2Letters = p2Letters;
    let newWhosSet = whosSet;
    const receiverName = whosSet === p1Username ? p2Username : p1Username;

    // ---  SCENARIO 1 & 4 (Both Land or Both Fail) ---
    if (setterLanded === receiverLanded) {
      if (!setterLanded) {
        newWhosSet = receiverName; // Set switches
      }
    }

    // --- SCENARIO 2 (Setter Lands, Receiver Fails) ---
    else if (setterLanded && !receiverLanded) {
      const receiverLetters = whosSet === p1Username ? p2Letters : p1Letters;
      if (!isLastTry(receiverLetters)) {
        playerWhoGotLetter = receiverName;
        if (receiverName === p1Username) newP1Letters++;
        else newP2Letters++;
      } else {
        // Last Try initiated, save logic is deferred until lastTry sequence is done
        setLastTryPlayer(receiverName);
        setCurrentMessage(`${receiverName} missed! They are on their last letter and get 2 attempts.`);
        // !!! IMPORTANT: Return/Stop here, don't save or update set until last try is resolved.
        return;
      }
    }

    // --- SCENARIO 3 (Setter Fails, Receiver Lands) ---
    else if (!setterLanded && receiverLanded) {
      const setterLetters = whosSet === p1Username ? p1Letters : p2Letters;
      if (!isLastTry(setterLetters)) {
        playerWhoGotLetter = whosSet;
        if (whosSet === p1Username) newP1Letters++;
        else newP2Letters++;
        newWhosSet = receiverName; // Set switches after letter assigned to setter
      } else {
        // Last Try initiated
        setLastTryPlayer(whosSet);
        setCurrentMessage(`${whosSet} fell! As the setter, they get a 2nd try.`);
        return;
      }
    }

    // --- Apply Frontend State Updates ---
    if (whosSet !== newWhosSet) setWhosSet(newWhosSet);
    if (newP1Letters !== p1Letters) setP1Letters(newP1Letters);
    if (newP2Letters !== p2Letters) setP2Letters(newP2Letters);

    // --- save the round ---

    saveRound(gameId, whosSet, calledTrick, setterLanded, receiverLanded, playerWhoGotLetter);


    // Clear the trick ID so the next round can start fresh
    if (lastTryPlayer !== null) {
      console.log("test", lastTryPlayer)
      setCalledTrick("Awaiting set call...");
    }
    setCalledTrick("Awaiting set call...");

  }, [p1Letters, p2Letters, whosSet, p1Username, p2Username, lastTryPlayer, gameId, calledTrick]);

  // The component responsible for handling the two final attempts
  const handleLastTryAction = async (action: 'land' | 'fail') => { // Make this async
    const playerOnLastTry = lastTryPlayer;
    if (!playerOnLastTry) return;

    const currentSetter = whosSet; // The setter for this entire trick
    const receiverName = currentSetter === p1Username ? p2Username : p1Username;

    // Determine who landed/failed for the saveRound function
    let setterLandedFinal: boolean | null = null;
    let receiverLandedFinal: boolean = action === 'land';
    const isSetterOnLastTry = playerOnLastTry === currentSetter;

    if (isSetterOnLastTry) {
      setterLandedFinal = action === 'land';
      receiverLandedFinal = true;
    } else {
      setterLandedFinal = true;
      receiverLandedFinal = action === 'land';
    }

    const trickToSave = `${calledTrick} (2nd Try)`;

    if (action === 'land') {
      await saveRound(gameId, currentSetter, trickToSave, setterLandedFinal, receiverLandedFinal, null);

      setLastTryPlayer(null);
      if (isSetterOnLastTry) {
        setWhosSet(receiverName);
      } else {
        setWhosSet(currentSetter);
      }
      setCurrentMessage(`${playerOnLastTry} survived the round! It's now ${whosSet}'s set.`);
      setCalledTrick("Awaiting set call...");

    } else {
      setGameStatus('gameOver');
      const winnerName = playerOnLastTry === p1Username ? p2Username : p1Username;

      // Player gets the final letter
      const letterGivenTo = playerOnLastTry;
      if (playerOnLastTry === p1Username) setP1Letters(MAX_LETTERS);
      if (playerOnLastTry === p2Username) setP2Letters(MAX_LETTERS);

      // Save the round with the final failed attempt and the letter assigned
      await saveRound(gameId, currentSetter, trickToSave, setterLandedFinal, receiverLandedFinal, letterGivenTo);

      setLastTryPlayer(null); // Clear last try state
      setCurrentMessage(`GAME OVER! ${winnerName} WINS!`);
      setCalledTrick("Awaiting set call..."); // Reset for new round
    }
  };


  // --- HANDLERS ---

  const handlePlayerAction = useCallback((player: string, action: 'land' | 'fail') => {
    if (player === p1Username) {
      setP1Action(action);
    } else {
      setP2Action(action);
    }
    if (action === 'fail' && lastTryPlayer === player) {
      setCurrentMessage(`${lastTryPlayer} missed! They are on their last letter and get 2 attempts.`);
    }
  }, [p1Username, lastTryPlayer]);

  const handleSaveGame = async () => {
    if (gameStatus === 'gameOver') {
      const winner = p1Letters === MAX_LETTERS ? p2Username : p1Username;
      const loser = p1Letters === MAX_LETTERS ? p1Username : p2Username;
      await saveGameResult(gameId, winner, loser);
    }
  }

  const handleTrickCall = useCallback((trickString: string) => {
    setCalledTrick(trickString);
    setSetCallModalVisible(false);
    setCurrentMessage(`${whosSet} called: ${trickString}`);
  }, [whosSet]);

  const handleChallengeStart = useCallback((opponentUsername: string) => {
    setP2Username(opponentUsername);
    setNamesModalVisible(false);
    setCurrentMessage(`Challenge sent to ${opponentUsername}. Waiting for acceptance...`);
    setIsChallengeActive(true);
  }, []);

  // --- EFFECTS ---

  React.useEffect(() => {
    // if (user) setP1Username(user.username);
    // const paramGameId = params.gameId as string;
    // if (paramGameId && !initialGameProps) {
    //   // fetchGameDetails(paramGameId);
    //   setNamesModalVisible(false);
    //   setIsChallengeActive(false);
    // }
    // Logic for handling resolved challenge status
    if (sentChallengeStatus) {
      if (sentChallengeStatus.status === 'ACCEPTED') {
        Alert.alert(
          'Challenge Accepted!',
          `Game with ${sentChallengeStatus.challenged?.username} has started!`,
          [{ text: "OK", onPress: () => resetSentChallenge() }]
        );
        // UNLOCK THE GAME: Set game ID from challenge response and stop waiting
        setGameId(sentChallengeStatus.game?.id || 0);
        setIsChallengeActive(false);
        setCurrentMessage(`${whosSet} must call the first trick.`);

      } else if (sentChallengeStatus.status === 'REJECTED') {
        Alert.alert(
          'Challenge Declined',
          `${sentChallengeStatus.challenged?.username} declined your challenge.`,
          [{
            text: "OK", onPress: () => {
              resetSentChallenge();
              handleBackToMenu(); // RETURN TO HOME/LOBBY
            }
          }]
        );
      }
    }
  }, [user, params.gameId, sentChallengeStatus, handleBackToMenu]);


  React.useEffect(() => {
    if (p1Action !== null && p2Action !== null) {
      const setterLanded = isCurrentSetter ? (p1Action === 'land') : (p2Action === 'land');
      const receiverLanded = isCurrentSetter ? (p2Action === 'land') : (p1Action === 'land');
      resolveRound(setterLanded, receiverLanded);
      setP1Action(null);
      setP2Action(null);
    }
  }, [p1Action, p2Action, isCurrentSetter, resolveRound]);

  // Set initial setter's name to the actual username
  React.useEffect(() => {
    if (p1Username && p2Username && namesModalVisible === false) {
      const starterName = whosSet === p1Username ? p1Username : p2Username;
      setWhosSet(starterName);
    }
  }, [namesModalVisible, p1Username, p2Username]);

  // Determine if the action buttons should be disabled for a player
  const getActionDisabled = useCallback((player: string) => {
    const action = player === p1Username ? p1Action : p2Action;
    const isAwaitingSet = calledTrick.trim() === 'Awaiting set call...';
    return (
      action !== null ||
      lastTryPlayer !== null ||
      gameStatus === 'gameOver' ||
      isAwaitingSet ||
      isChallengeActive
    );
  }, [p1Username, p1Action, p2Action, lastTryPlayer, gameStatus, calledTrick, isChallengeActive]);


  return (
    <ImageBackground
      source={require('@/assets/images/background.png')}
      style={mainStyles.backgroundImage}
      resizeMode="cover" // Or 'stretch', 'contain'
    >
      <ThemedView style={mainStyles.mainContainer}>
        {/* 1. Initial Challenge Modal */}
        <GameChallengeModal
          isVisible={namesModalVisible}
          onClose={() => setNamesModalVisible(false)}
          p1Username={p1Username}
          p2User={p2User || { userId: 0, username: '', finalLetters: 0, playerNumber: 2 }}
          setP2User={setP2User}
          onChallengeStart={handleChallengeStart}
          onBackToMenu={handleBackToMenu}
        />

        <ScrollView
          key={gameKey}
          contentContainerStyle={mainStyles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Game Status Header */}
          <ThemedView style={mainStyles.statusCard}>
            <ThemedText style={mainStyles.statusTitle}>
              <Text style={{ fontWeight: 'bold' }}>{whosSet}</Text>&apos;s Set
            </ThemedText>
            <TouchableOpacity
              style={[mainStyles.callSetButton]}
              onPress={() => setSetCallModalVisible(true)}
              disabled={isChallengeActive || calledTrick !== 'Awaiting set call...' || gameStatus === 'gameOver'}
            >
              <ThemedText style={mainStyles.callSetButtonText}>
                {isChallengeActive ? 'WAITING...' : (calledTrick === 'Awaiting set call...' ? 'CALL NEW TRICK' : 'TRICK SET')}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Trick Display */}
          <ThemedView style={mainStyles.trickDisplayCard}>
            <ThemedText style={mainStyles.trickLabel}>Current Trick:</ThemedText>
            <ThemedText style={mainStyles.trickValue}>{calledTrick}</ThemedText>
          </ThemedView>

          {/* Message Card */}
          <ThemedView style={mainStyles.messageCard}>
            <ThemedText style={mainStyles.messageText}>{currentMessage}</ThemedText>
          </ThemedView>

          {/* Player 1 Actions */}
          <GameRoundActions
            playerName={p1Username}
            lettersEarned={p1Letters}
            playerAction={p1Action}
            lastTryPlayer={lastTryPlayer}
            gameStatus={gameStatus}
            getActionDisabled={getActionDisabled}
            handlePlayerAction={handlePlayerAction}
            handleLastTryAction={handleLastTryAction}
          />

          {/* Player 2 Actions */}
          <GameRoundActions
            playerName={p2Username}
            lettersEarned={p2Letters}
            playerAction={p2Action}
            lastTryPlayer={lastTryPlayer}
            gameStatus={gameStatus}
            getActionDisabled={getActionDisabled}
            handlePlayerAction={handlePlayerAction}
            handleLastTryAction={handleLastTryAction}
          />

          {/* Save/Exit Button at the bottom */}
          {gameStatus === 'gameOver' && (
            <ThemedView style={mainStyles.gameOverCard}>
              <CustomButton title="FINISH & SAVE GAME RESULT" onPress={handleSaveGame} isPrimary={true} />
            </ThemedView>
          )}

          <View style={mainStyles.backButtonContainer}>
            <TouchableOpacity onPress={handleBackToMenu}>
              <ThemedText style={mainStyles.backButtonText}>Exit Game</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={pauseOrQuitModalVisible}
          onRequestClose={() => setPauseOrQuitModalVisible(false)}
        >
          <View style={mainStyles.modalOverlay}>
            <View style={mainStyles.modalContent}>
              <ThemedText style={mainStyles.modalTitle}>Pause or Quit</ThemedText>
              <ThemedText style={mainStyles.modalMessage}>Do you want to pause the game or quit?</ThemedText>
              <View style={mainStyles.modalButtons}>
                <CustomButton title="Pause" onPress={handlePauseGame} />
                <CustomButton title="Quit" onPress={handleQuitGame} />
              </View>
            </View>
          </View>
        </Modal>

        {/* 3. Call Trick Modal */}
        <TrickCallModal
          isVisible={setCallModalVisible}
          onClose={() => setSetCallModalVisible(false)}
          otherPlayerName={otherPlayerName}
          onTrickCall={handleTrickCall}
        />
      </ThemedView>
    </ImageBackground>
  );
}