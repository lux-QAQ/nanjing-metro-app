import React from 'react';
import {
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Chip,
    Paper,
    Stack,
    Divider,
    useTheme
} from '@mui/material';
import {
    TripOrigin,
    LocationOn,
    DirectionsSubway,
    TransferWithinAStation,
    AccessTime,
    Straighten,
    SwapCalls
} from '@mui/icons-material';
import type { RouteResult, RouteStep } from '../../types';
import { graphService } from '../../services/Graph';

interface RouteTimelineProps {
    result: RouteResult;
}

export const RouteResultTimeline: React.FC<RouteTimelineProps> = ({ result }) => {
    const theme = useTheme();

    // 格式化时间 (秒 -> 分钟)
    const formatTime = (seconds: number) => {
        const mins = Math.ceil(seconds / 60);
        if (mins < 60) return `${mins}分钟`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}小时${remainingMins}分钟`;
    };

    // 获取线路颜色
    const getLineColor = (lineId?: string) => {
        if (!lineId) return theme.palette.grey[500];
        return graphService.getLineColor(lineId);
    };

    // 自定义 Step Icon
    const StepIcon = (props: { step: RouteStep }) => {
        const { step } = props;
        const color = getLineColor(step.lineId);

        if (step.type === 'start') return <TripOrigin sx={{ color: theme.palette.success.main }} />;
        if (step.type === 'end') return <LocationOn sx={{ color: theme.palette.error.main }} />;
        if (step.type === 'transfer') return <TransferWithinAStation sx={{ color: theme.palette.warning.main }} />;

        // 普通移动步骤，显示线路颜色的小圆点
        return (
            <Box
                sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: `2px solid ${theme.palette.background.paper}`,
                    boxShadow: 1
                }}
            />
        );
    };

    return (
        <Box>
            {/* 1. 概览卡片 */}
            <Paper
                elevation={0}
                variant="outlined"
                sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    borderRadius: 3
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h5" fontWeight="bold">
                        {formatTime(result.totalTimeSec)}
                    </Typography>
                    <Chip
                        label={`${result.totalTransfers} 次换乘`}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }}
                    />
                </Stack>

                <Stack direction="row" spacing={2} sx={{ opacity: 0.9 }}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <Straighten fontSize="small" />
                        <Typography variant="body2">{result.totalDistanceKm} km</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <DirectionsSubway fontSize="small" />
                        <Typography variant="body2">{result.totalStops} 站</Typography>
                    </Box>
                </Stack>
            </Paper>

            {/* 2. 路线详情 (Stepper) */}
            <Stepper orientation="vertical" sx={{ px: 1 }}>
                {result.steps.map((step, index) => {
                    const isLast = index === result.steps.length - 1;
                    const lineColor = getLineColor(step.lineId);

                    return (
                        <Step key={index} active expanded>
                            <StepLabel
                                StepIconComponent={() => <StepIcon step={step} />}
                                sx={{ py: 0 }}
                            >
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Typography variant="subtitle1" fontWeight={step.type === 'transfer' ? 'bold' : 'medium'}>
                                        {step.type === 'transfer'
                                            ? `在 ${step.stationId} 换乘`
                                            : step.stationId}
                                    </Typography>

                                    {/* 如果是换乘或起点，显示线路徽章 */}
                                    {(step.type === 'start' || step.type === 'transfer') && step.lineId && (
                                        <Chip
                                            label={`${step.lineId}号线`}
                                            size="small"
                                            sx={{
                                                bgcolor: lineColor,
                                                color: '#fff',
                                                height: 20,
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    )}
                                </Box>
                            </StepLabel>

                            <StepContent sx={{ borderLeft: `2px solid ${lineColor}`, ml: '11px', pl: 3, py: 1 }}>
                                {step.type === 'move' && (
                                    <Box sx={{ color: 'text.secondary', my: 0.5 }}>
                                        <Typography variant="caption" display="block">
                                            乘坐 {step.lineId}号线
                                        </Typography>
                                        <Typography variant="caption" display="block">
                                            {step.distanceKm} km · {Math.ceil(step.durationSec / 60)} 分钟
                                        </Typography>
                                    </Box>
                                )}

                                {step.type === 'transfer' && (
                                    <Typography variant="caption" color="warning.main">
                                        站内换乘 · 约 {Math.ceil(step.durationSec / 60)} 分钟
                                    </Typography>
                                )}
                            </StepContent>
                        </Step>
                    );
                })}
            </Stepper>
        </Box>
    );
};