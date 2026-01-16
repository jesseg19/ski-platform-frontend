import { ActiveGameProps, GamePlayer } from "@/types/game.types";
import { User } from "@/types/user.types";

interface InitialGameState {
    gameId: number | -1;
    p1Username: string;
    p2Username: string;
    p1User: GamePlayer | null;
    p2User: GamePlayer | null;
    whosSet: string;
    p1Letters: number;
    p2Letters: number;
    calledTrick: string;
    currentMessage: string;
    namesModalVisible: boolean;
}

export const getInitialState = (
    props: ActiveGameProps | null,
    user: User | null,
    currentRoundNumber: React.MutableRefObject<number>
): InitialGameState => {
    const currentUserUsername = user?.username || 'Player 1';

    let gameId: number | -1 = -1;
    let p1Username = currentUserUsername;
    let p2Username = '';
    let p1User: GamePlayer | null = null;
    let p2User: GamePlayer | null = null;
    let whosSet = currentUserUsername;
    let p1Letters = 0;
    let p2Letters = 0;
    let namesModalVisible = true;
    let calledTrick = 'Awaiting set call...';
    let currentMessage = 'Welcome to Laps 1v1!';

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