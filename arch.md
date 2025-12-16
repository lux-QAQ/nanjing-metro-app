我打算使用React + TypeScript以及MUI制作一个Material UI风格的“南京地铁通APP”
我已经安装了React + TypeScript
以及@mui/material @emotion/react @emotion/styled还有ECharts，核心的几个组件都已经安装了

下面是需求，不一定需要立刻实现，但是需要考虑到可扩展性
基本要求：
(1) 存储南京地铁线路站点信息。
(2) 给定起点站和终点站，假设相邻站点路径长度相等，求路径最短的地铁乘坐方案；
(3) 给定起点站和终点站，假设相邻站点路径长度相等，求换乘次数最少的地铁乘坐方案，若存在多条换乘次数相同的乘坐方案，则给出换乘次数最少且路径长度最短的乘坐方案。
提高要求：
在实际应用中，相邻站点的距离并不相等，假设中转站地铁停留时间为t1，非中转站地铁停留时间为T2，地铁换乘一次的时间消耗为T3（不考虑等待地铁的时间），地铁平均速度为v，相邻站点的路径长度已知，试求：
(1)在给定起点站和终点站的情况下，求乘坐时间最短的地铁乘坐方案。
(2)设计可视化的查询界面。
(3)可以在界面对地铁图编辑和交互。
(4)添加途经站的约束下求解之前的问题


已经拥有了一个坚实的基础（React + TypeScript + Vite + MUI + ECharts）。demo.html 提供了一个很好的算法和可视化原型，但要将其转化为一个可扩展、现代化的 React 应用，我们需要进行系统性的重构。

以下是针对你的需求（包括基础和提高要求）的详细分析和规划。

### 1. 核心分析与架构思路

*   **数据层 (Data)**: demo.html 中的数据比较简单。为了满足“提高要求”（不同站间距、不同停站时间），我们需要设计更详细的数据结构（例如：边不仅包含连接关系，还要包含距离）。
*   **算法层 (Service)**: 现有的 BFS 和 Dijkstra 算法需要封装成独立的 TypeScript 服务或类。特别是“途经站”功能，本质上是分段路由（起点->途经点->终点）。
*   **视图层 (View)**:
    *   **UI**: 使用 Material UI 组件（Drawer, Autocomplete, Card, Stepper 等）替换原生的 HTML 元素。
    *   **可视化**: 你安装了 `ECharts`，这很好。虽然 demo.html 使用了原生 Canvas 实现力导向图，但 **ECharts 的 Graph 图表** 更适合做这种拓扑关系的可视化，且自带交互（缩放、点击、高亮），开发效率更高。当然，如果你非常喜欢 demo 中的物理弹跳效果，我们也可以把那段 Canvas 代码封装成 React 组件。鉴于你安装了 ECharts，我建议优先尝试 ECharts，或者保留 Canvas 作为备选。

### 2. 推荐的目录结构

建议在 src 下创建以下文件夹和文件：

```text
src/
├── assets/              # 静态资源（图片等）
├── components/          # UI 组件
│   ├── Layout/          # 布局组件 (MainLayout.tsx)
│   ├── Map/             # 地图可视化组件 (MetroMap.tsx - 使用 ECharts 或 Canvas)
│   ├── Sidebar/         # 侧边栏搜索组件 (SearchPanel.tsx)
│   └── RouteResult/     # 路线结果展示 (RouteTimeline.tsx)
├── data/                # 静态数据
│   ├── stations.ts      # 站点数据
│   ├── lines.ts         # 线路数据 (颜色、名称)
│   └── connections.ts   # 拓扑结构与距离数据
├── services/            # 核心逻辑
│   ├── Graph.ts         # 图数据结构定义
│   ├── Algorithms.ts    # 路由算法 (BFS, Dijkstra)
│   └── TimeCalculator.ts# 时间计算逻辑 (处理 T1, T2, T3, v)
├── types/               # TypeScript 类型定义
│   └── index.ts         # Station, Route, Edge 等接口定义
├── utils/               # 工具函数
│   └── format.ts        # 时间/距离格式化
├── App.tsx              # 主入口
└── theme.ts             # MUI 主题配置 (可选)
```

### 3. 需要补充安装的库

你已经安装了核心库，但为了更好的体验，建议补充以下库：

1.  **@mui/icons-material**: MUI 的图标库，用于显示地铁、搜索、换乘等图标。
2.  **lodash** (可选): 用于数据处理（如深拷贝、防抖等），虽然不是必须，但在处理复杂图数据时很有用。

你可以运行以下命令安装图标库：
```bash
npm install @mui/icons-material
```

### 4. 详细实现规划

#### 第一步：定义类型 (Types)
为了满足“提高要求”，我们需要在 `src/types/index.ts` 中定义强类型：

```typescript
export interface Station {
  id: string;
  name: string;
  lines: string[]; // 该站点所属线路
  isTransfer: boolean; // 是否为换乘站
  position?: { x: number, y: number }; // 可视化坐标
}

export interface Connection {
  from: string;
  to: string;
  line: string;
  distanceKm: number; // 提高要求：相邻站点距离
}

export interface RouteStep {
  station: string;
  line: string;
  action: 'start' | 'move' | 'transfer' | 'end';
  duration?: number; // 该步骤耗时
}

export interface RouteResult {
  path: string[];
  steps: RouteStep[];
  totalStops: number;
  totalTransfers: number;
  totalTimeSec: number;
  totalDistanceKm: number;
}
```

#### 第二步：迁移与增强算法 (Services)
在 `src/services/Algorithms.ts` 中，我们需要改造 demo.html 中的算法：

1.  **图构建**: 读取 `connections.ts`，构建邻接表。
2.  **权重计算**:
    *   **最少站数**: 边权重 = 1。
    *   **最少换乘**: 边权重 = 1，换乘惩罚 = 1000 (如 demo 所示)。
    *   **最短时间 (提高要求)**:
        *   边权重 = `distance / speed`。
        *   节点进入成本 (In-node cost):
            *   如果是中转站且发生换乘: `+ T3` (换乘时间)。
            *   如果是普通站点或中转站但不换乘: `+ T2` (停站时间)。
            *   (注：起点和终点通常不计算停站时间，需特殊处理)。
3.  **途经站支持**:
    *   如果用户选择了途经站 `M`，则计算 `Start -> M` 的最优路径 + `M -> End` 的最优路径，然后合并。

#### 第三步：可视化组件 (MetroMap)
使用 `echarts-for-react`：
*   将站点映射为 ECharts Graph 的 `nodes`。
*   将连接映射为 `links`。
*   使用 `lines` 数据给边上色。
*   **交互**: 点击 ECharts 节点时，回调通知父组件更新“起点”或“终点”输入框。

#### 第四步：UI 交互 (MUI)
*   **Sidebar**: 使用 `Drawer` 作为容器。
*   **输入**: 使用 `Autocomplete` 组件让用户可以搜索站点（支持拼音过滤体验更好）。
*   **途经站**: 添加一个“+ 添加途经点”按钮，动态插入一个 `Autocomplete` 输入框。
*   **结果展示**: 使用 `Stepper` (垂直步骤条) 展示路线，清晰标记换乘站点。

### 5. 总结与建议

目前的 demo.html 逻辑是混在一起的，重构的关键是**关注点分离**。

1.  **先做数据和算法**: 不要急着画图。先建立 `src/data` 和 `src/services`，写单元测试或者简单的 `console.log` 验证：输入南京站到南京南站，能否算出正确的路径和时间。
2.  **再做 UI 骨架**: 用 MUI 搭建出左侧控制面板、右侧空白区域的布局。
3.  **最后做可视化**: 将数据喂给 ECharts 或 Canvas 进行渲染。

如果你准备好了，我们可以从**第一步：创建数据结构和类型定义**开始。你需要我先为你生成这些基础文件吗？