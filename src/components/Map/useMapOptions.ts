import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import type { RouteResult } from '../../types';

// 修改：使用更锐利的导航箭头图标
const VEHICLE_SYMBOL = 'path://M12,2L2,22L12,18L22,22L12,2Z';

interface UseMapOptionsProps {
    finalGraphData: any;
    routeResult: RouteResult | null;
    startStationId?: string | null;
    endStationId?: string | null;
    viaStationIds: string[];
    selectionMode: string;
    currentZoom: number;
    containerSize: { width: number; height: number };
}

export const useMapOptions = ({
    finalGraphData,
    routeResult,
    startStationId,
    endStationId,
    viaStationIds,
    selectionMode,
    currentZoom,
    containerSize
}: UseMapOptionsProps) => {
    const theme = useTheme();

    return useMemo(() => {
        const isDarkMode = theme.palette.mode === 'dark';
        const highlightNodes = new Set<string>();
        const highlightEdges = new Set<string>();

        if (routeResult) {
            routeResult.path.forEach(id => highlightNodes.add(id));
            for (let i = 0; i < routeResult.path.length - 1; i++) {
                highlightEdges.add([routeResult.path[i], routeResult.path[i + 1]].sort().join('-'));
            }
        }
        if (startStationId) highlightNodes.add(startStationId);
        if (endStationId) highlightNodes.add(endStationId);
        viaStationIds.forEach(id => highlightNodes.add(id));

        const isRouteActive = !!routeResult;
        const isSelectionMode = selectionMode !== 'auto';

        // 构建 Graph 节点
        const nodes = finalGraphData.nodes.map((node: any) => {
            const isSelected = startStationId === node.id || endStationId === node.id || viaStationIds.includes(node.id);
            const isInRoute = isRouteActive ? highlightNodes.has(node.id) : true;

            let opacity = 1;
            if (isSelected) {
                opacity = 1;
            } else if (isRouteActive) {
                opacity = isInRoute ? 1 : (isSelectionMode ? 0.6 : 0.1);
            } else {
                opacity = 1;
            }

            // @ts-ignore
            const isTransfer = node.isTransfer;
            // @ts-ignore
            const lineColor = node.lineColor;
            // @ts-ignore
            const stationIndex = node.stationIndex || 0;

            let baseSize = isTransfer ? 10 : 6;
            let itemColor = isDarkMode ? '#121212' : '#ffffff';
            let borderColor = isTransfer ? (isDarkMode ? '#fff' : '#555') : lineColor;
            let z = 1;

            if (isSelected) {
                baseSize = 14;
                z = 20;
                if (node.id === startStationId) {
                    itemColor = theme.palette.success.main;
                    borderColor = '#fff';
                } else if (node.id === endStationId) {
                    itemColor = theme.palette.error.main;
                    borderColor = '#fff';
                } else if (viaStationIds.includes(node.id)) {
                    itemColor = theme.palette.warning.main;
                    borderColor = '#fff';
                }
            } else if (isInRoute && isRouteActive) {
                baseSize = 10;
                z = 10;
            }

            let shouldShowLabel = isSelected || (isRouteActive && isInRoute) || isSelectionMode;

            if (!shouldShowLabel && !isRouteActive) {
                if (isTransfer) {
                    shouldShowLabel = true;
                } else {
                    shouldShowLabel = currentZoom > 1.2;
                }
            }

            const labelPosition = stationIndex % 2 === 0 ? 'top' : 'bottom';

            return {
                ...node,
                value: [node.x, node.y],
                symbolSize: baseSize,
                itemStyle: {
                    ...node.itemStyle,
                    opacity,
                    color: itemColor,
                    borderColor: borderColor,
                    borderWidth: isSelected ? 3 : 2,
                    shadowBlur: isSelected ? 10 : 0,
                    shadowColor: borderColor
                },
                label: {
                    show: shouldShowLabel,
                    position: labelPosition,
                    distance: 6,
                    color: isDarkMode ? '#e0e0e0' : '#444',
                    fontSize: isSelected ? 12 : 10,
                    fontWeight: isSelected || isTransfer ? 'bold' : 'normal',
                    formatter: '{b}',
                    backgroundColor: 'transparent',
                    padding: 0,
                    textBorderColor: 'transparent',
                    textBorderWidth: 0,
                },
                z
            };
        });

        const links = finalGraphData.links.map((link: any) => {
            const key = [link.source, link.target].sort().join('-');
            const isHighlight = routeResult ? highlightEdges.has(key) : true;
            const opacity = isHighlight ? 0.8 : 0.05;
            const width = isHighlight && routeResult ? 6 : 3;

            return {
                ...link,
                lineStyle: {
                    ...link.lineStyle,
                    opacity,
                    width,
                    curveness: 0
                },
                z: isHighlight ? 5 : 0
            };
        });

        const series: any[] = [
            {
                type: 'graph',
                layout: 'none',
                coordinateSystem: 'cartesian2d',
                data: nodes,
                links: links,
                categories: finalGraphData.categories,
                roam: false,
                scaleLimit: { min: 0.4, max: 4 },
                labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' },
                lineStyle: { color: 'source', curveness: 0 },
                emphasis: { focus: 'none' },
                autoCurveness: false,
                zlevel: 1
            }
        ];

        // 动画车辆 Series
        const linesData: any[] = [];
        if (routeResult && finalGraphData.nodes.length > 0) {
            const routeCoords = routeResult.path.map(id => {
                const node = finalGraphData.nodes.find((n: any) => n.id === id);
                return node ? [node.x, node.y] : null;
            }).filter(c => c !== null);

            if (routeCoords.length > 1) {
                linesData.push({ coords: routeCoords });
            }
        }

        series.push({
            type: 'lines',
            coordinateSystem: 'cartesian2d',
            polyline: true,
            effect: {
                show: true,
                period: 4,
                trailLength: 0.5, // 稍微加长拖尾
                symbol: VEHICLE_SYMBOL,
                symbolSize: 16, // 稍微调小一点，更精致
                color: theme.palette.secondary.main,
                loop: true
            },
            lineStyle: { opacity: 0, width: 0 },
            zlevel: 2,
            data: linesData
        });

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                padding: 0, // 移除默认内边距，完全由 HTML 控制
                borderWidth: 0,
                shadowBlur: 0,
                shadowColor: 'transparent',
                backgroundColor: 'transparent', // 背景透明
                // 使用 HTML 渲染 Tooltip
                formatter: (params: any) => {
                    if (params.dataType !== 'node') return '';

                    const color = params.color;
                    const name = params.name;
                    const isTransfer = params.data.isTransfer;
                    const lines = params.data.lines || []; // 假设节点数据里有所属线路信息

                    // 构造 MD3 风格的 Tooltip HTML
                    // 注意：这里使用了内联样式，因为 ECharts tooltip 在 React 组件树之外
                    return `
                        <div style="
                            background: ${theme.palette.mode === 'dark' ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)'};
                            backdrop-filter: blur(8px);
                            padding: 12px 16px;
                            border-radius: 16px;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                            border: 1px solid ${theme.palette.divider};
                            font-family: ${theme.typography.fontFamily};
                        ">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <div style="
                                    width: 10px; height: 10px; 
                                    border-radius: 50%; 
                                    background-color: ${color};
                                    border: 2px solid ${theme.palette.background.paper};
                                "></div>
                                <span style="
                                    font-weight: bold; 
                                    font-size: 14px; 
                                    color: ${theme.palette.text.primary}
                                ">${name}</span>
                                ${isTransfer ? `
                                    <span style="
                                        font-size: 10px; 
                                        padding: 2px 6px; 
                                        border-radius: 4px; 
                                        background-color: ${theme.palette.secondary.container}; 
                                        color: ${theme.palette.secondary.onContainer};
                                        font-weight: bold;
                                    ">换乘</span>
                                ` : ''}
                            </div>
                            <div style="font-size: 12px; color: ${theme.palette.text.secondary};">
                                点击设置为起点或终点
                            </div>
                        </div>
                    `;
                },
            },
            grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
            xAxis: { show: false, min: 0, max: containerSize.width, axisLine: { show: false }, splitLine: { show: false } },
            yAxis: { show: false, min: 0, max: containerSize.height, inverse: true, axisLine: { show: false }, splitLine: { show: false } },
            dataZoom: [
                { type: 'inside', xAxisIndex: 0, filterMode: 'none', zoomLock: false },
                { type: 'inside', yAxisIndex: 0, filterMode: 'none', zoomLock: false }
            ],
            animation: false,
            series: series
        };
    }, [finalGraphData, routeResult, theme, startStationId, endStationId, viaStationIds, selectionMode, currentZoom, containerSize]);
};