import React, { useEffect, useState } from 'react';
import { ThemeProvider, useThemeContext } from './contexts/ThemeContext';
import { MainLayout } from './components/Layout/MainLayout';
import { SearchPanel } from './components/Sidebar/SearchPanel';
import { MetroMap } from './components/Map/MetroMap';
import { stationsData } from './data/stations';
import { linesData } from './data/lines';
import { connectionsData } from './data/connections';
import { graphService } from './services/Graph';
import { routeFinder } from './services/Algorithms';
import type { AlgorithmConfig, RouteResult, Station } from './types';
import { Box, CircularProgress, Typography } from '@mui/material';

// 内部组件，用于消费 ThemeContext
const AppContent: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeContext();
  
  // 1. 状态提升到 App
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [endStation, setEndStation] = useState<Station | null>(null);
  const [viaStations, setViaStations] = useState<Station[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  
  // 新增：图数据加载状态
  const [isGraphReady, setIsGraphReady] = useState(false);

  // 2. 智能填入逻辑：点击地图时，自动判断填入起点还是终点
  const handleMapStationClick = (stationId: string) => {
    const station = graphService.getStation(stationId);
    if (!station) return;

    if (!startStation) {
      setStartStation(station);
    } else if (!endStation) {
      setEndStation(station);
    } else {
      // 如果都填了，重新开始：设为起点，清空终点
      setStartStation(station);
      setEndStation(null);
      setRouteResult(null);
    }
  };

  // 初始化图数据
  useEffect(() => {
    // 这是一个同步操作，但为了确保组件渲染顺序，我们使用状态控制
    graphService.init(stationsData, connectionsData, linesData);
    setIsGraphReady(true);
  }, []);

  const handleSearch = (config: AlgorithmConfig) => {
    if (startStation && endStation) {
      const result = routeFinder.calculate(startStation.id, endStation.id, config);
      setRouteResult(result);
    }
  };

  return (
    <MainLayout
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
      sidebar={
        <SearchPanel 
          stations={stationsData} 
          
          // 传递状态
          startStation={startStation}
          endStation={endStation}
          viaStations={viaStations}
          onStartChange={setStartStation}
          onEndChange={setEndStation}
          onViaChange={setViaStations}
          
          onSearch={handleSearch} 
          result={routeResult} 
        />
      }
      map={
        // 只有当图数据初始化完成后才渲染地图
        isGraphReady ? (
          <MetroMap 
            routeResult={routeResult} 
            onStationClick={handleMapStationClick} 
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