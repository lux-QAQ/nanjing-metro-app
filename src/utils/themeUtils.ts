import { 
  argbFromHex, 
  hexFromArgb, 
  SchemeTonalSpot, 
  Hct
} from '@material/material-color-utilities';
// 修复：使用 import type，否则会导致 "does not provide an export" 运行时错误
import type { PaletteOptions } from '@mui/material';

// 将 MCU 的 Scheme 转换为 MUI 的 PaletteOptions
const mapSchemeToPalette = (scheme: any, mode: 'light' | 'dark') => {
  return {
    mode,
    primary: {
      main: hexFromArgb(scheme.primary),
      onPrimary: hexFromArgb(scheme.onPrimary),
      container: hexFromArgb(scheme.primaryContainer),
      onContainer: hexFromArgb(scheme.onPrimaryContainer),
    },
    secondary: {
      main: hexFromArgb(scheme.secondary),
      onSecondary: hexFromArgb(scheme.onSecondary),
      container: hexFromArgb(scheme.secondaryContainer),
      onContainer: hexFromArgb(scheme.onSecondaryContainer),
    },
    tertiary: {
      main: hexFromArgb(scheme.tertiary),
      onTertiary: hexFromArgb(scheme.onTertiary),
      container: hexFromArgb(scheme.tertiaryContainer),
      onContainer: hexFromArgb(scheme.onTertiaryContainer),
    },
    error: {
      main: hexFromArgb(scheme.error),
      onError: hexFromArgb(scheme.onError),
      container: hexFromArgb(scheme.errorContainer),
      onContainer: hexFromArgb(scheme.onErrorContainer),
    },
    background: {
      default: hexFromArgb(scheme.background),
      paper: hexFromArgb(scheme.surface),
    },
    surface: {
      main: hexFromArgb(scheme.surface),
      onSurface: hexFromArgb(scheme.onSurface),
      variant: hexFromArgb(scheme.surfaceVariant),
      onVariant: hexFromArgb(scheme.onSurfaceVariant),
      containerHighest: hexFromArgb(scheme.surfaceContainerHighest),
      containerHigh: hexFromArgb(scheme.surfaceContainerHigh),
      container: hexFromArgb(scheme.surfaceContainer),
      containerLow: hexFromArgb(scheme.surfaceContainerLow),
      containerLowest: hexFromArgb(scheme.surfaceContainerLowest),
      dim: hexFromArgb(scheme.surfaceDim),
      bright: hexFromArgb(scheme.surfaceBright),
    },
    outline: hexFromArgb(scheme.outline),
    outlineVariant: hexFromArgb(scheme.outlineVariant),
  };
};

export const generateMd3Palette = (sourceColorHex: string, mode: 'light' | 'dark') => {
  const sourceArgb = argbFromHex(sourceColorHex);
  const hct = Hct.fromInt(sourceArgb);
  const scheme = new SchemeTonalSpot(hct, mode === 'dark', 0.0);
  return mapSchemeToPalette(scheme, mode);
};