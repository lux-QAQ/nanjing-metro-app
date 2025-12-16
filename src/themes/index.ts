import autumn from './autumn.json';
import blue from './blue.json';
import greem from './greem.json';
import summer from './summer.json';

// 定义主题类型
export type ThemeName = 'autumn' | 'blue' | 'greem' | 'summer';

export interface ThemeConfig {
    name: string;
    label: string;
    data: any; // JSON 数据
    primaryColor: string; // 用于在选择器中显示的预览色
}

export const themeConfigs: Record<ThemeName, ThemeConfig> = {
    greem: {
        name: 'greem',
        label: '生态绿',
        data: greem,
        primaryColor: greem.schemes.light.primary
    },
    blue: {
        name: 'blue',
        label: '静谧蓝',
        data: blue,
        primaryColor: blue.schemes.light.primary
    },

    autumn: {
        name: 'autumn',
        label: '金秋韵',
        data: autumn,
        primaryColor: autumn.schemes.light.primary
    },
    summer: {
        name: 'summer',
        label: '盛夏粉',
        data: summer,
        primaryColor: summer.schemes.light.primary
    }
};