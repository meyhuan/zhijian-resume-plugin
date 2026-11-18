import type { ResumeData } from './src/entities/resume/resume-data';
import type { ThemeTokens } from './src/entities/theme/theme-tokens';
export interface EditorDocument {
  resume: ResumeData;
  template: string;
  themes: Record<string, ThemeTokens>;
  sidebarSectionIds?: string[];
}
export interface Snapshot {
  id: string;
  revision: number;
  expiresAt: number;
  document: EditorDocument;
}
export interface EditorSession extends Snapshot { accessKey: string }
export const DEMO_RESUME = {
  name: '林晓', baseInfo: { title: '产品经理', email: 'demo@example.com', location: '上海' },
  sections: [
    { title: '工作经历', columns: 1, blocks: [{ type: 'experience', company: '示例科技（虚构）', position: '产品经理', startDate: '2023-07', endDate: '至今', contentHtml: '<p>负责用户需求分析与产品方案设计，协调研发推进项目交付。</p><p>点击这里修改经历，也可以切换模板和调整行间距。</p>' }] },
    { title: '教育经历', columns: 1, blocks: [{ type: 'education', school: '示例大学（虚构）', major: '信息管理', degree: '本科', startDate: '2019-09', endDate: '2023-06', courseHtml: '<p>学习数据分析、产品设计与项目管理。</p>' }] },
  ],
};
