import NetInfo from '@react-native-community/netinfo';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { gameSyncService } from '../../services/GameSyncService';
import { localGameDB } from '../../services/LocalGameDatabase';

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

export default function GameScreen1v1() {
  const { resetGameKey, gameKey } = useGame();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeGame } = params;
  const { modalVisible } = params;

  const {
    isConnected,
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

  // Connection state
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Critical refs to prevent race conditions
  const isProcessingRound = useRef(false);
  const currentRoundNumber = useRef<number>(1);
  const lastProcessedRoundKey = useRef<string | null>(null);
  const actionDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse initial game props
  let initialGameProps: ActiveGameProps | null = null;
  if (activeGame && typeof activeGame === 'string') {
    try {
      initialGameProps = JSON.parse(activeGame) as ActiveGameProps;
      console.log('Active Game Loaded from Params:', initialGameProps.gameId);
    } catch (e) {
      console.error("Failed to parse active game data:", e);
    }
  }

  // State initialization function
  const getInitialState = (props: ActiveGameProps | null) => {
    const currentUser = user;
    const currentUserUsername = currentUser?.username || 'Player 1';

    let p1Username = currentUserUsername;
    let p2Username = '';
    let p1User = null;
    let p2User = null;
    let whosSet = currentUserUsername;
    let p1Letters = 0;
    let p2Letters = 0;
    let namesModalVisible = true;
    let calledTrick = 'Awaiting set call...';
    let currentMessage = 'Welcome to Ski Platform!';

    if (props && currentUser) {
      const userGameData = props.players.find(p => p.userId === currentUser.id);
      const opponentGameData = props.players.find(p => p.userId !== currentUser.id);

      if (userGameData && opponentGameData) {
        p1Username = userGameData.username;
        p2Username = opponentGameData.username;
        p1User = userGameData;
        p2User = opponentGameData;
        p1Letters = userGameData.finalLetters;
        p2Letters = opponentGameData.finalLetters;
      }

      const lastTrick = props.tricks[props.tricks.length - 1];
      const initialWhosSet = lastTrick
        ? (lastTrick.setterId === currentUser.id ? p1Username : p2Username)
        : p1Username;

      whosSet = initialWhosSet;
      namesModalVisible = false;
      calledTrick = 'Awaiting set call...';
      currentMessage = `Resumed game with ${p2Username}.`;

      // Set current round number
      currentRoundNumber.current = props.tricks.length + 1;

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

    return {
      gameId: -1,
      p1Username: currentUserUsername,
      p1User: null,
      p2User: null,
      p2Username: '',
      whosSet: currentUserUsername,
      p1Letters: 0,
      p2Letters: 0,
      calledTrick,
      currentMessage,
      namesModalVisible: true,
      isChallengeActive: false,
    };
  };

  const initialState = getInitialState(initialGameProps);

  console.log('Initial Game State:', initialState);
  // State declarations
  const [gameId, setGameId] = useState<-1 | number>(initialState.gameId);
  const [namesModalVisible, setNamesModalVisible] = useState(() => {
    // If the 'modalVisible' param is "false", (e.g., from accepting a challenge)
    //    DO NOT show the modal.
    if (modalVisible === "false") {
      return false;
    }

    // If we are loading an existing game (initialGameProps exists)
    //    and the param wasn't set, STILL don't show the modal.
    if (initialGameProps) {
      return false;
    }

    // Otherwise, it must be a brand new game, so show the modal.
    return true;
  });
  const [p1Username, setP1Username] = useState(initialState.p1Username);
  const [p1User, setP1User] = useState(initialState.p1User);
  const [p2User, setP2User] = useState(initialState.p2User);
  const [p2Username, setP2Username] = useState(initialState.p2Username);
  const [whosSet, setWhosSet] = useState(initialState.whosSet);
  const [p1Letters, setP1Letters] = useState(initialState.p1Letters);
  const [p2Letters, setP2Letters] = useState(initialState.p2Letters);
  const [calledTrick, setCalledTrick] = useState(initialState.calledTrick);
  const [currentMessage, setCurrentMessage] = useState(initialState.currentMessage);
  const [isChallengeActive, setIsChallengeActive] = useState(initialState.isChallengeActive);

  const [setCallModalVisible, setSetCallModalVisible] = useState(false);
  const [p1Action, setP1Action] = useState<'land' | 'fail' | null>(null);
  const [p2Action, setP2Action] = useState<'land' | 'fail' | null>(null);
  const [lastTryPlayer, setLastTryPlayer] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'gameOver'>('playing');
  const [pauseOrQuitModalVisible, setPauseOrQuitModalVisible] = useState(false);

  const otherPlayerName = whosSet === p1Username ? p2Username : p1Username;
  const isCurrentSetter = whosSet === p1Username;



  // ==================== NETWORK MONITORING ====================

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected || false;
      setIsOnline(online);

      // Only sync if we have pending actions and just came back online
      if (online && gameId > 0 && !syncInProgress) {
        // Delay sync to avoid race conditions
        setTimeout(() => {
          syncGameState();
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // ==================== LOCAL STORAGE & SYNC ====================

  const saveLocalGameState = useCallback(async () => {
    if (gameId <= 0) return;

    try {
      await localGameDB.saveGameState({
        gameId,
        p1Username,
        p2Username,
        p1UserId: p1User?.userId || 0,
        p2UserId: p2User?.userId || 0,
        p1Letters,
        p2Letters,
        whosSet,
        calledTrick,
        currentMessage,
        lastSyncedAt: Date.now(),
        isDirty: !isOnline,
      });
    } catch (error) {
      console.error('Failed to save local state:', error);
    }
  }, [gameId, p1Username, p2Username, p1User, p2User, p1Letters, p2Letters, whosSet, calledTrick, currentMessage, isOnline]);

  const syncGameState = useCallback(async () => {
    if (gameId <= 0 || !user || syncInProgress) return;

    setSyncInProgress(true);
    try {
      const result = await gameSyncService.syncGame(gameId, user.username);

      if (result.success && result.syncedActions > 0) {
        setLastSyncTime(new Date());

        // Only show alert if there were actual conflicts (not just normal syncs)
        if (result.conflicts && result.conflicts.length > 0) {
          Alert.alert(
            'Game Synced',
            `Your game was synced. ${result.conflicts.length} conflict(s) resolved.`,
            [{ text: 'OK' }]
          );
        }

        // Reload state from server
        const response = await api.get(`/api/games/${gameId}`);
        const serverState = response.data;

        // Update local state with server data
        const p1 = serverState.players.find((p: any) => p.username === p1Username);
        const p2 = serverState.players.find((p: any) => p.username === p2Username);

        if (p1) setP1Letters(p1.finalLetters);
        if (p2) setP2Letters(p2.finalLetters);

        currentRoundNumber.current = serverState.tricks.length + 1;
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [gameId, user, syncInProgress, p1Username, p2Username]);

  // Debounced save state
  useEffect(() => {
    const timer = setTimeout(() => {
      saveLocalGameState();
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timer);
  }, [p1Letters, p2Letters, whosSet, calledTrick, currentMessage]);

  // ==================== GAME LOGIC ====================

  const saveRound = useCallback(async (
    gameId: number,
    setter: string,
    trick: string,
    setterLanded: boolean | null,
    receiverLanded: boolean,
    letterGivenTo: string | null
  ) => {
    const receiverName = setter === p1Username ? p2Username : p1Username;
    const roundNumToSave = currentRoundNumber.current; // Capture round number at start

    // --- Helper function to save action locally ---
    const saveLocally = async (reason: string) => {
      console.log(`Round ${roundNumToSave} saving locally (${reason})`);
      try {
        await gameSyncService.saveActionLocally(
          gameId,
          roundNumToSave,
          setter,
          receiverName,
          trick,
          setterLanded,
          receiverLanded,
          letterGivenTo,
          user?.username || p1Username
        );
      } catch (error) {
        console.error("Failed to save action locally:", error);
      }
    };

    // --- Main Save Logic ---
    try {
      if (isOnline) {
        // --- ONLINE PATH ---
        try {
          // 1. Try to sync to server
          await api.post(`/api/games/${gameId}/resolveRound`, {
            setterUsername: setter,
            receiverUsername: receiverName,
            trickDetails: trick,
            setterLanded: setterLanded,
            receiverLanded: receiverLanded,
            letterAssignToUsername: letterGivenTo,
            inputByUsername: user?.username || p1Username,
            clientTimestamp: Date.now(),
          });
          console.log(`Round ${roundNumToSave} synced to server successfully.`);

          // DO NOT save locally here. The server has it.
          // This prevents the sync conflict alert.

        } catch (error: any) {
          // 2. Server sync FAILED (network drop, 500 error, etc.)
          // Save locally as a fallback.
          console.error(`Failed to sync round ${roundNumToSave} to server, saving locally:`, error);
          await saveLocally("server sync failed");
        }
      } else {
        // --- OFFLINE PATH ---
        await saveLocally("user is offline");
      }

      // --- COMMON LOGIC (Update UI/State) ---

      // Increment round number *after* successful processing
      currentRoundNumber.current += 1;

      // Optimistically update letter count in the UI.
      // We removed the redundant `api.put` call. The server-side 
      // `resolveRound` endpoint should be the source of truth for 
      // letter updates, which will be broadcast via WebSocket.
      if (letterGivenTo) {
        const playerToGiveLetter = letterGivenTo === p1Username ? p1User : letterGivenTo === p2Username ? p2User : null;
        const playerLetter = playerToGiveLetter === p1User ? p1Letters : p2Letters;

        if (playerToGiveLetter) {
          const newLetterCount = playerLetter + 1;

          // Update local UI state
          if (letterGivenTo === p1Username) {
            setP1Letters(newLetterCount);
          } else {
            setP2Letters(newLetterCount);
          }
        }
      }

    } catch (error) {
      console.error(`Failed to save round ${roundNumToSave}:`, error);
      Alert.alert("Error", "Failed to save game progress.");
    }
  }, [gameId, p1Username, p2Username, p1User, p2User, p1Letters, p2Letters, user, isOnline]);

  const resolveRound = useCallback(async (setterLanded: boolean, receiverLanded: boolean) => {
    // Prevent duplicate processing
    const roundKey = `${gameId}-${currentRoundNumber.current}-${calledTrick}-${setterLanded}-${receiverLanded}`;

    if (isProcessingRound.current || roundKey === lastProcessedRoundKey.current) {
      console.log('Round already being processed or already processed, skipping...');
      return;
    }

    isProcessingRound.current = true;
    lastProcessedRoundKey.current = roundKey;

    try {
      let playerWhoGotLetter: string | null = null;
      const receiverName = whosSet === p1Username ? p2Username : p1Username;
      const currentTrick = calledTrick;

      // Reset UI immediately to prevent double-clicks
      setP1Action(null);
      setP2Action(null);

      // Both land or both fail
      if (setterLanded === receiverLanded) {
        playerWhoGotLetter = null;
        await saveRound(gameId, whosSet, currentTrick, setterLanded, receiverLanded, playerWhoGotLetter);

        // Update UI based on outcome
        if (!setterLanded) {
          setWhosSet(receiverName);
          setCurrentMessage(`Both players missed. ${receiverName}'s set now.`);
        } else {
          setCurrentMessage(`Both players landed! ${whosSet} keeps the set.`);
        }
        setCalledTrick("Awaiting set call...");
      }
      // Setter lands, receiver fails
      else if (setterLanded && !receiverLanded) {
        const receiverLetters = whosSet === p1Username ? p2Letters : p1Letters;

        if (!isLastTry(receiverLetters)) {
          playerWhoGotLetter = receiverName;
          await saveRound(gameId, whosSet, currentTrick, setterLanded, receiverLanded, playerWhoGotLetter);
          setCurrentMessage(`${whosSet} landed it! ${whosSet} keeps the set.`);
          setCalledTrick("Awaiting set call...");
        } else {
          setLastTryPlayer(receiverName);
          const lastTryMsg = `${receiverName} missed! They are on their last letter and get 2 attempts.`;
          setCurrentMessage(lastTryMsg);
          if (isOnline) {
            publishLastTry(gameId, receiverName, lastTryMsg);
          }
          // Don't reset trick yet - they need to see what they're attempting
          return;
        }
      }
      // Setter fails, receiver lands
      else if (!setterLanded && receiverLanded) {
        const setterLetters = whosSet === p1Username ? p1Letters : p2Letters;

        if (!isLastTry(setterLetters)) {
          playerWhoGotLetter = whosSet;
          await saveRound(gameId, whosSet, currentTrick, setterLanded, receiverLanded, playerWhoGotLetter);
          setWhosSet(receiverName);
          setCurrentMessage(`${whosSet} fell but ${receiverName} landed it. ${receiverName}'s set now.`);
          setCalledTrick("Awaiting set call...");
        } else {
          setLastTryPlayer(whosSet);
          const lastTryMsg = `${whosSet} fell! As the setter, they get a 2nd try.`;
          setCurrentMessage(lastTryMsg);
          if (isOnline) {
            publishLastTry(gameId, whosSet, lastTryMsg);
          }
          // Don't reset trick yet
          return;
        }
      }
    } finally {
      {
        isProcessingRound.current = false;
      };
    }
  }, [p1Letters, p2Letters, whosSet, p1Username, p2Username, gameId, calledTrick, publishLastTry, saveRound, isOnline]);

  const handleLastTryAction = async (action: 'land' | 'fail') => {
    const playerOnLastTry = lastTryPlayer;
    if (!playerOnLastTry || isProcessingRound.current) return;

    isProcessingRound.current = true;

    try {
      const currentSetter = whosSet;
      const receiverName = currentSetter === p1Username ? p2Username : p1Username;

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
        const newSetter = isSetterOnLastTry ? receiverName : currentSetter;
        setWhosSet(newSetter);
        setCurrentMessage(`${playerOnLastTry} survived! ${newSetter}'s set now.`);
        setCalledTrick("Awaiting set call...");
      } else {
        setGameStatus('gameOver');
        const winnerName = playerOnLastTry === p1Username ? p2Username : p1Username;
        const letterGivenTo = playerOnLastTry;

        if (playerOnLastTry === p1Username) setP1Letters(MAX_LETTERS);
        if (playerOnLastTry === p2Username) setP2Letters(MAX_LETTERS);

        await saveRound(gameId, currentSetter, trickToSave, setterLandedFinal, receiverLandedFinal, letterGivenTo);

        setLastTryPlayer(null);
        setCurrentMessage(`GAME OVER! ${winnerName} WINS!`);
        setCalledTrick("Game Over");
      }
    } finally {
      isProcessingRound.current = false;
    }
  };

  // ==================== HANDLERS ====================

  const handlePlayerAction = useCallback((player: GamePlayer, action: 'land' | 'fail') => {
    // Debounce to prevent double-clicks
    if (actionDebounceTimer.current) {
      clearTimeout(actionDebounceTimer.current);
    }

    actionDebounceTimer.current = setTimeout(() => {
      if (player.username === p1Username) {
        setP1Action(prev => prev === null ? action : prev);
      } else {
        setP2Action(prev => prev === null ? action : prev);
      }

      // Publish via WebSocket if online
      if (gameId > 0 && user && isOnline) {
        publishPlayerAction(gameId, user.id, action);
      }
    }, 300); // 300ms debounce
  }, [p1Username, gameId, user, publishPlayerAction, isOnline]);

  const handleSaveGame = async () => {
    if (gameStatus === 'gameOver') {
      const winner = p1Letters === MAX_LETTERS ? p2Username : p1Username;
      const loser = p1Letters === MAX_LETTERS ? p1Username : p2Username;

      try {
        await api.post(`/api/games/${gameId}/end`, {
          winnerUsername: winner,
          loserUsername: loser,
          winnerFinalLetters: winner === p1Username ? p1Letters : p2Letters,
          loserFinalLetters: loser === p1Username ? p1Letters : p2Letters,
        });

        await localGameDB.clearGameData(gameId);
        router.navigate('/(tabs)/game');
      } catch (error) {
        console.error("Failed to save game result:", error);
        Alert.alert("Error", "Failed to save game result.");
      }
    }
  };

  const handleTrickCall = useCallback((trickString: string) => {
    setCalledTrick(trickString);
    setSetCallModalVisible(false);
    setCurrentMessage(`${whosSet} called: ${trickString}`);

    if (gameId > 0 && isOnline) {
      publishTrickCall(gameId, whosSet, trickString);
    }
  }, [whosSet, gameId, publishTrickCall, isOnline]);

  const handleChallengeStart = useCallback((opponentUsername: string) => {
    setP2Username(opponentUsername);
    setNamesModalVisible(false);
    setCurrentMessage(`Challenge sent to ${opponentUsername}. Waiting for acceptance...`);
    setIsChallengeActive(true);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setPauseOrQuitModalVisible(true);
  }, []);

  const handlePauseGame = async () => {
    try {
      await api.put(`/api/games/${gameId}/pause`);
      setPauseOrQuitModalVisible(false);
      resetGameKey();
      router.navigate('/(tabs)/game');
    } catch (error) {
      console.error("Failed to pause game:", error);
    }
  };

  const handleQuitGame = async () => {
    try {
      await api.delete(`/api/games/${gameId}/cancel`);
      await localGameDB.clearGameData(gameId);
      setPauseOrQuitModalVisible(false);
      resetGameKey();
      router.navigate('/(tabs)/game');
    } catch (error) {
      console.error("Failed to quit game:", error);
    }
  };

  const getActionDisabled = useCallback((player: string) => {
    const action = player === p1Username ? p1Action : p2Action;
    const isAwaitingSet = calledTrick.trim() === 'Awaiting set call...';
    return (
      action !== null ||
      lastTryPlayer !== null ||
      gameStatus === 'gameOver' ||
      isAwaitingSet ||
      isChallengeActive ||
      isProcessingRound.current
    );
  }, [p1Username, p1Action, p2Action, lastTryPlayer, gameStatus, calledTrick, isChallengeActive]);

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (gameId > 0 && isOnline) {
      console.log('Subscribing to game:', gameId);
      const unsubscribe = subscribeToGame(gameId);
      return unsubscribe;
    }
  }, [gameId, subscribeToGame, isOnline]);

  useEffect(() => {
    if (p1Action !== null && p2Action !== null && !isProcessingRound.current) {
      const setterLanded = isCurrentSetter ? (p1Action === 'land') : (p2Action === 'land');
      const receiverLanded = isCurrentSetter ? (p2Action === 'land') : (p1Action === 'land');
      resolveRound(setterLanded, receiverLanded);
    }
  }, [p1Action, p2Action, isCurrentSetter, resolveRound]);

  useEffect(() => {
    if (trickCallMessage && trickCallMessage.gameId === gameId) {
      console.log('Received trick call via WebSocket:', trickCallMessage);
      setCalledTrick(trickCallMessage.trickDetails);
      setCurrentMessage(`${trickCallMessage.setterUsername} called: ${trickCallMessage.trickDetails}`);
      if (trickCallMessage.setterUsername !== whosSet) {
        setWhosSet(trickCallMessage.setterUsername);
      }
    }
  }, [trickCallMessage, gameId]);

  useEffect(() => {
    if (lastTryMessage && lastTryMessage.gameId === gameId) {
      console.log('Received last try message via WebSocket:', lastTryMessage);
      setLastTryPlayer(lastTryMessage.playerOnLastTry);
      setCurrentMessage(lastTryMessage.message);
    }
  }, [lastTryMessage, gameId]);

  useEffect(() => {
    // We need the current user to check against the message
    if (!user) return;

    if (playerActionMessage && playerActionMessage.gameId === gameId) {

      // Ignore actions that were originated by this user.
      // This prevents the "boomerang" or "echo" bug on a single device
      if (playerActionMessage.userId === user.id) {
        console.log('Ignoring self-originated player action echo.');
        return;
      }

      console.log('Received player action via WebSocket from other user:', playerActionMessage);
      const actingPlayer = playerActionMessage.userId === p1User?.userId ? p1Username : p2Username;

      if (actingPlayer === p1Username) {
        setP1Action(prev => prev === null ? playerActionMessage.action : prev);
      } else {
        setP2Action(prev => prev === null ? playerActionMessage.action : prev);
      }
    }
  }, [playerActionMessage, gameId, p1User, p2User, p1Username, p2Username, user]); // <-- Add user to dependency array

  useEffect(() => {
    if (letterUpdateMessage && letterUpdateMessage.gameId === gameId) {
      console.log('Received letter update via WebSocket:', letterUpdateMessage);

      if (letterUpdateMessage.username === p1Username) {
        setP1Letters(letterUpdateMessage.newLetterCount);
      } else if (letterUpdateMessage.username === p2Username) {
        setP2Letters(letterUpdateMessage.newLetterCount);
      }
    }
  }, [letterUpdateMessage, gameId, p1Username, p2Username]);

  useEffect(() => {
    if (roundResolvedMessage && roundResolvedMessage.gameId === gameId && !isProcessingRound.current) {
      console.log('Received round resolution via WebSocket:', roundResolvedMessage);

      // Reset actions
      setP1Action(null);
      setP2Action(null);
      setCalledTrick("Awaiting set call...");

      const { setterLanded, receiverLanded, setterUsername, receiverUsername } = roundResolvedMessage;

      if (setterLanded === receiverLanded) {
        if (!setterLanded) {
          setWhosSet(receiverUsername);
          setCurrentMessage(`Both players missed. ${receiverUsername}'s set now.`);
        } else {
          setWhosSet(setterUsername);
          setCurrentMessage(`Both players landed! ${setterUsername} keeps the set.`);
        }
      } else if (setterLanded && !receiverLanded) {
        setWhosSet(setterUsername);
        setCurrentMessage(`${setterUsername} landed it! ${setterUsername} keeps the set.`);
      } else if (!setterLanded && receiverLanded) {
        setWhosSet(receiverUsername);
        setCurrentMessage(`${setterUsername} fell but ${receiverUsername} landed it. ${receiverUsername}'s set now.`);
      }

      // Reset processing flag
      lastProcessedRoundKey.current = null;
    }
  }, [roundResolvedMessage, gameId]);

  // ==================== RENDER ====================

  return (
    <ImageBackground
      source={require('@/assets/images/background.png')}
      style={mainStyles.backgroundImage}
      resizeMode="cover"
    >
      <ThemedView style={mainStyles.mainContainer}>
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
          {/* Connection Status Banner */}
          {!isOnline && (
            <ThemedView style={{ backgroundColor: '#ff9800', padding: 8, marginBottom: 10, borderRadius: 4 }}>
              <ThemedText style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
                ⚠️ OFFLINE MODE - Changes will sync when connection restores
              </ThemedText>
            </ThemedView>
          )}

          {/* Sync Status */}
          {lastSyncTime && isOnline && (
            <ThemedText style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 8 }}>
              Last synced: {lastSyncTime.toLocaleTimeString()}
            </ThemedText>
          )}

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

          {/* Manual Sync Button (when offline or needs sync) */}
          {!isOnline && gameId > 0 && (
            <ThemedView style={{ marginVertical: 10 }}>
              <CustomButton
                title="RETRY SYNC"
                onPress={syncGameState}
                isPrimary={false}
                disabled={syncInProgress}
              />
            </ThemedView>
          )}

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

        {/* Call Trick Modal */}
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