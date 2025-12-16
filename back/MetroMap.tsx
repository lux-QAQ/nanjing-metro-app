import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme, Box, CircularProgress, Typography, Paper, ToggleButton, ToggleButtonGroup, Tooltip, IconButton, Divider } from '@mui/material';
import { TripOrigin, LocationOn, AddLocation, Clear, Mouse } from '@mui/icons-material';
import { graphService } from '../../services/Graph';
import type { RouteResult } from '../../types';

interface MetroMapProps {
    routeResult: RouteResult | null;
    startStationId?: string | null;
    endStationId?: string | null;
    viaStationIds?: string[];
    onStationClick?: (stationId: string, mode: 'start' | 'end' | 'via' | 'auto') => void;
    onClearRoute?: () => void;
}

const CONFIG = {
    ITERATIONS: 300,
    REPULSION: 20000,
    REPULSION_RANGE: 6000,
    LINK_DISTANCE: 70,
    SPRING_STRENGTH: 0.4,
    OCTOLINEAR_STRENGTH: 0.8,
    STRAIGHTEN_STRENGTH: 0.5,
    GRID_SNAP_STRENGTH: 0.2,
    GRID_SIZE: 50,
    ANGULAR_STRENGTH: 1200
};

// 车辆图标 SVG Path
const VEHICLE_SYMBOL = 'path://M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z';

export const MetroMap: React.FC<MetroMapProps> = ({
    routeResult,
    startStationId,
    endStationId,
    viaStationIds = [],
    onStationClick,
    onClearRoute
}) => {
    const theme = useTheme();
    const chartRef = useRef<ReactECharts>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [isLayoutReady, setIsLayoutReady] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(1);
    const [selectionMode, setSelectionMode] = useState<'auto' | 'start' | 'end' | 'via'>('auto');

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

    const rawGraphData = useMemo(() => graphService.toEChartsData(), []);

    // 1. 力导向布局计算 (保持不变)
    const graphData = useMemo(() => {
        if (rawGraphData.nodes.length === 0) return rawGraphData;

        const nodes = rawGraphData.nodes.map(n => ({ ...n, x: n.x, y: n.y, vx: 0, vy: 0 }));
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const links = rawGraphData.links.map(l => ({ ...l }));
        const adj = new Map<string, string[]>();
        links.forEach(l => {
            if (!adj.has(l.source)) adj.set(l.source, []);
            if (!adj.has(l.target)) adj.set(l.target, []);
            adj.get(l.source)!.push(l.target);
            adj.get(l.target)!.push(l.source);
        });

        for (let i = 0; i < CONFIG.ITERATIONS; i++) {
            const alpha = 1 - (i / CONFIG.ITERATIONS);
            const step = alpha * 0.6;
            const isEarlyStage = i < CONFIG.ITERATIONS * 0.3;
            const isLateStage = i > CONFIG.ITERATIONS * 0.7;

            for (let j = 0; j < nodes.length; j++) {
                for (let k = j + 1; k < nodes.length; k++) {
                    const u = nodes[j];
                    const v = nodes[k];
                    const dx = v.x - u.x;
                    const dy = v.y - u.y;
                    const distSq = dx * dx + dy * dy || 1;
                    const dist = Math.sqrt(distSq);
                    if (dist < CONFIG.REPULSION_RANGE) {
                        const force = CONFIG.REPULSION / distSq;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        u.vx -= fx; u.vy -= fy;
                        v.vx += fx; v.vy += fy;
                    }
                }
            }
            links.forEach(link => {
                const u = nodeMap.get(link.source)!;
                const v = nodeMap.get(link.target)!;
                const dx = v.x - u.x;
                const dy = v.y - u.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const displacement = dist - CONFIG.LINK_DISTANCE;
                const force = displacement * CONFIG.SPRING_STRENGTH;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                u.vx += fx; u.vy += fy;
                v.vx -= fx; v.vy -= fy;
                if (!isEarlyStage && dist > 0) {
                    const angle = Math.atan2(dy, dx);
                    const octant = Math.round(angle / (Math.PI / 4));
                    const targetAngle = octant * (Math.PI / 4);
                    const diff = angle - targetAngle;
                    const rotateForce = Math.sin(diff) * CONFIG.OCTOLINEAR_STRENGTH * dist;
                    const rfx = (-dy / dist) * rotateForce;
                    const rfy = (dx / dist) * rotateForce;
                    u.vx += rfx; u.vy += rfy;
                    v.vx -= rfx; v.vy -= rfy;
                }
            });
            nodes.forEach(centerNode => {
                const neighbors = adj.get(centerNode.id);
                if (!neighbors || neighbors.length <= 1) return;
                const neighborAngles = neighbors.map(nid => {
                    const n = nodeMap.get(nid)!;
                    return { node: n, angle: Math.atan2(n.y - centerNode.y, n.x - centerNode.x) };
                });
                neighborAngles.sort((a, b) => a.angle - b.angle);
                for (let k = 0; k < neighborAngles.length; k++) {
                    const curr = neighborAngles[k];
                    const next = neighborAngles[(k + 1) % neighborAngles.length];
                    let angleDiff = next.angle - curr.angle;
                    if (angleDiff < 0) angleDiff += Math.PI * 2;
                    const minSafeAngle = Math.PI / 4;
                    if (angleDiff < minSafeAngle) {
                        const force = CONFIG.ANGULAR_STRENGTH * (minSafeAngle - angleDiff);
                        curr.node.vx -= Math.sin(curr.angle) * force * 0.1;
                        curr.node.vy += Math.cos(curr.angle) * force * 0.1;
                        next.node.vx += Math.sin(next.angle) * force * 0.1;
                        next.node.vy -= Math.cos(next.angle) * force * 0.1;
                    }
                }
            });
            nodes.forEach(n => {
                const neighbors = adj.get(n.id);
                if (neighbors && neighbors.length === 2) {
                    const n1 = nodeMap.get(neighbors[0])!;
                    const n2 = nodeMap.get(neighbors[1])!;
                    const midX = (n1.x + n2.x) / 2;
                    const midY = (n1.y + n2.y) / 2;
                    n.vx += (midX - n.x) * CONFIG.STRAIGHTEN_STRENGTH;
                    n.vy += (midY - n.y) * CONFIG.STRAIGHTEN_STRENGTH;
                }
            });
            if (isLateStage) {
                nodes.forEach(n => {
                    const gx = Math.round(n.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                    const gy = Math.round(n.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
                    n.vx += (gx - n.x) * CONFIG.GRID_SNAP_STRENGTH;
                    n.vy += (gy - n.y) * CONFIG.GRID_SNAP_STRENGTH;
                });
            }
            nodes.forEach(n => {
                n.x += n.vx * step;
                n.y += n.vy * step;
                n.vx *= 0.5;
                n.vy *= 0.5;
            });
        }
        setIsLayoutReady(true);
        return { ...rawGraphData, nodes, links };
    }, [rawGraphData]);

    // 2. 坐标映射 (保持不变，将逻辑坐标映射到容器像素坐标)
    const finalGraphData = useMemo(() => {
        if (containerSize.width === 0 || containerSize.height === 0 || !isLayoutReady) {
            return graphData;
        }
        const nodes = graphData.nodes;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
        });
        const dataWidth = maxX - minX || 1;
        const dataHeight = maxY - minY || 1;
        const padding = 40;
        const viewWidth = containerSize.width - padding * 2;
        const viewHeight = containerSize.height - padding * 2;
        const scale = Math.min(viewWidth / dataWidth, viewHeight / dataHeight);
        const offsetX = (containerSize.width - dataWidth * scale) / 2 - minX * scale;
        const offsetY = (containerSize.height - dataHeight * scale) / 2 - minY * scale;
        const scaledNodes = nodes.map(n => ({
            ...n,
            x: n.x * scale + offsetX,
            y: n.y * scale + offsetY
        }));
        return { ...graphData, nodes: scaledNodes };
    }, [graphData, containerSize, isLayoutReady]);

    // 3. ECharts 配置 (关键修改：引入 Cartesian2D 坐标系)
    const option = useMemo(() => {
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
        const nodes = finalGraphData.nodes.map(node => {
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

            let shouldShowLabel = isSelected ||
                (isRouteActive && isInRoute) ||
                isSelectionMode;

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
                // 注意：在 cartesian2d 中，x/y 属性会被忽略，需要使用 value: [x, y]
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

        const links = finalGraphData.links.map(link => {
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
                coordinateSystem: 'cartesian2d', // 关键：使用直角坐标系
                data: nodes,
                links: links,
                categories: finalGraphData.categories,
                roam: false, // 禁用 graph 自身的 roam，改用 dataZoom
                scaleLimit: { min: 0.4, max: 4 },
                labelLayout: {
                    hideOverlap: true,
                    moveOverlap: 'shiftY'
                },
                lineStyle: { color: 'source', curveness: 0 },
                emphasis: { focus: 'none' },
                autoCurveness: false,
                zlevel: 1
            }
        ];

        // 2. 构建 Lines Series (动画车辆)
        // 修复：始终添加 lines series，通过数据是否为空来控制显示/清除
        // 否则 ECharts 在 merge 模式下会保留上一次的动画 series
        const linesData: any[] = [];

        if (routeResult && finalGraphData.nodes.length > 0) {
            const routeCoords = routeResult.path.map(id => {
                const node = finalGraphData.nodes.find(n => n.id === id);
                return node ? [node.x, node.y] : null;
            }).filter(c => c !== null);

            if (routeCoords.length > 1) {
                linesData.push({
                    coords: routeCoords
                });
            }
        }

        series.push({
            type: 'lines',
            coordinateSystem: 'cartesian2d', // 关键：与 graph 共享坐标系
            polyline: true,
            effect: {
                show: true,
                period: 4,
                trailLength: 0.4,
                symbol: VEHICLE_SYMBOL,
                symbolSize: 20,
                color: theme.palette.secondary.main,
                loop: true
            },
            lineStyle: {
                opacity: 0,
                width: 0
            },
            zlevel: 2,
            data: linesData // 如果为空数组，ECharts 会清除画布上的小车
        });

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: '{b}',
                backgroundColor: theme.palette.background.paper,
                textStyle: { color: theme.palette.text.primary },
                borderColor: theme.palette.divider
            },
            // 定义坐标轴 (隐藏)
            grid: {
                left: 0, right: 0, top: 0, bottom: 0,
                containLabel: false
            },
            xAxis: {
                show: false,
                min: 0,
                max: containerSize.width,
                axisLine: { show: false },
                splitLine: { show: false }
            },
            yAxis: {
                show: false,
                min: 0,
                max: containerSize.height,
                inverse: true, // 屏幕坐标系 Y 轴向下
                axisLine: { show: false },
                splitLine: { show: false }
            },
            // 使用 dataZoom 实现缩放和平移
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: 0,
                    filterMode: 'none', // 关键：不过滤数据，只改变视图
                    zoomLock: false
                },
                {
                    type: 'inside',
                    yAxisIndex: 0,
                    filterMode: 'none',
                    zoomLock: false
                }
            ],
            animation: false,
            series: series
        };
    }, [finalGraphData, routeResult, theme, startStationId, endStationId, viaStationIds, selectionMode, currentZoom, containerSize]);

    const handleMapClick = (params: any) => {
        if (params.dataType === 'node' && onStationClick) {
            const stationId = params.data.id;
            onStationClick(stationId, selectionMode);
        }
    };

    const onEvents = useMemo(() => ({
        click: handleMapClick,
        // 监听 dataZoom 事件来更新缩放级别
        dataZoom: (params: any) => {
            const chart = chartRef.current?.getEchartsInstance();
            if (chart) {
                // 计算当前缩放比例
                const option = chart.getOption() as any;
                if (option.dataZoom && option.dataZoom[0]) {
                    const start = option.dataZoom[0].start;
                    const end = option.dataZoom[0].end;
                    const range = end - start;
                    // 初始 range 是 100，zoom = 100 / range
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

    const Toolbar = () => (
        <Paper
            elevation={4}
            sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 100,
                p: 0.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                bgcolor: 'background.paper',
                borderRadius: 2
            }}
        >
            <ToggleButtonGroup
                orientation="vertical"
                value={selectionMode}
                exclusive
                onChange={(_, newMode) => newMode && setSelectionMode(newMode)}
                size="small"
                aria-label="selection mode"
            >
                <ToggleButton value="auto" aria-label="auto select">
                    <Tooltip title="智能选择 (点击设置起点/终点)" placement="left">
                        <Mouse fontSize="small" />
                    </Tooltip>
                </ToggleButton>
                <ToggleButton value="start" aria-label="set start">
                    <Tooltip title="设置起点" placement="left">
                        <TripOrigin fontSize="small" color="success" />
                    </Tooltip>
                </ToggleButton>
                <ToggleButton value="via" aria-label="add via">
                    <Tooltip title="添加途经点" placement="left">
                        <AddLocation fontSize="small" color="warning" />
                    </Tooltip>
                </ToggleButton>
                <ToggleButton value="end" aria-label="set end">
                    <Tooltip title="设置终点" placement="left">
                        <LocationOn fontSize="small" color="error" />
                    </Tooltip>
                </ToggleButton>
            </ToggleButtonGroup>

            <Divider flexItem />

            <Tooltip title="清除路线 / 重置视图" placement="left">
                <IconButton
                    size="small"
                    onClick={() => {
                        if (onClearRoute) onClearRoute();
                        chartRef.current?.getEchartsInstance().dispatchAction({
                            type: 'restore'
                        });
                    }}
                    color={routeResult ? "primary" : "default"}
                >
                    <Clear fontSize="small" />
                </IconButton>
            </Tooltip>
        </Paper>
    );

    return (
        <Box ref={containerRef} sx={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            {!isLayoutReady && (
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.1)', zIndex: 10
                }}>
                    <CircularProgress />
                    <Typography variant="caption" sx={{ mt: 1 }}>正在优化线路布局...</Typography>
                </Box>
            )}

            {isLayoutReady && <Toolbar />}

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