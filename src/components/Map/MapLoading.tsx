import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';
import { DirectionsSubway } from '@mui/icons-material';

export const MapLoading: React.FC = () => (
    <Fade in={true} timeout={500}>
        <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.6)', // 浅色遮罩
            backdropFilter: 'blur(4px)', // 背景模糊
            zIndex: 10,
            gap: 2
        }}>
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress
                    size={60}
                    thickness={4}
                    sx={{ color: 'primary.main', opacity: 0.2 }}
                    variant="determinate"
                    value={100}
                />
                <CircularProgress
                    size={60}
                    thickness={4}
                    sx={{ color: 'primary.main', position: 'absolute', left: 0 }}
                />
                <DirectionsSubway sx={{ position: 'absolute', color: 'primary.main' }} />
            </Box>

            <Typography variant="body2" fontWeight="bold" color="text.secondary" sx={{ letterSpacing: 1 }}>
                正在构建地铁网络...
            </Typography>
        </Box>
    </Fade>
);