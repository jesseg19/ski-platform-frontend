import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, ImageBackground, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomButton } from '@/components/CustomButton';
import { GameControls } from '@/components/game/GameControls';
import { GameHeader } from '@/components/game/GameHeader';
import { GameInfo } from '@/components/game/GameInfo';
import { PauseOrQuitModal } from '@/components/game/PauseOrQuitModal';
import { GameChallengeModal } from '@/components/GameChallengeModal';
import { GameRoundActions } from '@/components/GameRoundActions';
import { GameTricksModal } from '@/components/GameTricksModal';
import { ThemedView } from '@/components/themed-view';
import { TrickCallModal } from '@/components/TrickCallModal';

import { useGame } from '@/app/context/GameContext';
import { useChallenge } from '@/app/context/WebSocketProvider';
import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';

import { useGameLogic } from '@/hooks/1v1/useGameLogic';
import { useGameState } from '@/hooks/1v1/useGameState';
import { useGameSync } from '@/hooks/1v1/useGameSync';
import { useLocationTracking } from '@/hooks/1v1/useLocationTracking';
import { useWebSocketSync } from '@/hooks/1v1/useWebSocketsync';

import { startLiveNotificationService, stopLiveNotification, updateGameNotification } from '@/services/LiveNotificationService';
import { localGameDB } from '@/services/LocalGameDatabase';

import { mainStyles } from '@/constants/AppStyles';
import { ActiveGameProps, GamePlayer, PlayerAction } from '@/types/game.types';
import { WebSocketSyncCallbacks } from '@/types/hooks.types';
import { didPlayerTravelSufficientDistance, formatLetters } from '@/utils/gameHelpers';

export default function GameScreen1v1() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { resetGameKey, gameKey } = useGame();



  // Parse initial game props
  const initialGameProps = useMemo(() => {
    if (params.activeGame && typeof params.activeGame === 'string') {
      try {
        return JSON.parse(params.activeGame) as ActiveGameProps;
      } catch (e) {
        console.error("Failed to parse active game data:", e);
        return null;
      }
    }
    return null;
  }, [params.activeGame]);

  // Get game state
  const gameState = useGameState(initialGameProps);

  const appStateRef = useRef(AppState.currentState);
  // Use refs for values needed inside the listener to avoid re-mounting the effect
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Get sync utilities
  const { isOnline, saveLocalGameState, syncGameState: syncGameStateOriginal } = useGameSync(gameState.gameId, user);

  const syncGameState = useCallback(async (): Promise<ActiveGameProps | null> => {
    return await syncGameStateOriginal();
  }, [syncGameStateOriginal]);

  // Get WebSocket methods
  const {
    publishTrickCall,
    publishLetterUpdate,
    publishLastTry,
    requestGameState,
    publishGameStatus,
    publishPlayerAction,
    sentChallengeStatus,
    resetSentChallenge
  } = useChallenge();

  // Get location tracking
  const { totalDistance } = useLocationTracking(gameState.gameStatus);

  // UI state (modals)
  const [namesModalVisible, setNamesModalVisible] = useState(() => {
    if (params.modalVisible === "false" || initialGameProps) return false;
    return true;
  });
  const [setCallModalVisible, setSetCallModalVisible] = useState(false);
  const [pauseOrQuitModalVisible, setPauseOrQuitModalVisible] = useState(false);
  const [gameTricksModalVisible, setGameTricksModalVisible] = useState(false);


  // Create a wrapper function that includes all the current game state
  const saveCurrentGameState = useCallback(async () => {
    if (gameState.gameId <= 0) return;

    await saveLocalGameState({
      gameId: gameState.gameId,
      p1Username: gameState.p1Username,
      p2Username: gameState.p2Username,
      p1UserId: gameState.p1User?.userId || 0,
      p2UserId: gameState.p2User?.userId || 0,
      p1Letters: gameState.p1Letters,
      p2Letters: gameState.p2Letters,
      whosSet: gameState.whosSet,
      calledTrick: gameState.calledTrick,
      currentMessage: gameState.currentMessage,
    });
  }, [
    gameState.gameId,
    gameState.p1Username,
    gameState.p2Username,
    gameState.p1User,
    gameState.p2User,
    gameState.p1Letters,
    gameState.p2Letters,
    gameState.whosSet,
    gameState.calledTrick,
    gameState.currentMessage,
    saveLocalGameState
  ]);

  // Define what happens when WebSocket messages arrive
  const wsCallbacks: WebSocketSyncCallbacks = useMemo(() => ({
    onTrickCall: (trickDetails: string) => {
      gameState.setCalledTrick(trickDetails);
      saveCurrentGameState();

      // Update notification with new trick ONLY if in background
      if (gameState.gameId > 0 && AppState.currentState !== 'active') {
        updateGameNotification(
          gameState.gameId,
          gameState.p1Username,
          formatLetters(gameState.p1Letters),
          gameState.p2Username,
          formatLetters(gameState.p2Letters),
          trickDetails,
          gameState.whosSet
        );
      }
    },

    onLetterUpdate: (message) => {
      if (message.username === gameState.p1Username) {
        gameState.setP1Letters(message.newLetterCount);
      } else if (message.username === gameState.p2Username) {
        gameState.setP2Letters(message.newLetterCount);
      }

      if (gameState.p1Letters >= 3 || gameState.p2Letters >= 3) {
        gameState.setGameStatus('gameOver');
      }
      saveCurrentGameState();
    },

    onRoundResolved: (message) => {

      gameState.setP1Action(null);
      gameState.setP2Action(null);
      gameState.setCalledTrick("Awaiting set call...");

      const { setterLanded, receiverLanded, setterUsername, receiverUsername } = message;

      if (setterLanded === receiverLanded) {
        if (!setterLanded) {
          gameState.setWhosSet(receiverUsername);
          gameState.setCurrentMessage(`Both missed. ${receiverUsername}'s set now.`);
        } else {
          gameState.setWhosSet(setterUsername);
          gameState.setCurrentMessage(`Both landed! Game continues.`);
        }
      } else if (setterLanded && !receiverLanded) {
        gameState.setWhosSet(setterUsername);
        gameState.setCurrentMessage(`${setterUsername} landed! ${receiverUsername} gets a letter.`);
      } else if (!setterLanded && receiverLanded) {
        gameState.setWhosSet(receiverUsername);
        gameState.setCurrentMessage(`${setterUsername} fell. ${receiverUsername}'s set now.`);
      }

      saveCurrentGameState();
    },

    onLastTry: (message) => {
      gameState.setLastTryPlayer(message.playerOnLastTry);
      gameState.setCurrentMessage(message.message);
    },

    onSyncRequest: (message) => {

      if (message.requester !== user?.username) {
        if (gameState.calledTrick && gameState.calledTrick !== 'Awaiting set call...') {
          publishTrickCall(gameState.gameId, gameState.whosSet, gameState.calledTrick);
        }
      }
    },
  }), [gameState.gameId, gameState.p1Username, gameState.p2Username, gameState.whosSet, gameState.calledTrick, user, saveCurrentGameState, publishTrickCall]);

  // Set up WebSocket sync with callbacks
  useWebSocketSync(gameState.gameId, isOnline, wsCallbacks);

  useEffect(() => {
    if (isOnline && gameState.gameId > 0) {
      requestGameState(gameState.gameId);
    }
  }, [isOnline, gameState.gameId, requestGameState]);

  // Game logic hook
  //debounce the sync game state to only sync when in the forground, not continuisuly
  const {
    setTrick,
    submitResult,
    addLetterToPlayer,
    handleLastTryAction
  } = useGameLogic(
    gameState,
    isOnline,
    publishTrickCall,
    publishPlayerAction,
    saveCurrentGameState // Pass the save function here
  );
  // ==================== EFFECTS ====================
  // Stop notification when component unmounts or game ends
  useEffect(() => {
    return () => {
      stopLiveNotification();
    };
  }, []);

  //update data user may have missed from websocket with data from db
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // This ensures if the setter called a trick while you were in the 
        // lock screen, the UI updates immediately upon unlock.
        syncGameState();
      }
    });

    return () => subscription.remove();
  }, [syncGameState]);


  // App state change handler (notifications)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const currentState = gameStateRef.current;

      // App moving from Foreground to Background
      // We strictly check for 'active' -> 'background' transition
      if (
        appStateRef.current === 'active' &&
        nextAppState === 'background'
      ) {
        if (currentState.gameStatus === 'playing' && currentState.gameId > 0) {
          console.log('App moved to background, starting live notification service...');
          await saveCurrentGameState();
          await startLiveNotificationService();

          const isGameOver = currentState.p1Letters === 3 || currentState.p2Letters === 3;
          updateGameNotification(
            currentState.gameId,
            currentState.p1Username,
            formatLetters(currentState.p1Letters),
            currentState.p2Username,
            formatLetters(currentState.p2Letters),
            currentState.calledTrick || 'Waiting...',
            currentState.whosSet,
            isGameOver
          );
        }
      } else if (nextAppState === 'active') {
        // App coming to foreground - Stop Notifications & Sync
        await stopLiveNotification();

        if (gameState.gameId > 0 && isOnline) {
          console.log('App resumed, syncing game state...');
          try {
            const synced = await syncGameState();
            console.log('Synced game state on resume:', synced);
            if (synced) {
              const p1Letters = synced.players[0]?.finalLetters || gameState.p1Letters;
              const p2Letters = synced.players[1]?.finalLetters || gameState.p2Letters;

              // Update local state from server
              gameState.setP1Letters(p1Letters);
              gameState.setP2Letters(p2Letters);

              // Check if game should be over
              if (p1Letters >= 3 || p2Letters >= 3) {
                gameState.setGameStatus('gameOver');
              }
            }
          } catch (error) {
            console.error('Failed to sync on app resume:', error);
          }
        }
      }

      // Always update the ref with the latest state
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      // Only stop notification on unmount if you want the service killed when 
      // navigating away from the game screen entirely
      stopLiveNotification();
    };
  }, [isOnline, syncGameState, saveCurrentGameState]);

  // Challenge acceptance
  useEffect(() => {
    console.log("Challenge Effect checking status:", sentChallengeStatus?.status);
    if (sentChallengeStatus && sentChallengeStatus.status === 'ACCEPTED') {
      gameState.setGameStatus('playing');
      console.log('Challenge accepted! Fetching game data...');

      const gameId = sentChallengeStatus.gameId;
      if (gameId) {
        api.get(`/api/games/${gameId}`)
          .then(response => {
            const gameData: ActiveGameProps = response.data;
            const player1 = gameData.players.find(p => p.playerNumber === 1);
            const player2 = gameData.players.find(p => p.playerNumber === 2);

            if (player1 && player2) {
              gameState.setGameId(gameData.gameId);
              gameState.setP1User(player1);
              gameState.setP2User(player2);
              gameState.setP1Username(player1.username);
              gameState.setP2Username(player2.username);
              gameState.setP1Letters(player1.finalLetters);
              gameState.setP2Letters(player2.finalLetters);

              const starterUser = gameData.players.find(p => p.userId === gameData.currentTurnUserId);
              const starter = starterUser ? starterUser.username : player1.username;
              gameState.setWhosSet(starter);
              gameState.setGameStatus('playing');
              gameState.setCalledTrick('Awaiting set call...');
              gameState.setCurrentMessage(`Game started! ${starter} sets first.`);
              setNamesModalVisible(false);

              gameState.currentRoundNumber.current = 1;
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

  // Request game state when connecting
  useEffect(() => {
    if (isOnline && gameState.gameId > 0) {
      requestGameState(gameState.gameId);
    }
  }, [isOnline, gameState.gameId, requestGameState]);

  // Load stored state on mount
  useEffect(() => {
    const loadStoredState = async () => {
      if (gameState.gameId > 0) {
        const saved = await localGameDB.getGameState(gameState.gameId);
        if (saved && saved.calledTrick && saved.calledTrick !== 'Awaiting set call...') {
          gameState.setCalledTrick(saved.calledTrick);
          gameState.setWhosSet(saved.whosSet);
        }
        if (isOnline) {
          // If we are back online, ALWAYS refresh the tricks from the source of truth
          try {
            const response = await api.get(`/api/games/${gameState.gameId}`);
            const serverData = response.data;

            gameState.setTricks(serverData.tricks);
            const serverP1 = serverData.players.find((p: { username: string; }) => p.username === gameState.p1Username);
            const serverP2 = serverData.players.find((p: { username: string; }) => p.username === gameState.p2Username);

            if (serverP1) gameState.setP1Letters(serverP1.finalLetters);
            if (serverP2) gameState.setP2Letters(serverP2.finalLetters);

            const currentSetter = serverData.players.find((p: { userId: number; }) => p.userId === serverData.currentTurnUserId);
            if (currentSetter) {
              gameState.setWhosSet(currentSetter.username);
            }
            gameState.setP1Action(null);
            gameState.setP2Action(null);

            await saveCurrentGameState(); // Sync the local DB with this fresh server data
          } catch (e) {
            console.error("Failed to refresh state on return", e);
          }
        }
      }

    };
    loadStoredState();
  }, [gameState.gameId, isOnline, gameState.p1Username, gameState.p2Username]);


  // Resolve round when both actions are set
  // useEffect(() => {
  //   if (gameState.p1Action !== null && gameState.p2Action !== null && !gameLogic.isProcessingRound.current) {
  //     const isCurrentSetter = gameState.whosSet === gameState.p1Username;
  //     const setterLanded = isCurrentSetter ? (gameState.p1Action === 'land') : (gameState.p2Action === 'land');
  //     const receiverLanded = isCurrentSetter ? (gameState.p2Action === 'land') : (gameState.p1Action === 'land');
  //     // gameLogic.resolveRound(setterLanded, receiverLanded);
  //   }
  // }, [gameState.p1Action, gameState.p2Action, gameState.whosSet, gameState.p1Username, gameLogic]);

  // Debounced save state - auto-save when important values change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCurrentGameState();
    }, 500);

    return () => clearTimeout(timer);
  }, [
    gameState.p1Letters,
    gameState.p2Letters,
    gameState.whosSet,
    gameState.calledTrick,
    gameState.currentMessage,
    saveCurrentGameState
  ]);
  // ==================== HANDLERS ====================
  const handlePlayerAction = useCallback(async (player: GamePlayer, action: PlayerAction) => {
    if (gameState.gameStatus === 'gameOver') return;

    // Update local UI state
    const isLanded = action === 'land';
    if (player.username === gameState.p1Username) {
      gameState.setP1Action(action);
    } else {
      gameState.setP2Action(action);
    }
    if (gameState.gameStatus === 'lastTry') {
      // If we are in lastTry, use the specific endpoint for redemption
      await handleLastTryAction(isLanded ? 'land' : 'fail');
      return;
    }

    // Submit to DB
    if (gameState.gameId > 0 && user && isOnline) {
      console.log(`Submitting action to DB: Player ${player.username} - ${action}`);
      try {
        // Find the current trick ID from your gameState.tricks array
        // Usually the last trick in the list if it's the current round
        const currentTrick = gameState.tricks[gameState.tricks.length - 1];
        console.log('Current trick for action submission:', gameState.tricks);
        if (currentTrick) {
          console.log(`Submitting action to DB 1v1: user ${player.userId}, trickId ${currentTrick.id}, Landed: ${isLanded}`);
          await api.post(`/api/games/${gameState.gameId}/submitAction`, {
            userId: player.userId,
            trickId: currentTrick.id,
            landed: isLanded
          });

          // Inform the other player via WebSocket to show "Opponent has finished"
          publishPlayerAction(gameState.gameId, player.userId, action);

          //update game letters 
          if (!isLanded) {
            if (player.username === gameState.p1Username) {
              gameState.setP1Letters(prev => prev + 1);
              publishLetterUpdate(
                gameState.gameId,
                player.userId,
                player.username,
                gameState.p1Letters + 1
              );
            } else {
              gameState.setP2Letters(prev => prev + 1);
              publishLetterUpdate(
                gameState.gameId,
                player.userId,
                player.username,
                gameState.p2Letters + 1
              );
            }
          }
        }
      } catch (error) {
        console.error('Failed to record player action:', error);
      }
    }
  }, [gameState, user, isOnline, publishPlayerAction]);

  const getActionDisabled = useCallback((player: string) => {
    const action = player === gameState.p1Username ? gameState.p1Action : gameState.p2Action;
    const isAwaitingSet = gameState.calledTrick === 'Awaiting set call...' || gameState.gameId < 0;
    const isGameOver = gameState.p1Letters === 3 || gameState.p2Letters === 3;

    return (
      action !== null ||
      gameState.lastTryPlayer !== null ||
      gameState.gameStatus !== 'playing' ||
      isAwaitingSet ||
      // gameLogic.isProcessingRound.current ||
      isGameOver
    );
  }, [gameState.p1Username, gameState.p1Action, gameState.p2Action, gameState.lastTryPlayer, gameState.gameStatus, gameState.calledTrick, gameState.gameId, gameState.p1Letters, gameState.p2Letters]);


  const handleTrickCall = useCallback(async (trickString: string) => {
    // Update local UI immediately for responsiveness
    gameState.setCalledTrick(trickString);
    setSetCallModalVisible(false);
    await setTrick(gameState.gameId, user?.username || '', trickString);
    gameState.setCurrentMessage(`${gameState.whosSet} called: ${trickString}`);

    // Persist to DB (This creates the 'GameTrick' row with NULL results)
    if (gameState.gameId > 0 && isOnline) {
      try {
        // await api.post(`/api/games/${gameState.gameId}/setTrick`, {
        //   setterUsername: gameState.whosSet,
        //   trickDetails: trickString
        // });

        // Publish via WebSocket for the "Live" experience
        publishTrickCall(gameState.gameId, gameState.whosSet, trickString);

        await getAllGameTricks(false);
        // Auto-save local state as backup
        await saveCurrentGameState();
      } catch (error) {
        console.error('Failed to set trick in DB:', error);
        Alert.alert("Error", "Could not save trick. Check your connection.");
      }
    }
  }, [gameState, saveCurrentGameState, isOnline, publishTrickCall]);

  const handleSaveGame = async () => {
    if (gameState.gameStatus === 'gameOver') {
      const winner = gameState.p1Letters === 3 ? gameState.p2Username : gameState.p1Username;
      const loser = gameState.p1Letters === 3 ? gameState.p1Username : gameState.p2Username;

      try {
        await api.post(`/api/games/${gameState.gameId}/end`, {
          winnerUsername: winner,
          loserUsername: loser,
          winnerFinalLetters: winner === gameState.p1Username ? gameState.p1Letters : gameState.p2Letters,
          loserFinalLetters: loser === gameState.p1Username ? gameState.p1Letters : gameState.p2Letters,
          totalDistanceTraveled: totalDistance,
        });

        gameState.setGameStatus('completed');
        await localGameDB.clearGameData(gameState.gameId);

        if (!didPlayerTravelSufficientDistance(totalDistance)) {
          Alert.alert("Game Over", "Game saved, however you did not travel a realistic distance so this game will not count towards your rank.");
        }
        router.push('/(tabs)/game');
        publishGameStatus(gameState.gameId, 'COMPLETED');
      } catch (error) {
        console.error("Failed to save game result:", error);
        Alert.alert("Error", "Failed to save game result.");
      }
    }
  };

  const handlePauseGame = async () => {
    try {
      await api.put(`/api/games/${gameState.gameId}/pause`);
      setPauseOrQuitModalVisible(false);
      resetGameKey();
      router.navigate('/(tabs)/game');
      publishGameStatus(gameState.gameId, 'PAUSED');
    } catch (error) {
      console.error("Failed to pause game:", error);
    }
  };

  const handleQuitGame = async () => {
    try {
      await api.delete(`/api/games/${gameState.gameId}/cancel`);
      await localGameDB.clearGameData(gameState.gameId);
      setPauseOrQuitModalVisible(false);
      resetGameKey();
      router.navigate('/(tabs)/game');
      publishGameStatus(gameState.gameId, 'CANCELLED');
    } catch (error) {
      console.error("Failed to quit game:", error);
    }
  };

  const handleRemoveLastTrick = async () => {
    if (gameState.tricks.length === 0) return;
    const lastTrick = gameState.tricks[gameState.tricks.length - 1];
    try {
      await api.delete(`/api/games/${gameState.gameId}/removeLastTrick`);
      gameState.setTricks(prev => prev.slice(0, -1));
      gameState.setCurrentMessage('Last trick removed.');
      if (lastTrick.letterAssignedToUsername) {
        if (lastTrick.letterAssignedToUsername === gameState.p1Username && gameState.p1Letters > 0) {
          gameState.setP1Letters(prev => prev - 1);
          publishLetterUpdate(
            gameState.gameId,
            gameState.p1User?.userId || 0,
            lastTrick.letterAssignedToUsername,
            gameState.p1Letters - 1
          );
        } else if (lastTrick.letterAssignedToUsername === gameState.p2Username && gameState.p2Letters > 0) {
          gameState.setP2Letters(prev => prev - 1);
          publishLetterUpdate(
            gameState.gameId,
            gameState.p2User?.userId || 0,
            lastTrick.letterAssignedToUsername,
            gameState.p2Letters - 1
          );
        }
      }
    } catch (error) {
      console.error('Failed to remove last trick:', error);
      Alert.alert('Error', 'Failed to remove last trick.');
    }
  };

  const getAllGameTricks = useCallback(async (fromBtn: boolean) => {
    if (gameState.gameId <= 0) return;
    try {
      const response = await api.get(`/api/profiles/${gameState.gameId}/tricks`);
      gameState.setTricks(response.data);
      if (fromBtn) {
        setGameTricksModalVisible(true);
      }
    } catch (error) {
      console.error('Failed to fetch game tricks:', error);
    }
  }, [gameState.gameId]);

  // Debounced save state - auto-save when important values change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCurrentGameState();
    }, 500);

    return () => clearTimeout(timer);
  }, [
    gameState.p1Letters,
    gameState.p2Letters,
    gameState.whosSet,
    gameState.calledTrick,
    gameState.currentMessage,
    saveCurrentGameState
  ]);
  // ==================== RENDER ====================
  return (
    <ImageBackground
      source={require('@/assets/images/background.png')}
      style={mainStyles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={mainStyles.mainContainer}>
        <GameChallengeModal
          isVisible={namesModalVisible}
          onClose={() => setNamesModalVisible(false)}
          p1Username={gameState.p1Username}
          p2User={gameState.p2User || { userId: 0, username: '', finalLetters: 0, playerNumber: 2 }}
          setP2User={gameState.setP2User}
          onChallengeStart={(opponentUsername) => {
            gameState.setP2Username(opponentUsername);
            setNamesModalVisible(false);
            gameState.setCurrentMessage(`Challenge sent to ${opponentUsername}`);
            gameState.setGameStatus("pending");
          }}
          onBackToMenu={() => {
            router.navigate('/(tabs)/game');
            setNamesModalVisible(false);

          }}
        />
        <ScrollView
          key={gameKey}
          contentContainerStyle={mainStyles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <GameHeader
            whosSet={gameState.whosSet}
            gameStatus={gameState.gameStatus}
            onCallNewTrick={() => setSetCallModalVisible(true)}
            isOnline={isOnline}
          />

          <GameInfo
            calledTrick={gameState.calledTrick}
            currentMessage={gameState.currentMessage}
          />

          {gameState.p1User && (
            <GameRoundActions
              player={gameState.p1User}
              playerName={gameState.p1Username}
              lettersEarned={gameState.p1Letters}
              playerAction={gameState.p1Action}
              lastTryPlayer={gameState.lastTryPlayer}
              gameStatus={gameState.gameStatus}
              getActionDisabled={getActionDisabled}
              handlePlayerAction={handlePlayerAction}
              handleLastTryAction={handleLastTryAction}
              addLetterToPlayer={addLetterToPlayer}
            />
          )}

          {gameState.p2User && (
            <GameRoundActions
              player={gameState.p2User}
              playerName={gameState.p2Username}
              lettersEarned={gameState.p2Letters}
              playerAction={gameState.p2Action}
              lastTryPlayer={gameState.lastTryPlayer}
              gameStatus={gameState.gameStatus}
              getActionDisabled={getActionDisabled}
              handlePlayerAction={handlePlayerAction}
              handleLastTryAction={handleLastTryAction}
              addLetterToPlayer={addLetterToPlayer}
            />
          )}

          {!isOnline && gameState.gameId > 0 && (
            <ThemedView style={{ marginVertical: 10 }}>
              <CustomButton
                title="RETRY SYNC"
                onPress={syncGameState}
                isPrimary={false}
              />
            </ThemedView>
          )}

          {gameState.gameStatus === 'gameOver' && (
            <ThemedView style={mainStyles.gameOverCard}>
              <CustomButton
                title="FINISH & SAVE GAME RESULT"
                onPress={handleSaveGame}
                isPrimary={true}
              />
            </ThemedView>
          )}

          <GameControls
            gameStatus={gameState.gameStatus}
            tricks={gameState.tricks}
            onRemoveLastTrick={handleRemoveLastTrick}
            onViewTrickHistory={() => getAllGameTricks(true)}
            onExit={() => setPauseOrQuitModalVisible(true)}
          />
        </ScrollView>

        {/* Modals */}
        <PauseOrQuitModal
          isVisible={pauseOrQuitModalVisible}
          onClose={() => setPauseOrQuitModalVisible(false)}
          onPause={handlePauseGame}
          onQuit={handleQuitGame}
          gameStatus={gameState.gameStatus}
        />

        <TrickCallModal
          isVisible={setCallModalVisible}
          onClose={() => setSetCallModalVisible(false)}
          currentTrick={gameState.calledTrick}
          onTrickCall={handleTrickCall}
        />

        <GameTricksModal
          isVisible={gameTricksModalVisible}
          onClose={() => setGameTricksModalVisible(false)}
          tricks={gameState.tricks}
          p1Username={gameState.p1Username}
          p2Username={gameState.p2Username}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}