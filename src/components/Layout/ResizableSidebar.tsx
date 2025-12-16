import React, { useCallback, useEffect, useState } from 'react';
import { Box, Paper, IconButton, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight, DragHandle } from '@mui/icons-material';

interface ResizableSidebarProps {
  side: 'left' | 'right';
  width: number;
  setWidth: (width: number) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
}

export const ResizableSidebar: React.FC<ResizableSidebarProps> = ({
  side,
  width,
  setWidth,
  isOpen,
  setIsOpen,
  children,
  minWidth = 280,
  maxWidth = 600
}) => {
  const theme = useTheme();
  const [isDragging, setIsDragging] = useState(false);

  // 处理拖拽逻辑
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    let newWidth = width;
    if (side === 'left') {
      newWidth = e.clientX;
    } else {
      newWidth = window.innerWidth - e.clientX;
    }

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth);
    }
  }, [isDragging, width, side, minWidth, maxWidth, setWidth]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // 防止拖拽时选中文字
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 切换按钮图标逻辑
  const ToggleIcon = side === 'left'
    ? (isOpen ? ChevronLeft : ChevronRight)
    : (isOpen ? ChevronRight : ChevronLeft);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: side === 'left' ? 'row' : 'row-reverse',
      height: '100%',
      zIndex: theme.zIndex.drawer,
      position: 'relative'
    }}>
      {/* 侧边栏主体 */}
      <Paper
        elevation={0} // 移除阴影，MD3 侧边栏通常是平铺或低层级
        square
        sx={{
          width: isOpen ? width : 0,
          height: '100%',
          overflow: 'hidden',
          transition: isDragging ? 'none' : theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          // 修改：半透明 + 模糊
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(30, 30, 30, 0.9)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRight: side === 'left' ? 1 : 0,
          borderLeft: side === 'right' ? 1 : 0,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ width: width, height: '100%', overflow: 'hidden' }}>
          {children}
        </Box>
      </Paper>

      {/* 拖拽手柄与切换按钮容器 */}
      <Box
        sx={{
          width: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          borderRight: side === 'left' ? 1 : 0,
          borderLeft: side === 'right' ? 1 : 0,
          borderColor: 'divider',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* 拖拽区域 */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: side === 'left' ? 0 : 'auto',
            right: side === 'right' ? 0 : 'auto',
            width: '100%',
            cursor: 'col-resize',
            '&:hover': {
              bgcolor: 'action.hover'
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <DragHandle sx={{ fontSize: 14, color: 'text.disabled', transform: 'rotate(90deg)' }} />
        </Box>

        {/* 切换按钮 (浮动在中间) */}
        <IconButton
          size="small"
          onClick={() => setIsOpen(!isOpen)}
          sx={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: 'background.paper',
            boxShadow: 2,
            width: 24,
            height: 24,
            zIndex: 2,
            '&:hover': { bgcolor: 'primary.main', color: 'white' },
            // 根据方向微调位置，使其骑在边线上
            left: side === 'left' ? 4 : 'auto',
            right: side === 'right' ? 4 : 'auto',
          }}
        >
          <ToggleIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};