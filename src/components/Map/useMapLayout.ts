import { useMemo, useState } from 'react';
import { graphService } from '../../services/Graph';

const CONFIG = {
    ITERATIONS: 300,
    REPULSION: 20000,
    REPULSION_RANGE: 6000,
    LINK_DISTANCE: 62,
    SPRING_STRENGTH: 0.5,
    OCTOLINEAR_STRENGTH: 0.9,
    STRAIGHTEN_STRENGTH: 0.5,
    GRID_SNAP_STRENGTH: 0.2,
    GRID_SIZE: 50,
    ANGULAR_STRENGTH: 1200
};

export const useMapLayout = (containerSize: { width: number; height: number }) => {
    const [isLayoutReady, setIsLayoutReady] = useState(false);
    const rawGraphData = useMemo(() => graphService.toEChartsData(), []);

    // 1. 物理模拟计算
    const graphData = useMemo(() => {
        if (rawGraphData.nodes.length === 0) return rawGraphData;

        const nodes = rawGraphData.nodes.map(n => ({ ...n, x: n.x, y: n.y, vx: 0, vy: 0 }));
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const links = rawGraphData.links.map(l => ({ ...l }));

        // 构建邻接表
        const adj = new Map<string, string[]>();
        links.forEach(l => {
            if (!adj.has(l.source)) adj.set(l.source, []);
            if (!adj.has(l.target)) adj.set(l.target, []);
            adj.get(l.source)!.push(l.target);
            adj.get(l.target)!.push(l.source);
        });

        // 迭代模拟
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

    // 2. 坐标映射到容器
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

    return { finalGraphData, isLayoutReady };
};