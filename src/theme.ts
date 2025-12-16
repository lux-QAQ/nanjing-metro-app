import { createTheme, type ThemeOptions } from '@mui/material/styles';
import greemTheme from './themes/greem.json';

// 基础配置 (排版、组件默认样式)
const baseOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 20, textTransform: 'none' }, // Material You 风格圆角
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
      },
    },
  },
};

// 辅助函数：将 Material Theme Builder 的 scheme 转换为 MUI Palette
const createPalette = (scheme: any, mode: 'light' | 'dark') => ({
  mode,
  primary: {
    main: scheme.primary,
    onPrimary: scheme.onPrimary,
    container: scheme.primaryContainer,
    onContainer: scheme.onPrimaryContainer,
  },
  secondary: {
    main: scheme.secondary,
    onSecondary: scheme.onSecondary,
    container: scheme.secondaryContainer,
    onContainer: scheme.onSecondaryContainer,
  },
  tertiary: {
    main: scheme.tertiary,
    onTertiary: scheme.onTertiary,
    container: scheme.tertiaryContainer,
    onContainer: scheme.onTertiaryContainer,
  },
  error: {
    main: scheme.error,
    onError: scheme.onError,
    container: scheme.errorContainer,
    onContainer: scheme.onErrorContainer,
  },
  background: {
    default: scheme.background,
    paper: scheme.surface,
  },
  text: {
    primary: scheme.onSurface,
    secondary: scheme.onSurfaceVariant,
  },
});

export const lightTheme = createTheme({
  ...baseOptions,
  palette: createPalette(greemTheme.schemes.light, 'light'),
});

export const darkTheme = createTheme({
  ...baseOptions,
  palette: createPalette(greemTheme.schemes.dark, 'dark'),
});