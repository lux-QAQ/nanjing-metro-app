import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { getAppTheme } from '../theme';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  sourceColor: string;
  setSourceColor: (color: string) => void;
}

// 默认使用南京地铁蓝作为初始色
const DEFAULT_COLOR = '#006495';

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => { },
  sourceColor: DEFAULT_COLOR,
  setSourceColor: () => { },
});

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('app_theme_mode');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [sourceColor, setSourceColorState] = useState<string>(() => {
    return localStorage.getItem('app_source_color') || DEFAULT_COLOR;
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('app_theme_mode', next ? 'dark' : 'light');
      return next;
    });
  };

  const setSourceColor = (color: string) => {
    setSourceColorState(color);
    localStorage.setItem('app_source_color', color);
  };

  // 动态生成 MUI Theme 对象
  const theme = useMemo(() => {
    return getAppTheme(isDarkMode ? 'dark' : 'light', sourceColor);
  }, [isDarkMode, sourceColor]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, sourceColor, setSourceColor }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};