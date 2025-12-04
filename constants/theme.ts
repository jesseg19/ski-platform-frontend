import { Platform } from 'react-native';

// --- Core Palette Definitions ---
const SKI_PRIMARY_BLUE = '#528dbdff'; // Main interactive color (e.g., links, focused buttons)
const SKI_SECONDARY_BLUE = '#E5E7EB';
const SKI_ACCENT_ORANGE = '#FF9500'; // Secondary interactive color (e.g., an 'action' button)
const SKI_DANGER_RED = '#EF4444';
const SKI_SUCCESS_GREEN = '#10B981';

const BLACK = '#000000';
const WHITE = '#FFFFFF';

// Light/Dark specific colors for readability
const COLOR_DARK_BG = '#1C1C1E';   // Near-black for dark mode background
const COLOR_DARK_GRAY = '#2C2C2E'; // Dark gray for card/secondary bg in dark mode
const COLOR_LIGHT_BG = '#efefefff';  // Very light background (lighter than EFEFF4)
const COLOR_MEDIUM_BG = '#d4d4d6ff';  // Off-white for light mode card/secondary bg
const COLOR_DARK_TEXT = '#333333';
const COLOR_LIGHT_TEXT = '#E0E0E0';


export type ColorTheme = {
  text: string;
  background: string;
  mediumBackground: string;
  cardBackground: string;
  buttonBackground: string;
  secondaryButtonBackground: string;
  border: string;
  overlay: string;
  // Interactive colors
  primary: string; // The main blue for buttons
  secondary: string; // The secondary blue for buttons
  accent: string;  // A secondary action color (your orange)
  danger: string;  // For errors, fails
  success: string; // For lands, success
  warning: string; // For paused games
  // Specific Utility Colors
  darkText: string;
  lightText: string;
  placeholder: string;
  gold: string;
  silver: string;
  bronze: string;
};

export const LightTheme: ColorTheme = {
  text: COLOR_LIGHT_TEXT,
  background: COLOR_LIGHT_BG,
  mediumBackground: COLOR_MEDIUM_BG,
  cardBackground: WHITE,
  buttonBackground: SKI_PRIMARY_BLUE,
  secondaryButtonBackground: SKI_SECONDARY_BLUE,
  border: '#D0E0F0', // Input/separator border
  overlay: 'rgba(0, 0, 0, 0.4)',

  primary: SKI_PRIMARY_BLUE,
  secondary: SKI_SECONDARY_BLUE,
  accent: SKI_ACCENT_ORANGE,
  danger: SKI_DANGER_RED,
  success: SKI_SUCCESS_GREEN,
  warning: '#FFC300', // For paused games

  darkText: COLOR_DARK_TEXT,
  lightText: WHITE,
  placeholder: '#888888',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};


export const Theme = LightTheme;

// export const DarkTheme: ColorTheme = {
//   text: COLOR_LIGHT_TEXT,
//   background: COLOR_DARK_BG,
//   cardBackground: COLOR_DARK_GRAY,
//   border: '#404045',  // Lighter border for contrast in dark mode
//   overlay: 'rgba(0, 0, 0, 0.7)',

//   primary: SKI_PRIMARY_BLUE,
//   accent: SKI_ACCENT_ORANGE,
//   danger: SKI_DANGER_RED,
//   success: SKI_SUCCESS_GREEN,

//   darkText: COLOR_DARK_TEXT, // Use for elements that should always be dark (rare)
//   lightText: WHITE,
//   gold: '#FFD700',
//   silver: '#C0C0C0',
//   bronze: '#CD7F32',
// };

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
