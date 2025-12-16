/**
 * 站点信息
 */
export interface Station {
  id: string;       // 站点唯一标识 (如 "南京站")
  name: string;     // 显示名称
  lines: string[];  // 该站点所属线路列表 (如 ["1", "3"])
  position: {       // 可视化坐标 (0-1 之间的相对坐标 或 实际像素坐标)
    x: number;
    y: number;
  };
  isTransfer: boolean; // 是否为换乘站 (辅助字段，可通过 lines.length > 1 判断)
}

/**
 * 线路信息
 */
export interface Line {
  id: string;       // 线路ID (如 "1", "S1")
  name: string;     // 线路名称 (如 "1号线")
  color: string;    // 线路颜色 (如 "#3498DB")
  stations: string[]; // 该线路包含的站点ID有序列表
}

/**
 * 连接/边 (图的边)
 */
export interface Connection {
  from: string;     // 起点站ID
  to: string;       // 终点站ID
  line: string;     // 所属线路ID
  distanceKm: number; // 距离 (km) - 提高要求：相邻站点距离不相等
}



/**
 * ECharts 图表数据格式
 */
export interface EChartsGraphData {
  nodes: {
    id: string;
    name: string;
    x: number;
    y: number;
    value?: any;
    symbolSize?: number;
    itemStyle?: { 
      color?: string;
      borderColor?: string;
      borderWidth?: number;
      shadowBlur?: number;
      shadowColor?: string;
      opacity?: number;
    };
    category?: number; // 对应线路索引
    // 允许额外的自定义属性
    [key: string]: any; 
  }[];
  links: {
    source: string;
    target: string;
    lineStyle?: { 
      color?: string;
      width?: number;
      curveness?: number;
      opacity?: number;
    };
    value?: number; // 距离或其他权重
    // 允许额外的自定义属性
    [key: string]: any;
  }[];
  categories: { name: string }[];
}

/**
 * 算法配置参数 (包含基本要求和提高要求的物理参数)
 */
export interface AlgorithmConfig {
  // 策略选择
  strategy: 'min_stops' | 'min_transfers' | 'min_time';
  
  // 途经站 (提高要求 3)
  viaStations?: string[]; 

  // 物理参数 (提高要求)
  velocityKmH: number;        // v: 地铁平均速度 (km/h)
  dwellTimeTransferSec: number; // t1: 中转站停留时间 (秒)
  dwellTimeNormalSec: number;   // T2: 非中转站停留时间 (秒)
  transferTimeSec: number;      // T3: 换乘一次的时间消耗 (秒)
  
  // 模式开关
  // true: 使用 distanceKm 计算; false: 假设相邻站点路径长度相等 (基本要求)
  useRealDistance: boolean; 
}

/**
 * 路径规划的详细步骤 (用于前端展示 Timeline)
 */
export interface RouteStep {
  type: 'start' | 'move' | 'transfer' | 'end';
  stationId: string;      // 当前站点
  lineId?: string;        // 当前所在线路 (start/move/end) 或 目标线路 (transfer)
  toStationId?: string;   // move 的目标站点
  
  // 该步骤的消耗
  distanceKm: number;
  durationSec: number;
  
  // 描述文本 (如 "乘坐 1号线 经过 3 站")
  description?: string;
}

/**
 * 最终路径结果
 */
export interface RouteResult {
  path: string[];         // 经过的站点ID完整序列 (用于地图高亮)
  steps: RouteStep[];     // 详细步骤 (用于侧边栏展示)
  
  // 统计数据
  totalTimeSec: number;   // 总耗时
  totalDistanceKm: number;// 总距离
  totalTransfers: number; // 换乘次数
  totalStops: number;     // 途径站数 (不含起点)
}

/**
 * 图的数据结构 (邻接表)
 */
export interface GraphData {
  stations: Map<string, Station>;
  adjList: Map<string, Connection[]>; // stationId -> Connections
}