import type { Station, Connection, EChartsGraphData, Line } from '../types';

export class MetroGraph {
    // 存储所有站点: id -> Station
    private stations: Map<string, Station>;
    // 存储邻接表: id -> Connection[]
    private adjList: Map<string, Connection[]>;
    // 存储线路信息: id -> Line (用于可视化颜色查找)
    private lines: Map<string, Line>;

    constructor() {
        this.stations = new Map();
        this.adjList = new Map();
        this.lines = new Map();
    }

    /**
     * 初始化数据
     */
    public init(stations: Station[], connections: Connection[], lines: Line[]) {
        this.clear();
        lines.forEach(l => this.lines.set(l.id, l));
        stations.forEach(s => this.addStation(s));
        connections.forEach(c => this.addEdge(c));
    }

    public clear() {
        this.stations.clear();
        this.adjList.clear();
        this.lines.clear();
    }

    //  节点操作 (CRUD) 

    public addStation(station: Station) {
        if (!this.stations.has(station.id)) {
            this.stations.set(station.id, station);
            this.adjList.set(station.id, []);
        } else {
            // 更新现有站点
            this.stations.set(station.id, { ...this.stations.get(station.id)!, ...station });
        }
    }

    public removeStation(id: string) {
        if (!this.stations.has(id)) return;

        // 1. 删除该节点
        this.stations.delete(id);

        // 2. 删除从该节点出发的边
        this.adjList.delete(id);

        // 3. 删除指向该节点的边
        for (const [startNode, edges] of this.adjList.entries()) {
            const newEdges = edges.filter(edge => edge.to !== id);
            this.adjList.set(startNode, newEdges);
        }
    }

    public getStation(id: string): Station | undefined {
        return this.stations.get(id);
    }

    public getAllStations(): Station[] {
        return Array.from(this.stations.values());
    }

    public updateStationPosition(id: string, x: number, y: number) {
        const station = this.stations.get(id);
        if (station) {
            station.position = { x, y };
        }
    }

    //  边操作 (CRUD) 

    public addEdge(connection: Connection) {
        // 确保起点和终点存在
        if (!this.stations.has(connection.from) || !this.stations.has(connection.to)) {
            console.warn(`Cannot add edge: Station ${connection.from} or ${connection.to} does not exist.`);
            return;
        }

        // 添加正向边
        this.addEdgeInternal(connection);

        // 添加反向边 (无向图)
        this.addEdgeInternal({
            from: connection.to,
            to: connection.from,
            line: connection.line,
            distanceKm: connection.distanceKm
        });
    }

    private addEdgeInternal(conn: Connection) {
        const edges = this.adjList.get(conn.from) || [];
        // 检查是否已存在相同线路的连接，避免重复
        const exists = edges.some(e => e.to === conn.to && e.line === conn.line);
        if (!exists) {
            edges.push(conn);
            this.adjList.set(conn.from, edges);
        }
    }

    public removeEdge(from: string, to: string) {
        // 删除正向
        const fromEdges = this.adjList.get(from);
        if (fromEdges) {
            this.adjList.set(from, fromEdges.filter(e => e.to !== to));
        }
        // 删除反向
        const toEdges = this.adjList.get(to);
        if (toEdges) {
            this.adjList.set(to, toEdges.filter(e => e.to !== from));
        }
    }

    public getNeighbors(id: string): Connection[] {
        return this.adjList.get(id) || [];
    }

    //  辅助查询 

    public getLineColor(lineId: string): string {
        return this.lines.get(lineId)?.color || '#999';
    }

    //  ECharts 适配 

    /**
     * 转换为 ECharts Graph 需要的数据格式
     */
    public toEChartsData(): EChartsGraphData {
        const nodes: EChartsGraphData['nodes'] = [];
        const links: EChartsGraphData['links'] = [];
        const categories: EChartsGraphData['categories'] = [];

        // 生成 Categories (按线路)
        const lineIds = Array.from(this.lines.keys());
        lineIds.forEach(id => categories.push({ name: `${id}号线` }));

        // 生成 Nodes
        this.stations.forEach(station => {
            const isTransfer = station.isTransfer;
            const mainLineId = station.lines[0];
            const lineColor = this.getLineColor(mainLineId);

            // 获取该站点在主线路中的索引，用于计算文字交错位置
            const mainLine = this.lines.get(mainLineId);
            const stationIndex = mainLine ? mainLine.stations.indexOf(station.id) : 0;

            // 简单的样式逻辑：换乘站大一点
            const size = isTransfer ? 16 : 8;

            nodes.push({
                id: station.id,
                name: station.name,
                x: station.position.x,
                y: station.position.y,
                symbolSize: size,
                itemStyle: {
                    color: '#ffffff', // 统一白色背景
                    borderColor: isTransfer ? '#333333' : lineColor,
                    borderWidth: isTransfer ? 3 : 2
                },
                // 传递额外属性给前端组件使用
                // @ts-ignore
                isTransfer: isTransfer,
                // @ts-ignore
                lineColor: lineColor,
                // @ts-ignore
                stationIndex: stationIndex // 传递索引
            });
        });

        // 生成 Links
        // 为了避免 ECharts 绘制双重线（A->B 和 B->A），我们需要去重
        const processedEdges = new Set<string>();

        this.adjList.forEach((edges, fromId) => {
            edges.forEach(edge => {
                const edgeKey = [fromId, edge.to].sort().join('-');
                if (processedEdges.has(edgeKey)) return;
                processedEdges.add(edgeKey);

                links.push({
                    source: fromId,
                    target: edge.to,
                    lineStyle: {
                        color: this.getLineColor(edge.line)
                    },
                    value: edge.distanceKm
                });
            });
        });

        return { nodes, links, categories };
    }
}

// 导出单例实例，或者在应用中通过 Context 创建
export const graphService = new MetroGraph();