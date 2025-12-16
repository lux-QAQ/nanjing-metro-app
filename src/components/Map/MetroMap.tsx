import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box } from '@mui/material';
import type { RouteResult } from '../../types';

// 引入拆分后的组件和 Hooks
import { useMapLayout } from './useMapLayout';
import { useMapOptions } from './useMapOptions';
import { MapToolbar } from './MapToolbar';
import { MapLoading } from './MapLoading';

interface MetroMapProps {
    routeResult: RouteResult | null;
    startStationId?: string | null;
    endStationId?: string | null;
    viaStationIds?: string[];
    onStationClick?: (stationId: string, mode: 'start' | 'end' | 'via' | 'auto') => void;
    onClearRoute?: () => void;
}

export const MetroMap: React.FC<MetroMapProps> = ({
    routeResult,
    startStationId,
    endStationId,
    viaStationIds = [],
    onStationClick,
    onClearRoute
}) => {
    const chartRef = useRef<ReactECharts>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [currentZoom, setCurrentZoom] = useState(1);
    const [selectionMode, setSelectionMode] = useState<'auto' | 'start' | 'end' | 'via'>('auto');

    // 1. 监听容器大小变化
    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setContainerSize({ width, height });
                    chartRef.current?.getEchartsInstance().resize();
                }
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // 2. 获取布局数据 (Hook)
    const { finalGraphData, isLayoutReady } = useMapLayout(containerSize);

    // 3. 生成 ECharts 配置 (Hook)
    const option = useMapOptions({
        finalGraphData,
        routeResult,
        startStationId,
        endStationId,
        viaStationIds,
        selectionMode,
        currentZoom,
        containerSize
    });

    // 4. 事件处理
    const handleMapClick = (params: any) => {
        if (params.dataType === 'node' && onStationClick) {
            const stationId = params.data.id;
            onStationClick(stationId, selectionMode);
        }
    };

    const handleClear = () => {
        if (onClearRoute) onClearRoute();
        chartRef.current?.getEchartsInstance().dispatchAction({
            type: 'restore'
        });
    };

    const onEvents = useMemo(() => ({
        click: handleMapClick,
        dataZoom: (params: any) => {
            const chart = chartRef.current?.getEchartsInstance();
            if (chart) {
                const option = chart.getOption() as any;
                if (option.dataZoom && option.dataZoom[0]) {
                    const start = option.dataZoom[0].start;
                    const end = option.dataZoom[0].end;
                    const range = end - start;
                    const zoom = 100 / (range || 100);
                    
                    if (zoom > 1.2 && currentZoom <= 1.2) {
                        setCurrentZoom(1.3);
                    } else if (zoom <= 1.2 && currentZoom > 1.2) {
                        setCurrentZoom(1.0);
                    }
                }
            }
        }
    }), [currentZoom, selectionMode, onStationClick]);

    return (
        <Box ref={containerRef} sx={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            {!isLayoutReady && <MapLoading />}

            {isLayoutReady && (
                <MapToolbar 
                    selectionMode={selectionMode} 
                    setSelectionMode={setSelectionMode} 
                    onClear={handleClear}
                    hasRoute={!!routeResult}
                />
            )}

            {containerSize.width > 0 && (
                <ReactECharts
                    ref={chartRef}
                    option={option}
                    onEvents={onEvents}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                />
            )}
        </Box>
    );
};