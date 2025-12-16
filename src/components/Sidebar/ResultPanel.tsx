import React from 'react';
import { Box, Typography, Fade, IconButton } from '@mui/material';
import { DirectionsSubway, Close } from '@mui/icons-material';
import type { RouteResult } from '../../types';
import { RouteResultTimeline } from '../RouteResult/RouteTimeline';

interface ResultPanelProps {
    result: RouteResult | null;
    onClose: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ result, onClose }) => {
    if (!result) {
        return (
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 3,
                    textAlign: 'center',
                    color: 'text.secondary'
                }}
            >
                <DirectionsSubway sx={{ fontSize: 60, mb: 2, opacity: 0.2 }} />
                <Typography variant="h6" gutterBottom>暂无路线数据</Typography>
                <Typography variant="body2">
                    请在左侧规划路线，计算结果将在这里显示。
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
            {/* Header */}
            <Box sx={{
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Typography variant="h6" fontWeight="bold">
                    规划结果
                </Typography>
                <IconButton size="small" onClick={onClose}>
                    <Close />
                </IconButton>
            </Box>

            {/* Content */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                <Fade in key={result.totalTimeSec}>
                    <Box>
                        <RouteResultTimeline result={result} />
                    </Box>
                </Fade>
            </Box>
        </Box>
    );
};