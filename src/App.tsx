import React, { useEffect, useState } from 'react';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import { MainLayout } from './components/Layout/MainLayout';
import { SearchPanel } from './components/Sidebar/SearchPanel';
import { MetroMap } from './components/Map/MetroMap';
import { RouteResultTimeline } from './components/RouteResult/RouteTimeline'; // 导入结果组件
import { stationsData } from './data/stations';
import { linesData } from './data/lines';
import { connectionsData } from './data/connections';
import { graphService } from './services/Graph';
import { routeFinder } from './services/Algorithms';
import type { AlgorithmConfig, RouteResult, Station } from './types';
import { Box, CircularProgress, Typography } from '@mui/material';
import { DirectionsSubway, TripOrigin, LocationOn } from '@mui/icons-material';

const AppContent: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeContext();

  const [selectedStations, setSelectedStations] = useState<Station[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isGraphReady, setIsGraphReady] = useState(false);

  // 控制右侧栏状态
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const startStation = selectedStations.length > 0 ? selectedStations[0] : null;
  const endStation = selectedStations.length > 1 ? selectedStations[selectedStations.length - 1] : null;
  const viaStations = selectedStations.length > 2 ? selectedStations.slice(1, -1) : [];



  const handleMapStationClick = (stationId: string, mode: 'start' | 'end' | 'via' | 'auto') => {
    const station = graphService.getStation(stationId);
    if (!station) return;

    let newStations = [...selectedStations];
    const existingIndex = newStations.findIndex(s => s.id === station.id);

    switch (mode) {
      case 'auto':
        if (existingIndex !== -1) {
          newStations.splice(existingIndex, 1);
        } else {
          newStations.push(station);
        }
        break;

      case 'start':
        if (newStations.length === 0) {
          newStations = [station];
        } else {
          newStations[0] = station;
        }
        break;

      case 'end':
        if (newStations.length === 0) {
          newStations = [station];
        } else if (newStations.length === 1) {
          newStations.push(station);
        } else {
          newStations[newStations.length - 1] = station;
        }
        break;

      case 'via':
        if (newStations.length < 2) {
          newStations.push(station);
        } else {
          if (existingIndex === -1) {
            newStations.splice(newStations.length - 1, 0, station);
          }
        }
        break;
    }

    setSelectedStations(newStations);
    if (routeResult) setRouteResult(null);
  };

  const handleStartChange = (station: Station | null) => {
    if (!station) {
      const newStations = [...selectedStations];
      newStations.shift();
      setSelectedStations(newStations);
    } else {
      const newStations = [...selectedStations];
      if (newStations.length === 0) newStations.push(station);
      else newStations[0] = station;
      setSelectedStations(newStations);
    }
    setRouteResult(null);
  };

  const handleEndChange = (station: Station | null) => {
    const newStations = [...selectedStations];
    if (!station) {
      if (newStations.length > 1) newStations.pop();
    } else {
      if (newStations.length <= 1) newStations.push(station);
      else newStations[newStations.length - 1] = station;
    }
    setSelectedStations(newStations);
    setRouteResult(null);
  };

  const handleViaChange = (vias: Station[]) => {
    const start = selectedStations[0];
    const end = selectedStations.length > 1 ? selectedStations[selectedStations.length - 1] : null;

    const newStations: Station[] = [];
    if (start) newStations.push(start);
    newStations.push(...vias);
    if (end) newStations.push(end);

    setSelectedStations(newStations);
    setRouteResult(null);
  };

  // 处理交换逻辑
  const handleSwapStations = () => {
    // 只有当至少有两个站点（起点和终点）时才能交换
    if (selectedStations.length < 2) return;

    const newStations = [...selectedStations];
    const startIdx = 0;
    const endIdx = newStations.length - 1;

    // 交换首尾元素
    const temp = newStations[startIdx];
    newStations[startIdx] = newStations[endIdx];
    newStations[endIdx] = temp;

    setSelectedStations(newStations);
    setRouteResult(null); // 交换后清除旧结果
  };

  const handleClear = () => {
    setSelectedStations([]);
    setRouteResult(null);
    setIsRightSidebarOpen(false); // 清除时关闭右侧栏
  };

  useEffect(() => {
    graphService.init(stationsData, connectionsData, linesData);
    setIsGraphReady(true);
  }, []);

  const handleSearch = (config: AlgorithmConfig) => {
    if (startStation && endStation) {
      const viaIds = viaStations.map(s => s.id);
      const result = routeFinder.calculate(startStation.id, endStation.id, {
        ...config,
        viaStations: viaIds
      });
      setRouteResult(result);
      // 搜索成功后自动打开右侧栏
      if (result) {
        setIsRightSidebarOpen(true);
      }
    }
  };

  return (
    <MainLayout
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
      isRightSidebarOpen={isRightSidebarOpen}
      setRightSidebarOpen={setIsRightSidebarOpen}
      // 左侧栏：只放搜索面板
      leftSidebar={
        <SearchPanel
          stations={stationsData}
          startStation={startStation}
          endStation={endStation}
          viaStations={viaStations}
          onStartChange={handleStartChange}
          onEndChange={handleEndChange}
          onViaChange={handleViaChange}
          onSearch={handleSearch}
          onClear={handleClear}
          onSwap={handleSwapStations} // 传递交换函数
          hasResult={!!routeResult}
        />
      }
      // 右侧栏：只放结果展示
      rightSidebar={
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DirectionsSubway color="primary" /> 规划结果
            </Typography>
            {/* 如果有结果，显示一个小 Chip */}
            {routeResult && (
              <Typography variant="caption" sx={{ bgcolor: 'primary.container', color: 'primary.onContainer', px: 1, py: 0.5, borderRadius: 1 }}>
                已规划
              </Typography>
            )}
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, position: 'relative' }}>
            {routeResult ? (
              <RouteResultTimeline
                result={routeResult}
                viaStationIds={viaStations.map(v => v.id)}
              />
            ) : (
              //  美化后的空状态 
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                opacity: 0.8,
                textAlign: 'center',
                gap: 2
              }}>
                {/* 装饰性图标组合 */}
                <Box sx={{ position: 'relative', width: 120, height: 120, mb: 2 }}>
                  <Box sx={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    bgcolor: 'primary.container', opacity: 0.3,
                    animation: 'pulse 3s infinite ease-in-out',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(0.8)', opacity: 0.3 },
                      '50%': { transform: 'scale(1.1)', opacity: 0.1 },
                      '100%': { transform: 'scale(0.8)', opacity: 0.3 },
                    }
                  }} />
                  <DirectionsSubway sx={{ fontSize: 64, color: 'primary.main', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                  <TripOrigin sx={{ fontSize: 24, color: 'success.main', position: 'absolute', top: 20, right: 20 }} />
                  <LocationOn sx={{ fontSize: 24, color: 'error.main', position: 'absolute', bottom: 20, left: 20 }} />
                </Box>

                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom color="text.primary">
                    准备出发？
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, mx: 'auto' }}>
                    在左侧选择起点和终点，我们将为您规划最佳的地铁路线。
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      }
      map={
        isGraphReady ? (
          <MetroMap
            routeResult={routeResult}
            startStationId={startStation?.id}
            endStationId={endStation?.id}
            viaStationIds={viaStations.map(v => v.id)}
            onStationClick={handleMapStationClick}
            onClearRoute={handleClear}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">正在加载地铁数据...</Typography>
          </Box>
        )
      }
    />
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;