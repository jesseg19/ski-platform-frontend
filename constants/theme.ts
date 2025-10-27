import { Platform } from 'react-native';

// --- New Ski-Themed Palette ---
const SKI_PRIMARY_BLUE = '#007AFF'; // A bright, energetic blue (like fresh snow or sky)
const SKI_ACCENT_ORANGE = '#FF9500'; // A high-contrast orange for buttons/accents (like safety gear)
const SKI_DANGER_RED = '#FF3B30';   // Used for fails/errors
const SKI_SUCCESS_GREEN = '#34C759'; // Used for lands/success
const SKI_DARK_GRAY = '#1C1C1E';    // Near-black for dark mode background
const SKI_LIGHT_GRAY = '#EFEFF4';   // Off-white for light mode background


export const Colors = {
  greenButton: '#85E34A',
  darkBlue: '#406080',
  textGrey: '#555',
  darkText: '#333',
  white: '#FFFFFF',
  lightBlue: '#F0F8FF', // Light background/container color
  inputBorder: '#D0E0F0',
  overlay: 'rgba(0, 0, 0, 0.4)',
  danger: '#E74C3C',
  success: '#85E34A',
  light: {
    text: SKI_DARK_GRAY,
    background: SKI_LIGHT_GRAY,
    tint: SKI_PRIMARY_BLUE, // Main interactive color
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: SKI_PRIMARY_BLUE,
    // New specific colors
    primary: SKI_PRIMARY_BLUE,
    accent: SKI_ACCENT_ORANGE,
    danger: SKI_DANGER_RED,
    success: SKI_SUCCESS_GREEN,
  },
  dark: {
    text: SKI_LIGHT_GRAY,
    background: SKI_DARK_GRAY,
    tint: SKI_ACCENT_ORANGE, // High-contrast for dark mode
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: SKI_ACCENT_ORANGE,
    // New specific colors
    primary: SKI_PRIMARY_BLUE,
    accent: SKI_ACCENT_ORANGE,
    danger: SKI_DANGER_RED,
    success: SKI_SUCCESS_GREEN,
  },
};

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
