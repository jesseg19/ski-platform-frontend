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
import { GameTricksModal } from '@/components/GameTricksModal';
import { mainStyles } from '@/constants/AppStyles';
import { Colors } from '@/constants/theme';
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

interface ActiveGameProps {
  gameId: number;
  currentTurnUserId: number | null;
  totalTricks: number;
  players: GamePlayer[];
  tricks: any[];
  createdAt: string;
  lastActivityAt: string;
  status: string;
}
interface GameTrick {
  turnNumber: number;
  setterId: number;
  setterUsername: string;
  receiverId: number;
  receiverUsername: string;
  setterLanded: boolean;
  receiverLanded: boolean;
  letterAssignedToId: number | null;
  letterAssignedToUsername: number | null;
  trickDetails: string;
}

export default function GameScreen1v1() {
  const { resetGameKey, gameKey } = useGame();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeGame, modalVisible } = params;

  const {
    isConnected,
    subscribeToGame,
    publishPlayerAction,
    publishTrickCall,
    publishLastTry,
    sentChallengeStatus,
    resetSentChallenge,
    playerActionMessage,
    trickCallMessage,
    letterUpdateMessage,
    roundResolvedMessage,
    lastTryMessage,
    publishLetterUpdate,
    publishGameStatus
  } = useChallenge();

  // Connection state
  const [isOnline, setIsOnline] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);

  const isProcessingRound = useRef(false);
  const currentRoundNumber = useRef<number>(1);
  const lastProcessedRoundKey = useRef<string | null>(null);

  // Parse initial game props
  let initialGameProps: ActiveGameProps | null = null;
  if (activeGame && typeof activeGame === 'string') {
    try {
      initialGameProps = JSON.parse(activeGame) as ActiveGameProps;
      console.log('Active Game Loaded:', initialGameProps.gameId);
    } catch (e) {
      console.error("Failed to parse active game data:", e);
    }
  }

  // State initialization helper
  const getInitialState = (props: ActiveGameProps | null) => {
    const currentUserUsername = user?.username || 'Player 1';

    let gameId = -1;
    let p1Username = currentUserUsername;
    let p2Username = '';
    let p1User: GamePlayer | null = null;
    let p2User: GamePlayer | null = null;
    let whosSet = currentUserUsername;
    let p1Letters = 0;
    let p2Letters = 0;
    let namesModalVisible = true;
    let calledTrick = 'Awaiting set call...';
    let currentMessage = 'Welcome to Ski Platform!';

    if (props && user) {
      const player1Data = props.players.find(p => p.playerNumber === 1);
      const player2Data = props.players.find(p => p.playerNumber === 2);

      if (player1Data && player2Data) {
        gameId = props.gameId;
        p1User = player1Data;
        p2User = player2Data;
        p1Username = player1Data.username;
        p2Username = player2Data.username;
        p1Letters = player1Data.finalLetters;
        p2Letters = player2Data.finalLetters;

        // Determine who sets
        if (props.tricks && props.tricks.length > 0) {
          const lastTrick = props.tricks[props.tricks.length - 1];
          const lastSetter = props.players.find(p => p.userId === lastTrick.setterId);
          whosSet = lastSetter ? lastSetter.username : p1Username;
        } else if (props.currentTurnUserId) {
          const starterUser = props.players.find(p => p.userId === props.currentTurnUserId);
          whosSet = starterUser ? starterUser.username : p1Username;
        }

        namesModalVisible = false;
        currentMessage = `Game with ${p1Username} vs ${p2Username}`;
        currentRoundNumber.current = props.tricks.length + 1;
      }
    }

    return {
      gameId,
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
    };
  };

  const initialState = getInitialState(initialGameProps);

  // State declarations
  const [gameId, setGameId] = useState<-1 | number>(initialState.gameId);
  const [namesModalVisible, setNamesModalVisible] = useState(() => {
    if (modalVisible === "false" || initialGameProps) return false;
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

  const [setCallModalVisible, setSetCallModalVisible] = useState(false);
  const [p1Action, setP1Action] = useState<'land' | 'fail' | null>(null);
  const [p2Action, setP2Action] = useState<'land' | 'fail' | null>(null);
  const [lastTryPlayer, setLastTryPlayer] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<'playing' | 'gameOver'>('playing');
  const [pauseOrQuitModalVisible, setPauseOrQuitModalVisible] = useState(false);
  const [tricks, setTricks] = useState<GameTrick[]>([]);
  const [gameTricksModalVisible, gameTricksModalVisibleSet] = useState(false);

  const isCurrentSetter = whosSet === p1Username;

  // ==================== CHALLENGE ACCEPTANCE ====================
  useEffect(() => {
    if (sentChallengeStatus && sentChallengeStatus.status === 'ACCEPTED') {
      console.log('Challenge accepted! Fetching game data...');

      const gameId = sentChallengeStatus.gameId;
      if (gameId) {
        api.get(`/api/games/${gameId}`)
          .then(response => {
            const gameData: ActiveGameProps = response.data;
            const player1 = gameData.players.find(p => p.playerNumber === 1);
            const player2 = gameData.players.find(p => p.playerNumber === 2);

            if (player1 && player2) {
              setGameId(gameData.gameId);
              setP1User(player1);
              setP2User(player2);
              setP1Username(player1.username);
              setP2Username(player2.username);
              setP1Letters(player1.finalLetters);
              setP2Letters(player2.finalLetters);

              const starterUser = gameData.players.find(p => p.userId === gameData.currentTurnUserId);
              const starter = starterUser ? starterUser.username : player1.username;
              setWhosSet(starter);

              setCalledTrick('Awaiting set call...');
              setCurrentMessage(`Game started! ${starter} sets first.`);
              setNamesModalVisible(false);

              currentRoundNumber.current = 1;
              resetGameKey();
            }

            resetSentChallenge();
          })
          .catch(error => {
            console.error('Failed to fetch game data:', error);
            Alert.alert('Error', 'Failed to load game data');
          });
      }
    }
  }, [sentChallengeStatus, resetSentChallenge, resetGameKey]);

  // ==================== NETWORK MONITORING ====================
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected || false;
      setIsOnline(online);

      if (online && gameId > 0 && !syncInProgress) {
        setTimeout(() => syncGameState(), 1000);
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

      if (result.success) {
        // Reload state from server
        const response = await api.get(`/api/games/${gameId}`);
        const serverState: ActiveGameProps = response.data;

        const player1 = serverState.players.find(p => p.playerNumber === 1);
        const player2 = serverState.players.find(p => p.playerNumber === 2);

        if (player1) {
          setP1Letters(player1.finalLetters);
          setP1User(player1);
        }
        if (player2) {
          setP2Letters(player2.finalLetters);
          setP2User(player2);
        }

        currentRoundNumber.current = serverState.tricks.length + 1;
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [gameId, user, syncInProgress]);

  // Debounced save state
  useEffect(() => {
    const timer = setTimeout(() => {
      saveLocalGameState();
    }, 500);

    return () => clearTimeout(timer);
  }, [p1Letters, p2Letters, whosSet, calledTrick, currentMessage]);

  // ==================== GAME LOGIC ====================
  const addLetterToPlayer = (player: string) => {
    if (gameStatus === 'gameOver' || p1Letters >= MAX_LETTERS || p2Letters >= MAX_LETTERS) return;
    let setterLanded = null;
    let receiverLanded = null;
    if (player === p1Username && whosSet === p1Username) {
      setterLanded = false;
      receiverLanded = true;
    } else if (player === p1Username && whosSet !== p1Username) {
      setterLanded = true;
      receiverLanded = false;
    } else if (player === p2Username && whosSet !== p2Username) {
      setterLanded = true;
      receiverLanded = false;
    } else if (player === p2Username && whosSet === p2Username) {
      setterLanded = false;
      receiverLanded = true;
    }
    setCurrentMessage("Letter added, trick skipped");
    saveRound(gameId, whosSet, calledTrick, setterLanded, receiverLanded, player);
  };

  const saveRound = useCallback(async (
    gameId: number,
    setter: string,
    trick: string,
    setterLanded: boolean | null,
    receiverLanded: boolean | null,
    letterGivenTo: string | null
  ) => {
    const receiverName = setter === p1Username ? p2Username : p1Username;
    const roundNumToSave = currentRoundNumber.current;
    if (letterGivenTo === p1Username && p1Letters === MAX_LETTERS - 1) {
      setGameStatus('gameOver');
      setCurrentMessage(`GAME OVER! ${p2Username} WINS!`);
    }
    if (letterGivenTo === p2Username && p2Letters === MAX_LETTERS - 1) {
      setGameStatus('gameOver');
      setCurrentMessage(`GAME OVER! ${p1Username} WINS!`);
    }
    try {
      if (isOnline) {
        try {
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

          console.log(`Round ${roundNumToSave} synced to server`);

          const unsyncedActions = await localGameDB.getUnsyncedActions(gameId);
          if (unsyncedActions.length > 0) {
            const lastAction = unsyncedActions[unsyncedActions.length - 1];
            if (lastAction.id) {
              await localGameDB.markActionSynced(lastAction.id);
            }
          }
        } catch (error: any) {
          if (error.response?.status === 200 || error.response?.data === "Round already resolved") {
            console.log("Round already resolved");
          } else {
            console.error("Failed to sync round:", error);
            await gameSyncService.saveActionLocally(
              gameId, roundNumToSave, setter, receiverName,
              trick, setterLanded, receiverLanded, letterGivenTo,
              user?.username || p1Username
            );
          }
        }
      } else {
        await gameSyncService.saveActionLocally(
          gameId, roundNumToSave, setter, receiverName,
          trick, setterLanded, receiverLanded, letterGivenTo,
          user?.username || p1Username
        );
      }

      currentRoundNumber.current += 1;

      // Update letter count locally
      if (letterGivenTo) {
        let newCount = 0;
        let userId = 0;

        if (letterGivenTo === p1Username && p1Letters < MAX_LETTERS) {
          newCount = p1Letters + 1;
          userId = p1User?.userId || 0;
          setP1Letters(newCount);
        } else if (letterGivenTo === p2Username && p2Letters < MAX_LETTERS) {
          newCount = p2Letters + 1;
          userId = p2User?.userId || 0;
          setP2Letters(newCount);
        }

        if (isOnline && userId > 0) {
          publishLetterUpdate(gameId, userId, letterGivenTo, newCount);
        }
      }
    } catch (error) {
      console.error("Failed to save round:", error);
      Alert.alert("Error", "Failed to save game progress.");
    }
  }, [gameId, p1Username, p2Username, user, isOnline, publishLetterUpdate, p1Letters, p2Letters, p1User, p2User]);

  const resolveRound = useCallback(async (setterLanded: boolean, receiverLanded: boolean) => {
    const roundKey = `${gameId}-${currentRoundNumber.current}-${calledTrick}-${setterLanded}-${receiverLanded}`;

    if (isProcessingRound.current || roundKey === lastProcessedRoundKey.current) {
      console.log('Round already being processed');
      return;
    }

    isProcessingRound.current = true;
    lastProcessedRoundKey.current = roundKey;

    try {
      let playerWhoGotLetter: string | null = null;
      const receiverName = whosSet === p1Username ? p2Username : p1Username;
      const currentTrick = calledTrick;

      setP1Action(null);
      setP2Action(null);

      // Both land or both fail
      if (setterLanded === receiverLanded) {
        playerWhoGotLetter = null;
        await saveRound(gameId, whosSet, currentTrick, setterLanded, receiverLanded, playerWhoGotLetter);

        if (!setterLanded) {
          setWhosSet(receiverName);
          setCurrentMessage(`Both missed. ${receiverName}'s set now.`);
        } else {
          setCurrentMessage(`Both landed! ${whosSet} keeps the set.`);
        }
        setCalledTrick("Awaiting set call...");
      }
      // Setter lands, receiver fails
      else if (setterLanded && !receiverLanded) {
        const receiverLetters = receiverName === p1Username ? p1Letters : p2Letters;

        if (!isLastTry(receiverLetters)) {
          playerWhoGotLetter = receiverName;
          await saveRound(gameId, whosSet, currentTrick, setterLanded, receiverLanded, playerWhoGotLetter);
          setCurrentMessage(`${whosSet} landed! ${whosSet} keeps the set.`);
          setCalledTrick("Awaiting set call...");
        } else {
          setLastTryPlayer(receiverName);
          const lastTryMsg = `${receiverName} missed! Last letter - 2 attempts.`;
          setCurrentMessage(lastTryMsg);
          if (isOnline) {
            publishLastTry(gameId, receiverName, lastTryMsg);
          }
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
          setCurrentMessage(`${whosSet} fell. ${receiverName}'s set now.`);
          setCalledTrick("Awaiting set call...");
        } else {
          setLastTryPlayer(whosSet);
          const lastTryMsg = `${whosSet} fell! Setter gets 2nd try.`;
          setCurrentMessage(lastTryMsg);
          if (isOnline) {
            publishLastTry(gameId, whosSet, lastTryMsg);
          }
          return;
        }
      }
    } finally {
      setTimeout(() => {
        isProcessingRound.current = false;
      }, 1000);
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
        setCurrentMessage(`${playerOnLastTry} survived! ${newSetter}'s set.`);
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
      setTimeout(() => {
        isProcessingRound.current = false;
      }, 500);
    }
  };

  // ==================== HANDLERS ====================
  const handlePlayerAction = useCallback((player: GamePlayer, action: 'land' | 'fail') => {
    // Immediately set local action
    if (player.username === p1Username) {
      setP1Action(prev => prev === null ? action : prev);
    } else {
      setP2Action(prev => prev === null ? action : prev);
    }

    // Publish to other player
    if (gameId > 0 && user && isOnline) {
      publishPlayerAction(gameId, player.userId, action);
    }
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
        router.push('/(tabs)/game');
        publishGameStatus(gameId, 'COMPLETED');
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
    setCurrentMessage(`Challenge sent to ${opponentUsername}. Waiting...`);
    setCalledTrick(`Waiting for ${opponentUsername} to accept...`);
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
      publishGameStatus(gameId, 'PAUSED');
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
      publishGameStatus(gameId, 'CANCELLED');
    } catch (error) {
      console.error("Failed to quit game:", error);
    }
  };

  const getActionDisabled = useCallback((player: string) => {
    const action = player === p1Username ? p1Action : p2Action;
    const isAwaitingSet = calledTrick.trim() === 'Awaiting set call...' || gameId < 0;
    return (
      action !== null ||
      lastTryPlayer !== null ||
      gameStatus === 'gameOver' ||
      isAwaitingSet ||
      isProcessingRound.current
    );
  }, [p1Username, p1Action, p2Action, lastTryPlayer, gameStatus, calledTrick]);

  const getAllGameTricks = useCallback(async () => {
    if (gameId <= 0) return [];
    try {
      const response = await api.get(`/api/profiles/${gameId}/tricks`);
      setTricks(response.data);
      gameTricksModalVisibleSet(true);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch game tricks:', error);
      return [];
    }
  }, [gameId]);

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
      console.log('Received trick call:', trickCallMessage);
      setCalledTrick(trickCallMessage.trickDetails);
      setCurrentMessage(`${trickCallMessage.setterUsername} called: ${trickCallMessage.trickDetails}`);
      setWhosSet(trickCallMessage.setterUsername);

      // Save state immediately
      saveLocalGameState();
    }
  }, [trickCallMessage, gameId]);

  useEffect(() => {
    if (lastTryMessage && lastTryMessage.gameId === gameId) {
      console.log('Received last try message:', lastTryMessage);
      setLastTryPlayer(lastTryMessage.playerOnLastTry);
      setCurrentMessage(lastTryMessage.message);
    }
  }, [lastTryMessage, gameId]);

  useEffect(() => {
    if (p1Letters >= MAX_LETTERS || p2Letters >= MAX_LETTERS) {
      setGameStatus('gameOver');
    }
  }, [p1Letters, p2Letters]);

  useEffect(() => {
    if (letterUpdateMessage && letterUpdateMessage.gameId === gameId) {
      console.log('Received letter update:', letterUpdateMessage);

      if (letterUpdateMessage.username === p1Username) {
        setP1Letters(letterUpdateMessage.newLetterCount);
      } else if (letterUpdateMessage.username === p2Username) {
        setP2Letters(letterUpdateMessage.newLetterCount);
      }

      // Save state immediately
      saveLocalGameState();
    }
  }, [letterUpdateMessage, gameId, p1Username, p2Username]);

  useEffect(() => {
    if (roundResolvedMessage && roundResolvedMessage.gameId === gameId && !isProcessingRound.current) {
      console.log('Received round resolution:', roundResolvedMessage);

      setP1Action(null);
      setP2Action(null);
      setCalledTrick("Awaiting set call...");

      const { setterLanded, receiverLanded, setterUsername, receiverUsername } = roundResolvedMessage;

      if (setterLanded === receiverLanded) {
        if (!setterLanded) {
          setWhosSet(receiverUsername);
          setCurrentMessage(`Both missed. ${receiverUsername}'s set now.`);
        } else {
          setWhosSet(setterUsername);
          setCurrentMessage(`Both landed! ${setterUsername} keeps set.`);
        }
      } else if (setterLanded && !receiverLanded) {
        setWhosSet(setterUsername);
        setCurrentMessage(`${setterUsername} landed! ${setterUsername} keeps the set.`);
      } else if (!setterLanded && receiverLanded) {
        setWhosSet(receiverUsername);
        setCurrentMessage(`${setterUsername} fell. ${receiverUsername}'s set now.`);
      }

      lastProcessedRoundKey.current = null;

      // Save state immediately
      saveLocalGameState();
    }
  }, [roundResolvedMessage, gameId]);

  // ==================== RENDER ====================
  return (
    <ImageBackground
      source={require('@/assets/images/background.png')}
      style={mainStyles.backgroundImage}
      resizeMode="cover"
    >
      <CustomButton
        title="Remove Last Trick"
        style={{ position: 'absolute', top: 80, right: 20, zIndex: 10, backgroundColor: Colors.danger }}
        onPress={async () => {
          try {
            await api.delete(`/api/games/${gameId}/removeLastTrick`);
          } catch (error) {
            console.error('Error removing last trick:', error);
          }
        }}
      />
      <ThemedView style={mainStyles.mainContainer}>
        <GameChallengeModal
          isVisible={namesModalVisible}
          onClose={() => setNamesModalVisible(false)}
          p1Username={p1Username}
          p2User={p2User || { userId: 0, username: '', finalLetters: 0, playerNumber: 2 }}
          setP2User={setP2User}
          onChallengeStart={handleChallengeStart}
          onBackToMenu={() => { router.navigate('/(tabs)/game'); setNamesModalVisible(false); }}
        />

        <ScrollView
          key={gameKey}
          contentContainerStyle={mainStyles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          {!isOnline && (
            <ThemedView style={{ backgroundColor: '#ff9800', padding: 8, marginBottom: 10, borderRadius: 4 }}>
              <ThemedText style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
                ⚠️ OFFLINE MODE - Changes will sync when connection restores
              </ThemedText>
            </ThemedView>
          )}

          <ThemedView style={mainStyles.statusCard}>
            <ThemedText style={mainStyles.statusTitle}>
              <Text style={{ fontWeight: 'bold' }}>{whosSet}</Text>&apos;s Set
            </ThemedText>
            <TouchableOpacity
              style={[mainStyles.callSetButton, { opacity: gameStatus === 'gameOver' ? 0.5 : 1 }]}
              onPress={() => setSetCallModalVisible(true)}
              disabled={gameStatus === 'gameOver'}
            >
              <ThemedText style={mainStyles.callSetButtonText}>
                CALL NEW TRICK
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={mainStyles.trickDisplayCard}>
            <ThemedText style={mainStyles.trickLabel}>Current Trick:</ThemedText>
            <ThemedText style={mainStyles.trickValue}>{calledTrick}</ThemedText>
          </ThemedView>

          <ThemedView style={mainStyles.messageCard}>
            <ThemedText style={mainStyles.messageText}>{currentMessage}</ThemedText>
          </ThemedView>

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
            addLetterToPlayer={addLetterToPlayer}
          />

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
            addLetterToPlayer={addLetterToPlayer}
          />

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

          {/* button to show all previously done tricks in this game */}
          <CustomButton title="View Trick History" onPress={() => {
            getAllGameTricks();
          }} isPrimary={false} />

          <GameTricksModal
            isVisible={gameTricksModalVisible}
            onClose={() => gameTricksModalVisibleSet(false)}
            tricks={tricks}
            p1Username={p1Username}
            p2Username={p2Username}
          />


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
                <CustomButton title="Back to game" onPress={() => setPauseOrQuitModalVisible(false)} isPrimary={false} />
              </View>
            </View>
          </View>
        </Modal>

        <TrickCallModal
          isVisible={setCallModalVisible}
          onClose={() => setSetCallModalVisible(false)}
          currentTrick={calledTrick}
          onTrickCall={handleTrickCall}
        />
      </ThemedView>
    </ImageBackground>
  );
}