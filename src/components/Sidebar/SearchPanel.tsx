import React, { useState } from 'react';
import {
  Box, Paper, Typography, Autocomplete, TextField, Button,
  ToggleButton, ToggleButtonGroup, Divider, IconButton, Collapse,
  Stack, Tooltip, Fade
} from '@mui/material';
import {
  DirectionsSubway, SwapVert, Settings, AddLocation, Delete,
  TripOrigin, LocationOn, MoreVert
} from '@mui/icons-material';
import type { AlgorithmConfig, Station, RouteResult } from '../../types';
import { RouteResultTimeline } from '../RouteResult/RouteTimeline';

interface SearchPanelProps {
  stations: Station[];
  
  // 状态提升：由父组件控制
  startStation: Station | null;
  endStation: Station | null;
  viaStations: Station[];
  
  // 回调函数
  onStartChange: (station: Station | null) => void;
  onEndChange: (station: Station | null) => void;
  onViaChange: (stations: Station[]) => void;
  
  onSearch: (config: AlgorithmConfig) => void;
  result: RouteResult | null;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ 
  stations, 
  startStation, endStation, viaStations,
  onStartChange, onEndChange, onViaChange,
  onSearch, 
  result 
}) => {
  // UI 相关的内部状态保持不变
  const [strategy, setStrategy] = useState<'min_stops' | 'min_transfers' | 'min_time'>('min_stops');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 默认物理参数
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

  const handleSwap = () => {
    const temp = startStation;
    onStartChange(endStation);
    onEndChange(temp);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部输入区域 (固定) */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: 0, 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          zIndex: 1
        }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DirectionsSubway color="primary" /> 路线规划
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          {/* 起点 */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <TripOrigin sx={{ color: 'success.main', mb: 1, fontSize: 20 }} />
            <Autocomplete
              fullWidth
              options={stations}
              getOptionLabel={(option) => option.name}
              value={startStation}
              onChange={(_, newValue) => onStartChange(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="起点站" variant="standard" />
              )}
            />
          </Box>

          {/* 途经站列表 */}
          {viaStations.map((via, index) => (
            <Fade in key={index}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, pl: 0.5 }}>
                <MoreVert sx={{ color: 'text.disabled', mb: 1, fontSize: 16 }} />
                <Autocomplete
                  fullWidth
                  options={stations}
                  getOptionLabel={(option) => option.name}
                  value={via}
                  onChange={(_, newValue) => {
                    const newVias = [...viaStations];
                    if (newValue) newVias[index] = newValue;
                    onViaChange(newVias);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label={`途经点 ${index + 1}`} variant="standard" size="small" />
                  )}
                />
                <IconButton size="small" onClick={() => {
                  const newVias = viaStations.filter((_, i) => i !== index);
                  onViaChange(newVias);
                }}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            </Fade>
          ))}

          {/* 终点 & 交换按钮 */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <LocationOn sx={{ color: 'error.main', mb: 1, fontSize: 20 }} />
            <Autocomplete
              fullWidth
              options={stations}
              getOptionLabel={(option) => option.name}
              value={endStation}
              onChange={(_, newValue) => onEndChange(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="终点站" variant="standard" />
              )}
            />
            <Tooltip title="交换起终点">
              <IconButton onClick={handleSwap} sx={{ mb: 0.5 }}>
                <SwapVert />
              </IconButton>
            </Tooltip>
          </Box>

          {/* 操作栏 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Button 
              size="small" 
              startIcon={<AddLocation />} 
              onClick={() => onViaChange([...viaStations, stations[0]])}
              sx={{ color: 'text.secondary' }}
            >
              添加途经
            </Button>
            
            <Button 
              size="small" 
              startIcon={<Settings />} 
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{ color: showAdvanced ? 'primary.main' : 'text.secondary' }}
            >
              高级设置
            </Button>
          </Box>

          {/* 高级设置面板 */}
          <Collapse in={showAdvanced}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Stack spacing={2}>
                <TextField 
                  label="地铁均速 (km/h)" 
                  type="number" 
                  size="small" 
                  fullWidth
                  value={config.velocityKmH}
                  onChange={(e) => setConfig({...config, velocityKmH: Number(e.target.value)})}
                />
                <TextField 
                  label="换乘耗时 (秒)" 
                  type="number" 
                  size="small" 
                  fullWidth
                  value={config.transferTimeSec}
                  onChange={(e) => setConfig({...config, transferTimeSec: Number(e.target.value)})}
                />
              </Stack>
            </Paper>
          </Collapse>

          {/* 策略选择 */}
          <ToggleButtonGroup
            value={strategy}
            exclusive
            onChange={(_, newVal) => newVal && setStrategy(newVal)}
            fullWidth
            size="small"
            color="primary"
          >
            <ToggleButton value="min_stops">最少站数</ToggleButton>
            <ToggleButton value="min_transfers">最少换乘</ToggleButton>
            <ToggleButton value="min_time">最短时间</ToggleButton>
          </ToggleButtonGroup>

          <Button 
            variant="contained" 
            fullWidth 
            size="large" 
            onClick={handleSearch}
            disabled={!startStation || !endStation}
            sx={{ borderRadius: 2, boxShadow: 2 }}
          >
            开始规划
          </Button>
        </Stack>
      </Paper>

      {/* 结果展示区域 (可滚动) */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, bgcolor: 'background.default' }}>
        {result ? (
          <Fade in>
            <Box>
              <RouteResultTimeline result={result} />
            </Box>
          </Fade>
        ) : (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              opacity: 0.5
            }}
          >
            <DirectionsSubway sx={{ fontSize: 60, mb: 2, color: 'text.disabled' }} />
            <Typography variant="body1" color="text.secondary">
              输入站点开始探索南京地铁
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};