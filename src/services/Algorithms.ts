import { graphService } from './Graph';
import type { AlgorithmConfig, RouteResult, RouteStep, Connection } from '../types';

// --- 辅助类：优先队列 ---
class PriorityQueue<T> {
  private values: { val: T; priority: number }[] = [];

  enqueue(val: T, priority: number) {
    this.values.push({ val, priority });
    this.sort();
  }

  dequeue(): T | undefined {
    return this.values.shift()?.val;
  }

  isEmpty(): boolean {
    return this.values.length === 0;
  }

  private sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}

// --- 核心算法服务 ---

export class RouteFinder {
  
  /**
   * 主入口：计算路径
   */
  public calculate(startId: string, endId: string, config: AlgorithmConfig): RouteResult | null {
    // 1. 检查站点是否存在
    if (!graphService.getStation(startId) || !graphService.getStation(endId)) {
      console.error("Invalid start or end station");
      return null;
    }

    let path: string[] | null = null;

    // 2. 处理途经站 (Via Stations)
    if (config.viaStations && config.viaStations.length > 0) {
      path = this.calculatePathWithVia(startId, endId, config);
    } else {
      // 3. 根据策略选择算法获取路径
      switch (config.strategy) {
        case 'min_stops':
          path = this.bfs(startId, endId);
          break;
        case 'min_transfers':
          path = this.dijkstra(startId, endId, config, 'transfers');
          break;
        case 'min_time':
          path = this.dijkstra(startId, endId, config, 'time');
          break;
        default:
          path = this.bfs(startId, endId);
      }
    }

    if (!path) return null;

    // 4. 统一计算物理指标 (严谨逻辑)
    return this.calculatePathMetrics(path, config);
  }

  /**
   * 处理途经站逻辑: Start -> Via1 -> Via2 -> End
   * 策略：分段计算最短路径，然后拼接 Path，最后统一计算指标
   */
  private calculatePathWithVia(startId: string, endId: string, config: AlgorithmConfig): string[] | null {
    const waypoints = [startId, ...config.viaStations!, endId];
    let combinedPath: string[] = [];

    // 分段计算
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segStart = waypoints[i];
      const segEnd = waypoints[i+1];
      
      // 递归调用获取子路径 (临时清空 viaStations)
      const subConfig = { ...config, viaStations: [] };
      // 这里我们需要直接调用内部算法获取 path，而不是 calculate，因为 calculate 会返回 Result 对象
      let segPath: string[] | null = null;
      
      switch (config.strategy) {
        case 'min_stops':
          segPath = this.bfs(segStart, segEnd);
          break;
        case 'min_transfers':
          segPath = this.dijkstra(segStart, segEnd, subConfig, 'transfers');
          break;
        case 'min_time':
          segPath = this.dijkstra(segStart, segEnd, subConfig, 'time');
          break;
        default:
          segPath = this.bfs(segStart, segEnd);
      }

      if (!segPath) return null; // 某一段不通

      // 合并结果
      if (i > 0) {
        // 去掉重复的起点 (上一段的终点 = 这一段的起点)
        combinedPath.push(...segPath.slice(1)); 
      } else {
        combinedPath.push(...segPath);
      }
    }

    return combinedPath;
  }

  /**
   * 策略1: 最少站数 (BFS)
   */
  private bfs(startId: string, endId: string): string[] | null {
    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const node = path[path.length - 1];

      if (node === endId) {
        return path;
      }

      const neighbors = graphService.getNeighbors(node);
      for (const edge of neighbors) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push([...path, edge.to]);
        }
      }
    }
    return null;
  }

  /**
   * 策略2 & 3: Dijkstra (最少换乘 / 最短时间)
   * 严谨实现：状态包含 (node, lastLine)
   */
  private dijkstra(startId: string, endId: string, config: AlgorithmConfig, mode: 'transfers' | 'time'): string[] | null {
    interface State {
      node: string;
      path: string[];
      cost: number;
      lastLine: string | null; // 关键：记录到达该点时的线路
    }

    const pq = new PriorityQueue<State>();
    pq.enqueue({ 
      node: startId, 
      path: [startId], 
      cost: 0, 
      lastLine: null
    }, 0);

    // 记录最小代价: key = `${node}_${line}`
    // 特殊情况：起点没有 line，key = `${startId}_null`
    const minCost = new Map<string, number>(); 

    while (!pq.isEmpty()) {
      const current = pq.dequeue()!;
      const { node, path, cost, lastLine } = current;

      // 状态去重 Key
      const stateKey = `${node}_${lastLine}`;
      if (minCost.has(stateKey) && minCost.get(stateKey)! < cost) continue;
      minCost.set(stateKey, cost);

      if (node === endId) {
        return path;
      }

      const neighbors = graphService.getNeighbors(node);
      for (const edge of neighbors) {
        let newCost = cost;
        
        // 判断是否换乘
        // 如果 lastLine 为 null (起点出发)，不算换乘
        const isTransfer = lastLine !== null && lastLine !== edge.line;

        // --- 成本计算 ---
        if (mode === 'transfers') {
          // 策略：最少换乘
          // 换乘惩罚 1000，站点惩罚 1
          if (isTransfer) newCost += 1000;
          newCost += 1;
        } else {
          // 策略：最短时间 (提高要求)
          // 1. 行驶时间 (Distance / v)
          const dist = config.useRealDistance ? edge.distanceKm : 1;
          const travelTimeH = dist / config.velocityKmH;
          const travelTimeSec = travelTimeH * 3600;
          
          newCost += travelTimeSec;

          // 2. 节点停留/换乘时间 (发生在 node 站点)
          if (lastLine !== null) { // 起点没有停留时间
            if (isTransfer) {
              // 换乘：消耗 T3
              newCost += config.transferTimeSec;
            } else {
              // 不换乘：消耗 t1 (中转站) 或 T2 (非中转站)
              const station = graphService.getStation(node);
              if (station?.isTransfer) {
                newCost += config.dwellTimeTransferSec; // t1
              } else {
                newCost += config.dwellTimeNormalSec;   // T2
              }
            }
          }
        }

        // 只有当成本更低时才加入队列
        const nextStateKey = `${edge.to}_${edge.line}`;
        if (!minCost.has(nextStateKey) || minCost.get(nextStateKey)! > newCost) {
           pq.enqueue({
            node: edge.to,
            path: [...path, edge.to],
            cost: newCost,
            lastLine: edge.line
          }, newCost);
        }
      }
    }

    return null;
  }

  /**
   * 统一物理指标计算器 (严谨逻辑)
   * 根据生成的 Path，回放整个过程，计算精确的时间、距离和步骤
   */
  private calculatePathMetrics(path: string[], config: AlgorithmConfig): RouteResult {
    const steps: RouteStep[] = [];
    let totalTime = 0;
    let totalDist = 0;
    let transfers = 0;
    
    let currentLine: string | null = null;

    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i+1];
      
      // 查找连接 u -> v 的边
      const neighbors = graphService.getNeighbors(u);
      
      // 贪心选择线路：
      // 如果当前已经在某条线上，且该线能通往下一站，优先保持（避免不必要的“假换乘”）
      // 否则，选择任意一条能通往下一站的线路
      let edge = neighbors.find(e => e.to === v && e.line === currentLine);
      if (!edge) {
        // 必须换线，或者刚从起点出发
        // 如果有多条线可选（共线段），选择哪条？
        // 简单起见，选第一条。严谨来说，应该看后续路径，但这里 path 已经确定，
        // 且共线段通常物理属性相同，选任一即可。
        edge = neighbors.find(e => e.to === v);
      }
      
      if (!edge) {
        console.error(`Missing connection between ${u} and ${v}`);
        break; 
      }

      // --- 1. 计算节点停留/换乘消耗 (在 u 站发生) ---
      if (i > 0) { // 起点没有“到达后停留”
        if (currentLine !== null && currentLine !== edge.line) {
          // 发生换乘
          transfers++;
          const transferCost = config.transferTimeSec; // T3
          totalTime += transferCost;
          
          steps.push({
            type: 'transfer',
            stationId: u,
            lineId: edge.line,
            distanceKm: 0,
            durationSec: transferCost,
            description: `在 ${u} 换乘 ${edge.line}号线`
          });
        } else {
          // 继续行驶 (不换乘)
          // 消耗 t1 (中转站) 或 T2 (非中转站)
          const station = graphService.getStation(u);
          const dwellCost = station?.isTransfer ? config.dwellTimeTransferSec : config.dwellTimeNormalSec;
          totalTime += dwellCost;
        }
      }

      // 更新当前线路
      currentLine = edge.line;

      // --- 2. 计算行驶消耗 (u -> v) ---
      const dist = config.useRealDistance ? edge.distanceKm : 1;
      const travelTimeH = dist / config.velocityKmH;
      const travelTimeSec = travelTimeH * 3600;
      
      totalDist += dist;
      totalTime += travelTimeSec;

      // --- 3. 记录步骤 ---
      if (i === 0) {
        steps.push({
          type: 'start',
          stationId: u,
          lineId: currentLine,
          distanceKm: 0,
          durationSec: 0,
          description: `从 ${u} 出发`
        });
      }

      steps.push({
        type: i === path.length - 2 ? 'end' : 'move',
        stationId: v,
        lineId: currentLine,
        toStationId: v,
        distanceKm: dist,
        durationSec: travelTimeSec,
        description: `乘坐 ${currentLine}号线 到达 ${v}`
      });
    }

    return {
      path,
      steps,
      totalTimeSec: Math.round(totalTime),
      totalDistanceKm: parseFloat(totalDist.toFixed(2)),
      totalTransfers: transfers,
      totalStops: path.length - 1
    };
  }
}

export const routeFinder = new RouteFinder();