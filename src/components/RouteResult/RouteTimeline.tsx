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
    useTheme,
    Divider
} from '@mui/material';
import {
    TripOrigin,
    LocationOn,
    DirectionsSubway,
    TransferWithinAStation,
    Straighten,
    Flag
} from '@mui/icons-material';
import type { RouteResult, RouteStep } from '../../types';
import { graphService } from '../../services/Graph';

interface RouteTimelineProps {
    result: RouteResult;
    viaStationIds?: string[];
}

export const RouteResultTimeline: React.FC<RouteTimelineProps> = ({ result, viaStationIds = [] }) => {
    const theme = useTheme();

    const formatTime = (seconds: number) => {
        const mins = Math.ceil(seconds / 60);
        if (mins < 60) return `${mins}分钟`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}小时${remainingMins}分钟`;
    };

    const getLineColor = (lineId?: string) => {
        if (!lineId) return theme.palette.grey[400];
        return graphService.getLineColor(lineId);
    };

    const StepIcon = (props: { step: RouteStep }) => {
        const { step } = props;
        const color = getLineColor(step.lineId);
        const isVia = viaStationIds.includes(step.stationId);

        // 统一容器宽度为 32px，确保中心在 16px
        const IconWrapper = ({ children }: { children: React.ReactNode }) => (
            <Box sx={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                bgcolor: 'background.paper'
            }}>
                {children}
            </Box>
        );

        if (step.type === 'start') {
            return (
                <IconWrapper>
                    <TripOrigin sx={{ color: theme.palette.success.main, fontSize: 24 }} />
                </IconWrapper>
            );
        }

        if (step.type === 'end') {
            return (
                <IconWrapper>
                    <LocationOn sx={{ color: theme.palette.error.main, fontSize: 24 }} />
                </IconWrapper>
            );
        }

        if (isVia) {
            return (
                <IconWrapper>
                    <Flag sx={{ color: theme.palette.warning.main, fontSize: 22 }} />
                </IconWrapper>
            );
        }

        if (step.type === 'transfer') {
            return (
                <IconWrapper>
                    <TransferWithinAStation sx={{ color: theme.palette.info.main, fontSize: 20 }} />
                </IconWrapper>
            );
        }

        return (
            <IconWrapper>
                <Box
                    sx={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: 'background.paper',
                        border: `4px solid ${color}`,
                        boxShadow: '0 0 0 2px rgba(0,0,0,0.05)'
                    }}
                />
            </IconWrapper>
        );
    };

    return (
        <Box>
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.container} 0%, ${theme.palette.surface.containerHigh} 100%)`,
                    color: 'primary.onContainer',
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Box sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    opacity: 0.1
                }} />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 'bold', letterSpacing: 1 }}>
                            预计耗时
                        </Typography>
                        <Typography variant="h4" fontWeight="800" sx={{ lineHeight: 1 }}>
                            {formatTime(result.totalTimeSec)}
                        </Typography>
                    </Box>

                    <Chip
                        icon={<TransferWithinAStation style={{ color: 'inherit' }} />}
                        label={`${result.totalTransfers} 次换乘`}
                        sx={{
                            bgcolor: 'background.paper',
                            color: 'primary.main',
                            fontWeight: 'bold',
                            boxShadow: 1
                        }}
                    />
                </Stack>

                <Divider sx={{ borderColor: 'primary.main', opacity: 0.1, my: 1 }} />

                <Stack direction="row" spacing={3}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Straighten fontSize="small" sx={{ opacity: 0.7 }} />
                        <Typography variant="body2" fontWeight="medium">{result.totalDistanceKm} km</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <DirectionsSubway fontSize="small" sx={{ opacity: 0.7 }} />
                        <Typography variant="body2" fontWeight="medium">{result.totalStops} 站</Typography>
                    </Box>
                </Stack>
            </Paper>

            <Stepper
                orientation="vertical"
                connector={null}
                sx={{
                    px: 1,
                    '& .MuiStepContent-root': {
                        borderLeftWidth: 2,
                        borderLeftStyle: 'dashed',
                        borderColor: 'outlineVariant',
                        ml: '15px', 
                        pl: 3,
                    }
                }}
            >
                {result.steps.map((step, index) => {
                    const isLast = index === result.steps.length - 1;
                    const lineColor = getLineColor(step.lineId);
                    const isVia = viaStationIds.includes(step.stationId);

                    return (
                        <Step key={index} active expanded>
                            <StepLabel
                                StepIconComponent={() => <StepIcon step={step} />}
                                sx={{ py: 0, cursor: 'pointer' }}
                            >
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight={step.type === 'transfer' || step.type === 'start' || step.type === 'end' || isVia ? 'bold' : 'medium'}
                                    >
                                        {step.type === 'transfer'
                                            ? `在 ${step.stationId} 换乘`
                                            : step.stationId}
                                    </Typography>

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

                            {!isLast && (
                                <StepContent sx={{
                                    borderColor: lineColor,
                                    mt: 0,
                                    pb: 2
                                }}>
                                    {/* --- 新增：途经点卡片 --- */}
                                    {isVia && (
                                        <Paper variant="outlined" sx={{
                                            p: 1.5,
                                            mt: 1,
                                            mb: 1, // 增加底部间距，与后续的移动信息隔开
                                            // 使用 warning 容器色，符合 MD3 语义，且与 Flag 图标颜色呼应
                                            bgcolor: 'warning.container', // 浅橙色背景
                                            color: 'warning.onContainer', // 深橙色文字
                                            borderRadius: 3,
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5
                                        }}>
                                            <Flag fontSize="small" color="inherit" />
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">途经此站</Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                    在此站经过
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    )}

                                    {/* 移动段信息 */}
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

                                    {/* 换乘卡片 */}
                                    {step.type === 'transfer' && (
                                        <Paper variant="outlined" sx={{
                                            p: 1.5,
                                            mt: 1,
                                            bgcolor: 'surface.containerHighest',
                                            borderRadius: 3,
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                        }}>
                                            <TransferWithinAStation fontSize="small" color="primary" />
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">站内换乘</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    步行约 {Math.ceil(step.durationSec / 60)} 分钟
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    )}
                                </StepContent>
                            )}
                        </Step>
                    );
                })}
            </Stepper>
        </Box>
    );
};