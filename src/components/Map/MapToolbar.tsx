import React from 'react';
import { Paper, Tooltip, IconButton, Divider, useTheme, Fade } from '@mui/material';
import { Mouse, TripOrigin, AddLocation, LocationOn, Clear } from '@mui/icons-material';

interface MapToolbarProps {
    selectionMode: 'auto' | 'start' | 'end' | 'via';
    setSelectionMode: (mode: 'auto' | 'start' | 'end' | 'via') => void;
    onClear: () => void;
    hasRoute: boolean;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({ selectionMode, setSelectionMode, onClear, hasRoute }) => {
    const theme = useTheme();

    // 封装一个符合 MD3 状态的按钮
    const ModeButton = ({ mode, icon, label, color }: { mode: 'auto' | 'start' | 'end' | 'via', icon: React.ReactNode, label: string, color: string }) => {
        const isSelected = selectionMode === mode;
        return (
            <Tooltip title={label} placement="left" arrow>
                <IconButton
                    onClick={() => setSelectionMode(mode)}
                    sx={{
                        // 选中时显示 Tonal 背景，未选中透明
                        bgcolor: isSelected ? color : 'transparent',
                        color: isSelected ? '#fff' : 'text.secondary',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            bgcolor: isSelected ? color : 'action.hover',
                            transform: 'scale(1.1)'
                        },
                        width: 40,
                        height: 40,
                    }}
                >
                    {icon}
                </IconButton>
            </Tooltip>
        );
    };

    return (
        <Fade in={true} timeout={800}>
            <Paper
                elevation={3}
                sx={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    zIndex: 100,
                    p: 0.75,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    // 关键：胶囊形状 + 毛玻璃
                    borderRadius: 8,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                }}
            >
                <ModeButton 
                    mode="auto" 
                    label="智能选择 (点击设置起点/终点)" 
                    icon={<Mouse fontSize="small" />} 
                    color={theme.palette.primary.main} 
                />
                
                <Divider sx={{ mx: 1, opacity: 0.5 }} />
                
                <ModeButton 
                    mode="start" 
                    label="设置起点" 
                    icon={<TripOrigin fontSize="small" />} 
                    color={theme.palette.success.main} 
                />
                <ModeButton 
                    mode="via" 
                    label="添加途经点" 
                    icon={<AddLocation fontSize="small" />} 
                    color={theme.palette.warning.main} 
                />
                <ModeButton 
                    mode="end" 
                    label="设置终点" 
                    icon={<LocationOn fontSize="small" />} 
                    color={theme.palette.error.main} 
                />

                {/* 只有当有路线时才显示清除按钮，增加动态感 */}
                {hasRoute && (
                    <>
                        <Divider sx={{ mx: 1, opacity: 0.5 }} />
                        <Tooltip title="清除路线 / 重置视图" placement="left" arrow>
                            <IconButton
                                size="small"
                                onClick={onClear}
                                sx={{
                                    color: 'error.main',
                                    bgcolor: 'error.container',
                                    '&:hover': { bgcolor: 'error.main', color: 'white' }
                                }}
                            >
                                <Clear fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
            </Paper>
        </Fade>
    );
};