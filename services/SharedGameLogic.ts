interface RoundResolutionPayload {
    setterUsername: string;
    receiverUsername: string;
    trickDetails: string;
    setterLanded: boolean;
    receiverLanded: boolean;
    letterAssignToUsername: string;
}

const GAME_LETTERS = ['S', 'K', 'I'];

export const getNextLetterString = (currentLetters: string): string => {
    // If empty or null, first letter is S
    if (!currentLetters || currentLetters === 'No letters') return 'S';

    const nextIndex = currentLetters.length;
    if (nextIndex >= GAME_LETTERS.length) return currentLetters; // Already at maximum

    return currentLetters + GAME_LETTERS[nextIndex];
};

/**
 * Calculates the Round Resolution payload required to force a letter onto a specific player.
 */
export const calculateForceLetterPayload = (
    p1Username: string,
    p2Username: string,
    whosSet: string,
    targetPlayerForLetter: string
): RoundResolutionPayload => {

    let setterLanded = false;
    let receiverLanded = false;

    if (targetPlayerForLetter === p1Username && whosSet === p1Username) {
        setterLanded = false;
        receiverLanded = true;
    } else if (targetPlayerForLetter === p1Username && whosSet !== p1Username) {
        setterLanded = true;
        receiverLanded = false;
    } else if (targetPlayerForLetter === p2Username && whosSet !== p2Username) {
        setterLanded = true;
        receiverLanded = false;
    } else if (targetPlayerForLetter === p2Username && whosSet === p2Username) {
        setterLanded = false;
        receiverLanded = true;
    }

    return {
        setterUsername: whosSet,
        receiverUsername: whosSet === p1Username ? p2Username : p1Username,
        trickDetails: 'Letter added via Notification', // Or 'Letter added without trick'
        setterLanded,
        receiverLanded,
        letterAssignToUsername: targetPlayerForLetter
    };
};