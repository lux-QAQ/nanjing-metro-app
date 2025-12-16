import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme, Box } from '@mui/material';
import { graphService } from '../../services/Graph';
import type { RouteResult } from '../../types';

interface MetroMapProps {
    routeResult: RouteResult | null;
    onStationClick?: (stationId: string) => void;
}

// --- 物理模拟配置 (稳健版) ---
const SIMULATION_ITERATIONS = 100; 
const REPULSION_FORCE = 200;       // 适度斥力
const REPULSION_RANGE = 50;        // 仅在近距离生效
const LINK_DISTANCE = 30;          // 期望间距
const SPRING_STRENGTH = 0.5;       // 适度弹簧
const ORIGINAL_GRAVITY = 0.6;      // 强引力：严格保持原始形状
const STRAIGHTEN_STRENGTH = 0.3;   // 轻微拉直

export const MetroMap: React.FC<MetroMapProps> = ({ routeResult, onStationClick }) => {
    const theme = useTheme();
    const chartRef = useRef<ReactECharts>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // 1. 监听容器大小
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

    // 2. 获取基础数据
    const rawGraphData = useMemo(() => graphService.toEChartsData(), []);

    // 3. 布局优化与适配
    const graphData = useMemo(() => {
        if (containerSize.width === 0 || containerSize.height === 0 || rawGraphData.nodes.length === 0) {
            return rawGraphData;
        }

        // --- A. 物理松弛 (Force Relaxation) ---
        const nodes = rawGraphData.nodes.map(n => ({ ...n, vx: 0, vy: 0, ox: n.x, oy: n.y }));
        const links = rawGraphData.links;
        
        // 建立索引
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const adj = new Map<string, string[]>();
        
        links.forEach(l => {
            if (!adj.has(l.source)) adj.set(l.source, []);
            if (!adj.has(l.target)) adj.set(l.target, []);
            adj.get(l.source)!.push(l.target);
            adj.get(l.target)!.push(l.source);
        });

        // 迭代模拟
        for (let i = 0; i < SIMULATION_ITERATIONS; i++) {
            // 1. 斥力 (仅近距离)
            for (let j = 0; j < nodes.length; j++) {
                for (let k = j + 1; k < nodes.length; k++) {
                    const u = nodes[j];
                    const v = nodes[k];
                    const dx = v.x - u.x;
                    const dy = v.y - u.y;
                    const distSq = dx * dx + dy * dy || 1;
                    const dist = Math.sqrt(distSq);
                    
                    if (dist < REPULSION_RANGE) { 
                        const force = REPULSION_FORCE / distSq;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        
                        u.vx -= fx; u.vy -= fy;
                        v.vx += fx; v.vy += fy;
                    }
                }
            }

            // 2. 弹簧力 (连线)
            links.forEach(link => {
                const u = nodeMap.get(link.source)!;
                const v = nodeMap.get(link.target)!;
                const dx = v.x - u.x;
                const dy = v.y - u.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                
                const displacement = dist - LINK_DISTANCE;
                const force = displacement * SPRING_STRENGTH;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                u.vx += fx; u.vy += fy;
                v.vx -= fx; v.vy -= fy;
            });

            // 3. 原始位置引力 (保持形状) - 这里的权重很高
            nodes.forEach(n => {
                n.vx += (n.ox - n.x) * ORIGINAL_GRAVITY;
                n.vy += (n.oy - n.y) * ORIGINAL_GRAVITY;
            });

            // 4. 拉直力 (Straighten)
            nodes.forEach(n => {
                const neighbors = adj.get(n.id);
                if (neighbors && neighbors.length === 2) {
                    const n1 = nodeMap.get(neighbors[0])!;
                    const n2 = nodeMap.get(neighbors[1])!;
                    const midX = (n1.x + n2.x) / 2;
                    const midY = (n1.y + n2.y) / 2;
                    n.vx += (midX - n.x) * STRAIGHTEN_STRENGTH;
                    n.vy += (midY - n.y) * STRAIGHTEN_STRENGTH;
                }
            });

            // 5. 应用速度
            nodes.forEach(n => {
                n.x += n.vx * 0.5;
                n.y += n.vy * 0.5;
                n.vx *= 0.8;
                n.vy *= 0.8;
            });
        }

        // --- B. 坐标适配 (Auto-Fit) ---
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
        });

        const dataWidth = maxX - minX;
        const dataHeight = maxY - minY;
        const padding = 60;
        const viewWidth = containerSize.width - padding * 2;
        const viewHeight = containerSize.height - padding * 2;

        if (viewWidth <= 0 || viewHeight <= 0) return rawGraphData;

        const scale = Math.min(viewWidth / dataWidth, viewHeight / dataHeight);
        const offsetX = (containerSize.width - dataWidth * scale) / 2 - minX * scale;
        const offsetY = (containerSize.height - dataHeight * scale) / 2 - minY * scale;

        const finalNodes = nodes.map(n => ({
            ...n,
            x: n.x * scale + offsetX,
            y: n.y * scale + offsetY
        }));

        return { ...rawGraphData, nodes: finalNodes };
    }, [rawGraphData, containerSize]);

    // 4. ECharts 配置
    const option = useMemo(() => {
        const isDarkMode = theme.palette.mode === 'dark';

        const highlightNodes = new Set<string>();
        const highlightEdges = new Set<string>();

        if (routeResult) {
            routeResult.path.forEach(id => highlightNodes.add(id));
            for (let i = 0; i < routeResult.path.length - 1; i++) {
                const u = routeResult.path[i];
                const v = routeResult.path[i + 1];
                highlightEdges.add([u, v].sort().join('-'));
            }
        }

        const nodes = graphData.nodes.map(node => {
            const isHighlight = routeResult ? highlightNodes.has(node.id) : true;
            // @ts-ignore
            const isTransfer = node.isTransfer;
            // @ts-ignore
            const lineColor = node.lineColor;

            const opacity = isHighlight ? 1 : 0.15;

            const baseSize = isTransfer ? 12 : 6;
            const size = isHighlight && routeResult ? baseSize * 1.5 : baseSize;

            return {
                ...node,
                symbolSize: size,
                itemStyle: {
                    ...node.itemStyle,
                    opacity,
                    color: isDarkMode ? '#121212' : '#ffffff',
                    borderColor: isTransfer ? (isDarkMode ? '#fff' : '#555') : lineColor,
                    borderWidth: isTransfer ? 2 : 1.5,
                    shadowBlur: isHighlight && routeResult ? 10 : 0,
                    shadowColor: lineColor
                },
                label: {
                    show: isHighlight || isTransfer,
                    position: 'right',
                    distance: 6,
                    color: isDarkMode ? '#eee' : '#333',
                    fontSize: isHighlight && routeResult ? 14 : 10,
                    fontWeight: isHighlight ? 'bold' : 'normal',
                    formatter: '{b}',
                    textBorderColor: 'transparent', 
                    textBorderWidth: 0,
                    textShadowColor: isDarkMode ? '#000' : '#fff',
                    textShadowBlur: 3,
                    textShadowOffsetX: 0,
                    textShadowOffsetY: 0
                },
                z: isHighlight ? 10 : 1
            };
        });

        const links = graphData.links.map(link => {
            const key = [link.source, link.target].sort().join('-');
            const isHighlight = routeResult ? highlightEdges.has(key) : true;
            const opacity = isHighlight ? 0.8 : 0.1;
            const width = isHighlight && routeResult ? 5 : 2;

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

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: '{b}',
                backgroundColor: theme.palette.background.paper,
                textStyle: { color: theme.palette.text.primary },
                borderColor: theme.palette.divider
            },
            series: [
                {
                    type: 'graph',
                    layout: 'none',
                    data: nodes,
                    links: links,
                    categories: graphData.categories,
                    roam: true,
                    scaleLimit: { min: 0.5, max: 10 },
                    labelLayout: {
                        hideOverlap: true
                    },
                    lineStyle: {
                        color: 'source',
                        curveness: 0
                    },
                    emphasis: {
                        focus: 'adjacency',
                        scale: true
                    },
                    large: false,
                    autoCurveness: true
                }
            ]
        };
    }, [graphData, routeResult, theme]);

    const onEvents = useMemo(() => ({
        click: (params: any) => {
            if (params.dataType === 'node' && onStationClick) {
                onStationClick(params.data.id);
            }
        }
    }), [onStationClick]);

    return (
        <Box ref={containerRef} sx={{ width: '100%', height: '100%', overflow: 'hidden' }}>
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