import React from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, IconButton, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const DRAWER_WIDTH = 400;

interface MainLayoutProps {
  sidebar: React.ReactNode;
  map: React.ReactNode;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, map, toggleTheme, isDarkMode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* AppBar: 固定在顶部，层级高于 Drawer */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: '100%' // 确保 AppBar 占满全屏
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '1.5rem' }}>🚇</span> 南京地铁通
          </Typography>
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar: 侧边栏 */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* 移动端抽屉 */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          <Toolbar />
          {sidebar}
        </Drawer>
        
        {/* 桌面端固定侧边栏 */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: 'none', boxShadow: 4 },
          }}
          open
        >
          <Toolbar />
          {sidebar}
        </Drawer>
      </Box>

      {/* Main Content: 主内容区 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          // 关键：使用 calc 计算宽度，确保不被挤压
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, 
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default'
        }}
      >
        <Toolbar /> {/* 占位符 */}
        
        {/* 地图容器 */}
        <Box sx={{ flexGrow: 1, width: '100%', position: 'relative' }}>
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}>
            {map}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};