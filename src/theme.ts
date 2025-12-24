import { createTheme, type ThemeOptions, type PaletteColorOptions } from '@mui/material/styles';
import { generateMd3Palette } from './utils/themeUtils';

//  1. 扩展 MUI 类型定义以支持 MD3 
declare module '@mui/material/styles' {
  interface Palette {
    tertiary: PaletteColor;
    surface: {
      main: string;
      onSurface: string;
      variant: string;
      onVariant: string;
      containerHighest: string;
      containerHigh: string;
      container: string;
      containerLow: string;
      containerLowest: string;
      dim: string;
      bright: string;
    };
    outline: string;
    outlineVariant: string;
  }
  interface PaletteOptions {
    tertiary?: PaletteColorOptions;
    surface?: {
      main?: string;
      onSurface?: string;
      variant?: string;
      onVariant?: string;
      containerHighest?: string;
      containerHigh?: string;
      container?: string;
      containerLow?: string;
      containerLowest?: string;
      dim?: string;
      bright?: string;
    };
    outline?: string;
    outlineVariant?: string;
  }

  // 修复：扩展 PaletteColor 以包含 MD3 的 onPrimary, container 等属性
  interface PaletteColor {
    container: string;
    onContainer: string;
    onPrimary?: string; // 解决 ts(2339)
    onSecondary?: string;
  }
  interface SimplePaletteColorOptions {
    container?: string;
    onContainer?: string;
    onPrimary?: string;
    onSecondary?: string;
  }
}

//  2. 基础组件样式覆盖 
const baseOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 20, textTransform: 'none', fontWeight: 600 },
        contained: ({ theme }) => ({
          backgroundColor: theme.palette.primary.main,
          // 修复：现在 TS 知道 onPrimary 存在了
          color: theme.palette.primary.onPrimary || theme.palette.primary.contrastText,
          boxShadow: 'none',
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: '0px 1px 3px rgba(0,0,0,0.3)',
            // 优化：使用叠色层模拟 MD3 State Layer，而不是直接改背景色
            // 这会在原色上叠加一层 8% 透明度的白色，看起来更自然
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08))',
          },
          '&:active': {
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.12))',
          }
        }),
        outlined: ({ theme }) => ({
          borderColor: theme.palette.outline,
        })
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          backgroundColor: theme.palette.surface?.container || theme.palette.background.paper,
        }),
        // 确保所有 Paper 都有统一的圆角
        rounded: {
          borderRadius: 16,
        },
        elevation1: ({ theme }) => ({
          backgroundColor: theme.palette.surface?.containerLow,
          boxShadow: '0px 1px 2px rgba(0,0,0,0.12)',
        }),
        elevation2: ({ theme }) => ({
          backgroundColor: theme.palette.surface?.container,
          boxShadow: '0px 2px 4px rgba(0,0,0,0.12)',
        }),
      },
    },
    // 美化 Autocomplete 下拉列表
    MuiAutocomplete: {
      styleOverrides: {
        paper: ({ theme }) => ({
          marginTop: 8,
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)', // 更柔和的阴影
          border: `1px solid ${theme.palette.outlineVariant}`, // 增加微弱边框
        }),
        listbox: {
          padding: 8,
          '& .MuiAutocomplete-option': {
            borderRadius: 12, // 选项也使用圆角
            marginBottom: 2,
            transition: 'background-color 0.2s',
            '&[aria-selected="true"]': {
              backgroundColor: 'rgba(var(--mui-palette-primary-mainChannel), 0.12)',
            },
            '&:hover': {
              backgroundColor: 'rgba(var(--mui-palette-primary-mainChannel), 0.08)',
            }
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.surface?.container,
          color: theme.palette.text.primary,
        })
      }
    },
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          scrollbarColor: `${theme.palette.outlineVariant} transparent`,
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: "8px",
            backgroundColor: theme.palette.outlineVariant,
            minHeight: "24px",
            border: "2px solid transparent",
            backgroundClip: "content-box",
          },
          "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
            backgroundColor: theme.palette.outline,
          },
        },
      }),
    },
  },
};

//  3. 动态主题生成函数 
export const getAppTheme = (mode: 'light' | 'dark', sourceColor: string) => {
  const md3Palette = generateMd3Palette(sourceColor, mode);

  return createTheme({
    ...baseOptions,
    palette: {
      ...md3Palette,
      divider: md3Palette.outlineVariant,
      text: {
        primary: md3Palette.surface.onSurface,
        secondary: md3Palette.surface.onVariant,
      },
      action: {
        active: md3Palette.surface.onVariant,
        hover: md3Palette.surface.containerHighest,
        selected: md3Palette.secondary.container,
      }
    },
  });
};