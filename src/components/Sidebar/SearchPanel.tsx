import React, { useState } from 'react';
import {
  Box, Paper, Typography, Autocomplete, TextField, Button,
  ToggleButton, ToggleButtonGroup, IconButton, Collapse,
  Stack, Tooltip, Fade, Divider, useTheme,
  Stepper, Step, StepLabel, StepContent
} from '@mui/material';
import {
  DirectionsSubway, SwapVert, Settings, AddLocation, Delete,
  TripOrigin, LocationOn, Circle, Close
} from '@mui/icons-material';
import type { AlgorithmConfig, Station } from '../../types';

interface SearchPanelProps {
  stations: Station[];
  startStation: Station | null;
  endStation: Station | null;
  viaStations: Station[];
  onStartChange: (station: Station | null) => void;
  onEndChange: (station: Station | null) => void;
  onViaChange: (stations: Station[]) => void;
  onSearch: (config: AlgorithmConfig) => void;
  onClear: () => void;
  onSwap: () => void;
  hasResult: boolean;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  stations,
  startStation, endStation, viaStations,
  onStartChange, onEndChange, onViaChange,
  onSearch,
  onClear,
  onSwap,
  hasResult
}) => {
  const theme = useTheme();
  // 新增：控制旋转角度的状态
  const [swapRotation, setSwapRotation] = useState(0);
  const [strategy, setStrategy] = useState<'min_stops' | 'min_transfers' | 'min_time'>('min_stops');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [config, setConfig] = useState<AlgorithmConfig>({
    strategy: 'min_stops',
    useRealDistance: true,
    velocityKmH: 80,
    dwellTimeNormalSec: 30,
    dwellTimeTransferSec: 60,
    transferTimeSec: 300,
    viaStations: []
  });

  const handleSearch = () => {
    if (startStation && endStation) {
      onSearch({
        ...config,
        strategy,
        viaStations: viaStations.map(s => s.id)
      });
    }
  };

  // 更新特定索引的途经点
  const handleViaUpdate = (index: number, station: Station | null) => {
    const newVias = [...viaStations];
    if (station) {
      newVias[index] = station;
      onViaChange(newVias);
    } else {
      handleViaDelete(index);
    }
  };

  // 删除特定索引的途经点
  const handleViaDelete = (index: number) => {
    const newVias = [...viaStations];
    newVias.splice(index, 1);
    onViaChange(newVias);
  };

  // --- 自定义图标组件 (保持 32px 宽度以对齐) ---
  const IconWrapper = ({ children }: { children: React.ReactNode }) => (
    <Box sx={{
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
      bgcolor: 'background.paper',
      borderRadius: '50%',
    }}>
      {children}
    </Box>
  );

  const StartIcon = () => (
    <IconWrapper>
      <TripOrigin sx={{ color: 'primary.main', fontSize: 24 }} />
    </IconWrapper>
  );

  const EndIcon = () => (
    <IconWrapper>
      <LocationOn sx={{ color: 'error.main', fontSize: 24 }} />
    </IconWrapper>
  );

  const ViaIcon = () => (
    <IconWrapper>
      <Circle sx={{ width: 10, height: 10, color: 'warning.main' }} />
    </IconWrapper>
  );

  // 新增：处理交换点击
  const handleSwapClick = () => {
    setSwapRotation(prev => prev + 180);
    onSwap();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'transparent' }}>
      <Box sx={{ p: 3, overflowY: 'auto' }}>
        <Typography variant="h5" fontWeight="800" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, color: 'primary.main' }}>
          <DirectionsSubway fontSize="large" />
          路线规划
        </Typography>

        {/* 使用 Stepper 实现完美的对齐和虚线连接 */}
        <Box sx={{ mb: 2 }}>
          <Stepper
            orientation="vertical"
            connector={null} // 禁用默认连接器，使用 StepContent 的边框
            sx={{
              // 核心样式：完全复用 RouteTimeline 的对齐逻辑
              '& .MuiStepContent-root': {
                borderLeftWidth: 2,
                borderLeftStyle: 'dashed',
                borderColor: theme.palette.divider,
                ml: '15px', // 15px margin + 1px border center = 16px center (对应 32px 图标中心)
                pl: 3,
                mt: 0,
              },
              '& .MuiStepLabel-root': {
                p: 0, // 移除默认内边距
              },
              '& .MuiStepLabel-label': {
                width: '100%', // 确保输入框占满宽度
              },
              '& .MuiStepLabel-iconContainer': {
                pr: 2, // 图标和输入框的间距
                p: 0
              },
              '& .MuiStep-root': {
                mb: 0 // 移除 Step 底部默认间距，由 StepContent 控制
              }
            }}
          >
            {/* --- 起点 --- */}
            <Step active expanded>
              <StepLabel StepIconComponent={StartIcon}>
                <Autocomplete
                  fullWidth
                  options={stations}
                  getOptionLabel={(option) => option.name}
                  value={startStation}
                  onChange={(_, newValue) => onStartChange(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="起点站"
                      variant="filled"
                      InputProps={{
                        ...params.InputProps,
                        disableUnderline: true,
                        sx: { borderRadius: 3, bgcolor: 'surface.containerHighest' }
                      }}
                    />
                  )}
                />
              </StepLabel>
              {/* StepContent 用于绘制连接下一项的虚线 */}
              <StepContent sx={{ borderLeftColor: theme.palette.divider }}>
                <Box sx={{ height: 16 }} /> {/* 输入框之间的垂直间距 */}
              </StepContent>
            </Step>

            {/* --- 途经点 --- */}
            {viaStations.map((via, index) => (
              <Step active expanded key={index}>
                <StepLabel StepIconComponent={ViaIcon}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Autocomplete
                      fullWidth
                      options={stations}
                      getOptionLabel={(option) => option.name}
                      value={via}
                      onChange={(_, newValue) => handleViaUpdate(index, newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={`途经点 ${index + 1}`}
                          variant="filled"
                          size="small"
                          InputProps={{
                            ...params.InputProps,
                            disableUnderline: true,
                            sx: { borderRadius: 3, bgcolor: 'surface.containerHighest' }
                          }}
                        />
                      )}
                    />
                    <IconButton size="small" onClick={() => handleViaDelete(index)}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                </StepLabel>
                <StepContent sx={{ borderLeftColor: theme.palette.divider }}>
                  <Box sx={{ height: 16 }} />
                </StepContent>
              </Step>
            ))}

            {/* --- 终点 --- */}
            <Step active expanded>
              <StepLabel StepIconComponent={EndIcon}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Autocomplete
                    fullWidth
                    options={stations}
                    getOptionLabel={(option) => option.name}
                    value={endStation}
                    onChange={(_, newValue) => onEndChange(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="终点站"
                        variant="filled"
                        InputProps={{
                          ...params.InputProps,
                          disableUnderline: true,
                          sx: { borderRadius: 3, bgcolor: 'surface.containerHighest' }
                        }}
                      />
                    )}
                  />
                  <Tooltip title="交换起终点">
                    <Box component="span">
                      <IconButton
                        onClick={handleSwapClick} // 使用新的处理函数
                        disabled={!startStation || !endStation}
                        size="small"
                        sx={{
                          bgcolor: 'secondary.container',
                          color: 'secondary.onContainer',
                          // 添加过渡动画
                          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          transform: `rotate(${swapRotation}deg)`, // 应用旋转
                          '&:hover': {
                            bgcolor: 'secondary.main',
                            color: 'white',
                            transform: `rotate(${swapRotation}deg) scale(1.1)` // 悬浮时轻微放大
                          }
                        }}
                      >
                        <SwapVert fontSize="small" />
                      </IconButton>
                    </Box>
                  </Tooltip>
                </Box>
              </StepLabel>
              {/* 最后一项不需要 StepContent (不需要向下的线条) */}
            </Step>
          </Stepper>
        </Box>

        {/* 操作栏 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 3 }}>
          <Button
            size="small"
            startIcon={<AddLocation />}
            onClick={() => onViaChange([...viaStations, stations[0]])}
            sx={{ color: 'text.secondary', borderRadius: 2 }}
          >
            添加途经
          </Button>

          <Button
            size="small"
            startIcon={<Settings />}
            onClick={() => setShowAdvanced(!showAdvanced)}
            sx={{ color: showAdvanced ? 'primary.main' : 'text.secondary', borderRadius: 2 }}
          >
            高级设置
          </Button>
        </Box>

        {/* 高级设置面板：优化样式 */}
        <Collapse in={showAdvanced}>
          <Paper
            elevation={0} // 移除阴影
            sx={{
              p: 2,
              mb: 3,
              // 使用 Surface Container 颜色，更符合 MD3
              bgcolor: 'surface.container',
              borderRadius: 4,
              border: 'none'
            }}
          >
            <Stack spacing={2}>
              <TextField
                label="地铁均速 (km/h)"
                type="number"
                size="small"
                fullWidth
                value={config.velocityKmH}
                onChange={(e) => setConfig({ ...config, velocityKmH: Number(e.target.value) })}
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'background.paper' } }}
              />
              <TextField
                label="换乘耗时 (秒)"
                type="number"
                size="small"
                fullWidth
                value={config.transferTimeSec}
                onChange={(e) => setConfig({ ...config, transferTimeSec: Number(e.target.value) })}
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'background.paper' } }}
              />
            </Stack>
          </Paper>
        </Collapse>

        <Divider sx={{ mb: 3 }} />

        {/* 策略选择 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ ml: 1, mb: 1, display: 'block' }}>偏好策略</Typography>
          <ToggleButtonGroup
            value={strategy}
            exclusive
            onChange={(_, newVal) => newVal && setStrategy(newVal)}
            fullWidth
            size="small"
            sx={{
              bgcolor: 'surface.containerHighest',
              borderRadius: 3,
              p: 0.5,
              gap: 0.5
            }}
          >
            {['min_stops', 'min_transfers', 'min_time'].map((val) => (
              <ToggleButton
                key={val}
                value={val}
                sx={{
                  border: 'none',
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: 'background.paper',
                    color: 'primary.main',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    '&:hover': { bgcolor: 'background.paper' }
                  }
                }}
              >
                {val === 'min_stops' ? '最少站数' : val === 'min_transfers' ? '最少换乘' : '最短时间'}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Stack spacing={2}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSearch}
            disabled={!startStation || !endStation}
            sx={{
              borderRadius: 4,
              py: 1.5,
              fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              bgcolor: 'primary.main',
              color: 'primary.onPrimary',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
              }
            }}
          >
            开始规划
          </Button>

          <Button
            variant="text"
            color="error"
            fullWidth
            onClick={onClear}
            disabled={!hasResult && !startStation && !endStation}
            startIcon={<Delete />}
            sx={{ borderRadius: 4, opacity: 0.8 }}
          >
            清除当前路线
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};