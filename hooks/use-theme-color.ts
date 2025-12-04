import { Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ThemeKey = keyof typeof Theme;

export function useThemeColor(
    props: { light?: string; dark?: string },
    colorName: ThemeKey
): string {
    const theme = useColorScheme() ?? 'light'; // 'light' or 'dark'
    const colorFromProps = props[theme];

    if (colorFromProps) {
        return colorFromProps;
    } else {
        return Theme[colorName];
    }
}
