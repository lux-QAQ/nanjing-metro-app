import React, { useState } from 'react';
import { Box, CssBaseline, AppBar, Toolbar, Typography, IconButton, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { ResizableSidebar } from './ResizableSidebar';
import { ThemeSelector } from './ThemeSelector'; // 导入新组件

interface MainLayoutProps {
  leftSidebar: React.ReactNode;
  rightSidebar: React.ReactNode;
  map: React.ReactNode;
  toggleTheme: () => void;
  isDarkMode: boolean;
  // 控制右侧栏是否自动打开
  isRightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  leftSidebar,
  rightSidebar,
  map,
  toggleTheme,
  isDarkMode,
  isRightSidebarOpen,
  setRightSidebarOpen
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 侧边栏状态管理
  const [leftWidth, setLeftWidth] = useState(360);
  const [rightWidth, setRightWidth] = useState(360);
  const [isLeftOpen, setLeftOpen] = useState(true);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />

      {/* AppBar: 优化高度和颜色 */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          // 修改：使用半透明背景 + 背景模糊
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(30, 30, 30, 0.8)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)', // 关键：毛玻璃效果
          color: theme.palette.text.primary, // 适配半透明背景，通常使用主文本色
          height: '56px', // MD3 标准高度通常稍高一点，或者保持 48px
          display: 'flex',
          justifyContent: 'center',
          // 增加底部微弱的渐变边框效果
          borderBottom: 'none',
          boxShadow: '0 1px 0 0 rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.02)',
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: '56px !important' }}> {/* 增加高度到 56px */}
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Logo 图标 */}
            <Box sx={{
              width: 32, height: 32, borderRadius: 1,
              bgcolor: 'primary.main', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <span style={{ fontSize: '1.2rem' }}>🚇</span>
            </Box>

            {/* 渐变文字 Logo */}
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontWeight: 900,
                letterSpacing: '-0.5px',
                background: theme.palette.mode === 'dark'
                  ? `linear-gradient(45deg, #fff 30%, ${theme.palette.primary.light} 90%)`
                  : `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              南京地铁通
            </Typography>
          </Box>

          {/* 插入主题选择器 */}
          <ThemeSelector />

          <Tooltip title={isDarkMode ? "切换到亮色模式" : "切换到深色模式"}>
            <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit" size="small">
              {isDarkMode ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* 布局容器：顶部留出 AppBar 高度 (48px) */}
      <Box sx={{ display: 'flex', width: '100%', pt: '48px', height: '100%' }}>

        {/* 左侧：规划输入 */}
        {!isMobile && (
          <ResizableSidebar
            side="left"
            width={leftWidth}
            setWidth={setLeftWidth}
            isOpen={isLeftOpen}
            setIsOpen={setLeftOpen}
          >
            {leftSidebar}
          </ResizableSidebar>
        )}

        {/* 中间：地图区域 */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            position: 'relative',
            height: '100%',
            overflow: 'hidden',
            bgcolor: 'background.default',
            transition: 'background-color 0.3s' // 背景色切换动画
          }}
        >
          {map}
        </Box>

        {/* 右侧：结果展示 */}
        {!isMobile && (
          <ResizableSidebar
            side="right"
            width={rightWidth}
            setWidth={setRightWidth}
            isOpen={isRightSidebarOpen}
            setIsOpen={setRightSidebarOpen}
          >
            {rightSidebar}
          </ResizableSidebar>
        )}
      </Box>
    </Box>
  );
};