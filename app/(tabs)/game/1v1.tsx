import React, { useCallback } from 'react';
import { Alert, ImageBackground, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { CustomButton } from '@/components/CustomButton';
import { GameChallengeModal } from '@/components/GameChallengeModal';
import { GameRoundActions } from '@/components/GameRoundActions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrickCallModal } from '@/components/TrickCallModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../auth/AuthContext';
import { useGame } from '../../context/GameContext';
import { useChallenge } from '../../context/WebSocketProvider';

import api from '@/auth/axios';
import { mainStyles } from '@/constants/AppStyles';


// --- CONSTANTS (Keep utility logic outside the component) ---
const GAME_LETTERS = ['S', 'K', 'I'];
const MAX_LETTERS = GAME_LETTERS.length;

const isLastTry = (currentLetters: number): boolean => currentLetters === MAX_LETTERS - 1;

interface GamePlayer {
  userId: number;
  username: string;
  finalLetters: number;
  playerNumber: 1 | 2;
}

interface GameTrick {
  turnNumber: number;
  setterId: number;
  receiverId: number;
  setterLanded: boolean;
  receiverLanded: boolean;
  trickDetails: string;
}

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

export interface GameUpdateDto {
  gameId: number;
  currentTurnUserId: number | null;
  p1Letters: number;
  p2Letters: number;
  calledTrick: string;
  p1Action: 'land' | 'fail' | null;
  p2Action: 'land' | 'fail' | null;
  lastTryPlayer: string | null;
  gameStatus: 'playing' | 'gameOver';
  currentMessage: string;
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
    resetSentChallenge,
    subscribeToGame,
    publishPlayerAction,
    publishTrickCall,
    publishLastTry,
    playerActionMessage,
    trickCallMessage,
    letterUpdateMessage,
    roundResolvedMessage,
    lastTryMessage,
  } = useChallenge();

  // a ref to track if we've already processed this round
  const roundProcessedRef = React.useRef<string | null>(null);


  // --- PARSE INITIAL GAME PROPS FROM PARAMS ---
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

  const initialState = getInitialState(initialGameProps);

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

  const [setCallModalVisible, setSetCallModalVisible] = React.useState(false);
  const [p1Action, setP1Action] = React.useState<'land' | 'fail' | null>(null);
  const [p2Action, setP2Action] = React.useState<'land' | 'fail' | null>(null);
  const [lastTryPlayer, setLastTryPlayer] = React.useState<string | null>(null);
  const [gameStatus, setGameStatus] = React.useState<'playing' | 'gameOver'>('playing');
  const [pauseOrQuitModalVisible, setPauseOrQuitModalVisible] = React.useState(false);
  const [trickState, setTrickState] = React.useState({
    stance: null, spinDirection: null, numberOfFlips: null, axis: null, degreeOfRotation: null, grab: null
  });

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
    // Create a unique key for this round to prevent duplicate processing
    const roundKey = `${gameId}-${calledTrick}-${setterLanded}-${receiverLanded}`;

    // Check if we've already processed this round
    if (roundProcessedRef.current === roundKey) {
      console.log('Round already processed, skipping...');
      return;
    }

    // Mark this round as processed
    roundProcessedRef.current = roundKey;

    let playerWhoGotLetter: string | null = null;
    const receiverName = whosSet === p1Username ? p2Username : p1Username;

    // ---  SCENARIO 1 & 4 (Both Land or Both Fail) ---
    if (setterLanded === receiverLanded) {
      // Both succeeded or both failed - no letter given
      playerWhoGotLetter = null;

      // Save the round immediately
      await saveRound(gameId, whosSet, calledTrick, setterLanded, receiverLanded, playerWhoGotLetter);

      // Backend will broadcast RoundResolvedMessage to both devices
      return;
    }

    // --- SCENARIO 2 (Setter Lands, Receiver Fails) ---
    else if (setterLanded && !receiverLanded) {
      const receiverLetters = whosSet === p1Username ? p2Letters : p1Letters;

      if (!isLastTry(receiverLetters)) {
        // Receiver gets a letter
        playerWhoGotLetter = receiverName;
        await saveRound(gameId, whosSet, calledTrick, setterLanded, receiverLanded, playerWhoGotLetter);
      } else {
        // Last Try initiated for receiver
        setLastTryPlayer(receiverName);
        const lastTryMsg = `${receiverName} missed! They are on their last letter and get 2 attempts.`;
        setCurrentMessage(lastTryMsg);

        // Broadcast last try state to both devices
        publishLastTry(gameId, receiverName, lastTryMsg);
        return; // Don't save yet, wait for last try
      }
    }

    // --- SCENARIO 3 (Setter Fails, Receiver Lands) ---
    else if (!setterLanded && receiverLanded) {
      const setterLetters = whosSet === p1Username ? p1Letters : p2Letters;

      if (!isLastTry(setterLetters)) {
        // Setter gets a letter
        playerWhoGotLetter = whosSet;
        await saveRound(gameId, whosSet, calledTrick, setterLanded, receiverLanded, playerWhoGotLetter);
      } else {
        // Last Try initiated for setter
        setLastTryPlayer(whosSet);
        const lastTryMsg = `${whosSet} fell! As the setter, they get a 2nd try.`;
        setCurrentMessage(lastTryMsg);

        // Broadcast last try state to both devices
        publishLastTry(gameId, whosSet, lastTryMsg);
        return; // Don't save yet, wait for last try
      }
    }
  }, [p1Letters, p2Letters, whosSet, p1Username, p2Username, gameId, calledTrick, publishLastTry]);



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

  const handlePlayerAction = useCallback((player: GamePlayer, action: 'land' | 'fail') => {
    // Update local state immediately for responsive UI
    if (player.username === p1Username) {
      setP1Action(action);
    } else {
      setP2Action(action);
    }

    // Publish action via WebSocket
    if (gameId > 0 && user) {
      publishPlayerAction(gameId, user.id, action);
    }

    if (action === 'fail' && lastTryPlayer === player.username) {
      setCurrentMessage(`${lastTryPlayer} missed! They are on their last letter and get 2 attempts.`);
    }
  }, [p1Username, lastTryPlayer, gameId, user, publishPlayerAction]);

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

    // Publish trick call via WebSocket instead of just local state
    if (gameId > 0) {
      publishTrickCall(gameId, whosSet, trickString);
    }
  }, [whosSet, gameId, publishTrickCall]);

  const handleChallengeStart = useCallback((opponentUsername: string) => {
    setP2Username(opponentUsername);
    setNamesModalVisible(false);
    setCurrentMessage(`Challenge sent to ${opponentUsername}. Waiting for acceptance...`);
    setIsChallengeActive(true);
  }, []);

  // --- EFFECTS ---

  React.useEffect(() => {
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
    if (gameId > 0) {
      console.log('Subscribing to game:', gameId);
      const unsubscribe = subscribeToGame(gameId);
      return unsubscribe;
    }
  }, [gameId, subscribeToGame]);

  React.useEffect(() => {
    if (p1Action !== null && p2Action !== null) {
      const setterLanded = isCurrentSetter ? (p1Action === 'land') : (p2Action === 'land');
      const receiverLanded = isCurrentSetter ? (p2Action === 'land') : (p1Action === 'land');
      resolveRound(setterLanded, receiverLanded);
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

  React.useEffect(() => {
    if (trickCallMessage && trickCallMessage.gameId === gameId) {
      console.log('Received trick call via WebSocket:', trickCallMessage);

      setCalledTrick(trickCallMessage.trickDetails);
      setCurrentMessage(`${trickCallMessage.setterUsername} called: ${trickCallMessage.trickDetails}`);

      // Update whose set it is based on the setter
      if (trickCallMessage.setterUsername !== whosSet) {
        setWhosSet(trickCallMessage.setterUsername);
      }
    }
  }, [trickCallMessage, gameId, whosSet]);

  React.useEffect(() => {
    if (lastTryMessage && lastTryMessage.gameId === gameId) {
      console.log('Received last try message via WebSocket:', lastTryMessage);

      setLastTryPlayer(lastTryMessage.playerOnLastTry);
      setCurrentMessage(lastTryMessage.message);
    }
  }, [lastTryMessage, gameId]);

  // Effect to handle incoming player actions via WebSocket
  React.useEffect(() => {
    if (playerActionMessage && playerActionMessage.gameId === gameId) {
      console.log('Received player action via WebSocket:', playerActionMessage);

      // Determine which player acted based on userId
      const actingPlayer = playerActionMessage.userId === p1User?.userId ? p1Username : p2Username;

      // Update the appropriate action state
      if (actingPlayer === p1Username) {
        setP1Action(playerActionMessage.action);
      } else {
        setP2Action(playerActionMessage.action);
      }

      // Handle last try messaging
      if (playerActionMessage.action === 'fail' && lastTryPlayer === actingPlayer) {
        setCurrentMessage(`${lastTryPlayer} missed! They are on their last letter and get 2 attempts.`);
      }
    }
  }, [playerActionMessage, gameId, p1User, p2User, p1Username, p2Username, lastTryPlayer]);

  React.useEffect(() => {
    if (letterUpdateMessage && letterUpdateMessage.gameId === gameId) {
      console.log('Received letter update via WebSocket:', letterUpdateMessage);

      // Update the appropriate player's letter count
      if (letterUpdateMessage.username === p1Username) {
        setP1Letters(letterUpdateMessage.newLetterCount);
        console.log(`Updated ${p1Username} letters to ${letterUpdateMessage.newLetterCount}`);
      } else if (letterUpdateMessage.username === p2Username) {
        setP2Letters(letterUpdateMessage.newLetterCount);
        console.log(`Updated ${p2Username} letters to ${letterUpdateMessage.newLetterCount}`);
      }
    }
  }, [letterUpdateMessage, gameId, p1Username, p2Username]);

  React.useEffect(() => {
    if (roundResolvedMessage && roundResolvedMessage.gameId === gameId) {
      console.log('Received round resolution via WebSocket:', roundResolvedMessage);

      // Reset the round processed flag for the next round
      roundProcessedRef.current = null;

      // Reset trick and actions after round resolves
      setCalledTrick("Awaiting set call...");
      setP1Action(null);
      setP2Action(null);

      const { setterLanded, receiverLanded, setterUsername, receiverUsername } = roundResolvedMessage;

      if (setterLanded === receiverLanded) {
        // Both land or both fail
        if (!setterLanded) {
          // Both fail - set switches to receiver
          setWhosSet(receiverUsername);
          setCurrentMessage(`Both players missed. ${receiverUsername}'s set now.`);
        } else {
          // Both land - setter keeps the set
          setWhosSet(setterUsername); // Make sure setter keeps it
          setCurrentMessage(`Both players landed! ${setterUsername} keeps the set.`);
        }
      } else if (setterLanded && !receiverLanded) {
        // Setter lands, receiver fails - setter keeps set
        setWhosSet(setterUsername);
        setCurrentMessage(`${setterUsername} landed it! ${setterUsername} keeps the set.`);
      } else if (!setterLanded && receiverLanded) {
        // Setter fails, receiver lands - set switches
        setWhosSet(receiverUsername);
        setCurrentMessage(`${setterUsername} fell but ${receiverUsername} landed it. ${receiverUsername}'s set now.`);
      }
    }
  }, [roundResolvedMessage, gameId]);



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
          onBackToMenu={() => router.navigate('/(tabs)/game')}
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
            player={p1User || { userId: 0, username: p1Username, finalLetters: p1Letters, playerNumber: 1 }}
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
            player={p2User || { userId: 0, username: p2Username, finalLetters: p2Letters, playerNumber: 2 }}
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