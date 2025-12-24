import type { Station, Line, Connection } from '../types';
import { rawLines, keyCoordinates } from './raw';

// 1. 确定性随机数生成器 (Seed Random)
class SeededRandom {
    private seed: number;
    constructor(seed: number) {
        this.seed = seed;
    }
    next(): number {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}

//const rng = new SeededRandom(12345);

// 2. 坐标插值逻辑
function generateStationsAndLines(): { stations: Station[], lines: Line[] } {
    console.group('🚇 Metro Data Generation');
    const stationMap = new Map<string, Station>();
    const lines: Line[] = [];

    // 预处理：建立坐标查找表
    const coordMap = new Map<string, { x: number, y: number }>();
    keyCoordinates.forEach(k => coordMap.set(k.id, { x: k.x, y: k.y }));
    console.log(`Loaded ${keyCoordinates.length} key coordinates.`);

    rawLines.forEach(rawLine => {
        console.group(`Line ${rawLine.id}`);
        const lineStations: string[] = [];

        // 1. 找出该线路上所有已知坐标的关键点索引
        const keyIndices: number[] = [];
        rawLine.stations.forEach((sName, idx) => {
            if (coordMap.has(sName)) keyIndices.push(idx);
        });
        
        console.log(`Found ${keyIndices.length} key points out of ${rawLine.stations.length} stations.`);
        console.log('Key Indices:', keyIndices);

        // 兜底：如果线路完全没有关键点，给起点一个默认值
        if (keyIndices.length === 0) {
            console.warn('⚠️ No key points found! Using default (500,500) for start.');
            keyIndices.push(0);
            coordMap.set(rawLine.stations[0], { x: 500, y: 500 });
        }

        // 2. 填充头部缺失坐标 (Extrapolate Start)
        if (keyIndices[0] > 0) {
            const firstKeyIdx = keyIndices[0];
            const firstKeyPos = coordMap.get(rawLine.stations[firstKeyIdx])!;
            
            let dx = 0, dy = 0;
            if (keyIndices.length > 1) {
                const secondKeyIdx = keyIndices[1];
                const secondKeyPos = coordMap.get(rawLine.stations[secondKeyIdx])!;
                dx = (firstKeyPos.x - secondKeyPos.x) / (secondKeyIdx - firstKeyIdx);
                dy = (firstKeyPos.y - secondKeyPos.y) / (secondKeyIdx - firstKeyIdx);
            } else {
                dx = 20; dy = 20;
            }
            
            console.log(`Extrapolating START (0 to ${firstKeyIdx}) with vector (${dx.toFixed(2)}, ${dy.toFixed(2)})`);

            for (let i = firstKeyIdx - 1; i >= 0; i--) {
                const sName = rawLine.stations[i];
                if (!coordMap.has(sName)) {
                    const dist = firstKeyIdx - i;
                    coordMap.set(sName, {
                        x: firstKeyPos.x + dx * dist,
                        y: firstKeyPos.y + dy * dist
                    });
                }
            }
            keyIndices.unshift(0);
        }

        // 3. 填充尾部缺失坐标 (Extrapolate End)
        const lastIdx = rawLine.stations.length - 1;
        const lastKeyIdx = keyIndices[keyIndices.length - 1];
        
        if (lastKeyIdx < lastIdx) {
            const lastKeyPos = coordMap.get(rawLine.stations[lastKeyIdx])!;
            
            let dx = 0, dy = 0;
            if (keyIndices.length > 1) {
                const prevKeyIdx = keyIndices[keyIndices.length - 2];
                const prevKeyPos = coordMap.get(rawLine.stations[prevKeyIdx])!;
                dx = (lastKeyPos.x - prevKeyPos.x) / (lastKeyIdx - prevKeyIdx);
                dy = (lastKeyPos.y - prevKeyPos.y) / (lastKeyIdx - prevKeyIdx);
            } else {
                dx = 20; dy = -20;
            }

            console.log(`Extrapolating END (${lastKeyIdx} to ${lastIdx}) with vector (${dx.toFixed(2)}, ${dy.toFixed(2)})`);

            for (let i = lastKeyIdx + 1; i <= lastIdx; i++) {
                const sName = rawLine.stations[i];
                if (!coordMap.has(sName)) {
                    const dist = i - lastKeyIdx;
                    coordMap.set(sName, {
                        x: lastKeyPos.x + dx * dist,
                        y: lastKeyPos.y + dy * dist
                    });
                }
            }
            keyIndices.push(lastIdx);
        }

        // 4. 中间段插值 (Interpolate Middle)
        for (let i = 0; i < keyIndices.length - 1; i++) {
            const startIdx = keyIndices[i];
            const endIdx = keyIndices[i + 1];
            const startStation = rawLine.stations[startIdx];
            const endStation = rawLine.stations[endIdx];
            const startPos = coordMap.get(startStation)!;
            const endPos = coordMap.get(endStation)!;

            const steps = endIdx - startIdx;
            
            // console.log(`Interpolating segment ${startStation}(${startIdx}) -> ${endStation}(${endIdx})`);

            for (let j = 1; j < steps; j++) {
                const currentStationName = rawLine.stations[startIdx + j];
                const ratio = j / steps;
                const x = startPos.x + (endPos.x - startPos.x) * ratio;
                const y = startPos.y + (endPos.y - startPos.y) * ratio;

                if (!coordMap.has(currentStationName)) {
                    coordMap.set(currentStationName, { x, y });
                }
            }
        }

        // 5. 构建 Station 对象
        rawLine.stations.forEach(sName => {
            lineStations.push(sName);

            if (!stationMap.has(sName)) {
                const pos = coordMap.get(sName);
                if (!pos) {
                    console.error(`❌ Missing coordinate for station: ${sName}`);
                }
                
                stationMap.set(sName, {
                    id: sName,
                    name: sName,
                    lines: [rawLine.id],
                    isTransfer: false,
                    position: pos || { x: 0, y: 0 }
                });
            } else {
                const existing = stationMap.get(sName)!;
                if (!existing.lines.includes(rawLine.id)) {
                    existing.lines.push(rawLine.id);
                    existing.isTransfer = true;
                }
            }
        });

        lines.push({
            id: rawLine.id,
            name: rawLine.name,
            color: rawLine.color,
            stations: lineStations
        });
        console.groupEnd();
    });

    console.log(`Generated ${stationMap.size} stations and ${lines.length} lines.`);
    console.groupEnd();

    return {
        stations: Array.from(stationMap.values()),
        lines
    };
}

// ... generateConnections (keep as is) ...
function generateConnections(lines: Line[]): Connection[] {
    const connections: Connection[] = [];
    lines.forEach(line => {
        for (let i = 0; i < line.stations.length - 1; i++) {
            const from = line.stations[i];
            const to = line.stations[i + 1];
            const distSeed = from.length + to.length + from.charCodeAt(0) + to.charCodeAt(0);
            const localRng = new SeededRandom(distSeed);
            const distanceKm = parseFloat(localRng.range(1.5, 4.0).toFixed(1));
            connections.push({ from, to, line: line.id, distanceKm });
        }
    });
    return connections;
}

const { stations, lines } = generateStationsAndLines();
const connections = generateConnections(lines);

export { stations, lines, connections };