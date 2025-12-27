# 南京地铁通 (Nanjing Metro App) 项目架构分析

## 1. 项目概述

本项目是一个基于 Web 的现代化地铁线路查询与可视化系统。采用 **React + TypeScript** 构建，使用 **Material UI (MUI)** 实现 Material Design 3 风格的响应式界面，并利用 **ECharts** 实现高性能的地铁拓扑图可视化。

### 技术栈
*   **核心框架**: React 18, TypeScript, Vite
*   **UI 组件库**: @mui/material, @mui/icons-material, @emotion
*   **可视化**: echarts, echarts-for-react
*   **算法逻辑**: BFS (广度优先搜索), Dijkstra (最短路径算法)

---

## 2. 系统架构设计

系统采用经典的 **分层架构 (Layered Architecture)**，实现了视图、逻辑与数据的解耦。

### 2.1 架构分层图

*   **表现层 (Presentation Layer)**: 负责 UI 渲染与用户交互。
    *   *Components*: Layout, Sidebar, Map, RouteResult
    *   *Context*: ThemeContext (全局主题状态)
*   **容器层 (Container Layer)**: 负责业务状态管理与组件协调。
    *   *App.tsx*: 核心控制器，管理站点选择、路由计算结果、侧边栏联动。
*   **业务逻辑层 (Service Layer)**: 封装核心算法与图操作。
    *   *GraphService*: 图数据结构的维护、ECharts 数据转换。
    *   *RouteFinder*: 路径规划算法实现（最短路径、最少换乘、途经点处理）。
*   **数据层 (Data Layer)**: 静态数据与生成逻辑。
    *   *Static Data*: Stations, Lines.
    *   *Generator*: 坐标插值与连接关系生成。

---

## 3. 核心模块详细分析

### 3.1 业务逻辑层 (Services)

这是系统的核心大脑，采用**单例模式**提供服务。

#### A. 图服务 (`src/services/Graph.ts`)
*   **职责**: 维护地铁网络的内存模型（邻接表），提供节点查询、增删改查 API，以及将逻辑图转换为 ECharts 可视化数据。
*   **核心类**: `MetroGraph`
    *   `adjList`: `Map<string, Connection[]>` (邻接表存储图结构)
    *   `stations`: `Map<string, Station>` (站点查找表)
    *   `toEChartsData()`: 将拓扑结构转换为 Nodes/Links/Categories 供前端渲染。

#### B. 路由算法服务 (`src/services/Algorithms.ts`)
*   **职责**: 根据用户配置（策略、物理参数）计算最优路径。
*   **核心类**: `RouteFinder`
    *   **策略模式**: 支持三种策略 (`min_stops`, `min_transfers`, `min_time`)。
    *   **算法实现**:
        *   `bfs()`: 用于最少站数查询。
        *   `dijkstra()`: 用于最少换乘（加权图，换乘惩罚权重 1000）和最短时间（基于物理距离和速度）查询。
    *   **高级特性**:
        *   `calculatePathWithVia()`: 支持途经点。将路径拆分为 `Start -> Via -> End` 分段计算后合并。
        *   `calculatePathMetrics()`: 统一计算物理指标（总耗时、总距离、换乘次数），模拟真实物理世界的停站时间 ($T_1, T_2$) 和换乘耗时 ($T_3$)。

### 3.2 表现层 (UI/UX)

#### A. 布局系统 (`src/components/Layout`)
*   **MainLayout**: 采用 Flex 布局，包含顶部 AppBar（毛玻璃效果）、左侧搜索栏、中间地图区、右侧结果栏。
*   **ResizableSidebar**: 自定义组件，支持鼠标拖拽调整侧边栏宽度，增强用户体验。
*   **ThemeSystem**:
    *   `ThemeContext`: 管理深色模式 (Dark Mode) 和主题色 (Source Color)。
    *   `theme.ts`: 实现了 Material Design 3 的动态调色板算法，根据选定的线路颜色自动生成配套的 UI 颜色体系。

#### B. 可视化地图 (`src/components/Map`)
*   **MetroMap**: 封装 ECharts 实例。
*   **交互逻辑**:
    *   点击节点触发 `onStationClick` 回调。
    *   监听 `routeResult` 变化，自动高亮路径节点和连线，淡化非相关节点。

---

## 4. 数据流向 (Data Flow)

### 4.1 初始化流程
1.  `App.tsx` 加载时触发 `useEffect`。
2.  调用 `graphService.init(stations, connections, lines)`。
3.  图服务构建内存邻接表，标记 `isGraphReady = true`。

### 4.2 路径规划流程
1.  **用户交互**: 用户在 `SearchPanel` 选择起点、终点、途经点，或在地图上点击站点。
2.  **状态更新**: `App.tsx` 更新 `selectedStations` 状态。
3.  **触发搜索**: 用户点击搜索，`App.tsx` 调用 `routeFinder.calculate(start, end, config)`。
4.  **算法执行**:
    *   `RouteFinder` 从 `GraphService` 获取邻居节点。
    *   执行 Dijkstra/BFS 计算路径 ID 序列。
    *   回放路径，计算时间、距离等详细指标。
5.  **结果分发**:
    *   `RouteResult` 对象返回给 `App.tsx`。
    *   `App.tsx` 将结果传递给 `RouteTimeline` (展示文字步骤) 和 `MetroMap` (绘制高亮路径)。
    *   右侧边栏自动展开。

---

## 5. 关键数据结构 (Domain Model)

定义在 `src/types/index.ts` 中：

```typescript
// 站点模型
interface Station {
  id: string;
  name: string;
  lines: string[];
  isTransfer: boolean;
  position: { x: number, y: number };
}

// 连接模型 (边)
interface Connection {
  from: string;
  to: string;
  line: string;
  distanceKm: number; // 核心：支持非等距计算
}

// 算法配置
interface AlgorithmConfig {
  strategy: 'min_stops' | 'min_transfers' | 'min_time';
  viaStations?: string[]; // 支持途经点
  velocityKmH: number;    // 地铁速度 v
  dwellTimeTransferSec: number; // 换乘站停留 t1
  dwellTimeNormalSec: number;   // 普通站停留 T2
  transferTimeSec: number;      // 换乘耗时 T3
}
```

## 6. 目录结构说明

```text
src/
├── components/
│   ├── Layout/          # 布局框架 (MainLayout, ResizableSidebar, ThemeSelector)
│   ├── Map/             # 地图组件 (MetroMap)
│   ├── RouteResult/     # 结果展示 (RouteTimeline)
│   └── Sidebar/         # 搜索面板 (SearchPanel)
├── contexts/            # 全局状态 (ThemeContext)
├── data/                # 数据源 (stations, lines, connections, generator)
├── services/            # 核心逻辑
│   ├── Algorithms.ts    # 路由算法 (BFS, Dijkstra)
│   └── Graph.ts         # 图数据管理
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
├── App.tsx              # 主控制器
└── theme.ts             # MUI 主题配置
```