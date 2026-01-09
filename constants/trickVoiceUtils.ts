import { allTrickTerms } from "@/constants/tricks";

// Remove filler words
const FILLER_WORDS = [
    "i", "I'm", "am", "say", "lets", "want", "do", "a", "try", "gonna", "going", "finna", "uh", "um", "like", "yeah", "hey", "set", "call"
];

//  Map slang and shorthand to official trick names
const SLANG_MAP: Record<string, string> = {
    // Spins
    "1": "180", "2": "270", "20": "270", "3": "360", "4": "450", "5": "540", "6": "630", "7": "720", "8": "810", "9": "900", "10": "1080", "12": "1260", "14": "1440",
    "one": "180", "two": "270", "three": "360", "four": "450", "for": "450", "floor": "450", "five": "540", "seven": "720", "sev": "720", "nine": "900", "ten": "1080", "twelve": "1260",

    // Grabs
    "bleez": "Blunt",
    "blunt": "Blunt",
    "truck driver": "Truck",
    "screamin": "Screamin' Seamen",
    "screaming": "Screamin' Seamen",
    "mute": "Mute",
    "safety": "Safety",


    // Axes
    "dub": "Double",
    "W": "Double",
    "the": "Double",
    "dump": "Double",
    "trip": "Triple",
    "flat": "Flatspin",
    "road": "Rodeo",
    "bio": "Bio",
    "backy": "Backflip",
    "mystify": "Misty 540",
    "mystified": "Misty 540",

    // Rail slang
    "pretz": "Pretzel",
    "parts": "Pretzel",
    "swap": "Swap",
    "front 3 up": "Front 360 swap",
    "back 3 up": "Back 360 swap",
    "back swap": "Back swap",
    "front swap": "Front swap",
    "francois": "Front swap",
    "back": "Backside",
    "front": "Frontside",

    "backs off": "Back swap",
    "box swap": "Back swap",
    "backslot": "Back swap",
    "On": "",
};

const VALID_VOCABULARY = new Set([
    ...allTrickTerms,
    "Cork", "Lead", "Trailing", "High", "Pretzel", "On"
]);


/**
 * Levenshtein distance to find how many edits 
 * exist between two strings.
 */
const getEditDistance = (a: string, b: string): number => {
    const matrix = Array.from({ length: a.length + 1 }, () =>
        Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
};

/**
 * Finds the closest valid trick term. 
 * If no term is close enough, returns null.
 */
const findClosestMatch = (spokenWord: string, vocabulary: Set<string>): string | null => {
    let bestMatch: string | null = null;
    let minDistance = 4; // Maximum character difference allowed 

    for (const validWord of vocabulary) {
        const distance = getEditDistance(spokenWord.toLowerCase(), validWord.toLowerCase());

        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = validWord;
        }
    }
    return bestMatch;
};




export const parseVoiceTrick = (spokenText: string): string => {
    console.log("Raw spoken text:", spokenText);
    console.log("valid text:", VALID_VOCABULARY);

    if (!spokenText) return "";

    // 1. NORMALIZE: Lowercase and remove punctuation
    const cleanRaw = spokenText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    let words = cleanRaw.split(' ');

    // 2. TRANSLATE & CLEAN: Loop through and build the final list
    const finalWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        // Skip fillers


        let nextWord = words[i + 1] ? words[i + 1].toLowerCase() : null;

        // 1. HANDLE MULTI-WORD TOKENS (Look ahead one step)
        const bigram = `${word} ${nextWord}`;
        if (SLANG_MAP[bigram]) {
            finalWords.push(SLANG_MAP[bigram]);
            i++; // Skip the next word since we consumed it
            continue;
        }

        // 2. HANDLE "TO" vs "2"
        if (word === "to" && (nextWord === "switch" || nextWord === "forward")) {
            finalWords.push("To");
            continue;
        }

        // If it's a "to" or "two" that wasn't part of "to switch", it's a rotation
        if (word === "to" || word === "two") {
            finalWords.push("270");
            continue;
        }

        if (FILLER_WORDS.includes(word)) continue;

        // Check Slang Map
        let processedWord = SLANG_MAP[word] || word;

        // Capitalize for Vocabulary Check
        const capitalized = processedWord.charAt(0).toUpperCase() + processedWord.slice(1).toLowerCase();

        // 3. FILTER: Only add if it's in our official ski vocabulary
        if (VALID_VOCABULARY.has(capitalized)) {
            finalWords.push(capitalized);
        } else if (VALID_VOCABULARY.has(processedWord.toUpperCase())) { // Handle "KFED" etc
            finalWords.push(processedWord.toUpperCase());
        } else {
            const fuzzyMatch = findClosestMatch(processedWord, VALID_VOCABULARY);
            if (fuzzyMatch) {
                finalWords.push(fuzzyMatch);
            }
        }
    }

    return finalWords.join(' ');
};