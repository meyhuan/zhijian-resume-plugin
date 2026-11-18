import { lazy, type ComponentType } from 'react'

import { TEMPLATE_METADATA, type TemplateMetadata } from '@/lib/templates/template-metadata'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeFontFamilyId } from '@/entities/theme/font-stacks'

export interface TemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  /** Section IDs placed in the sidebar (used by two-column templates). */
  readonly sidebarSectionIds?: readonly string[]
  /** Notify parent when sidebar assignment changes (for persistence). */
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
}

export interface TemplateConfig extends TemplateMetadata {
  readonly author?: string
  readonly component: ComponentType<TemplateProps>
  /**
   * Export layout contract shared by PC preview, mobile preview and server-side print.
   * - standard: native @page margins provide repeated top/bottom whitespace.
   * - bleed: the template owns the full A4 canvas and should export with zero @page margin.
   */
  readonly exportLayout?: 'standard' | 'bleed'
  /**
   * Flagship templates own a deliberate brand palette that should not be
   * overridden by the user's chosen primaryColor. When true, the theme panel
   * will disable the primary-color section for this template and explain why.
   */
  readonly locksPrimaryColor?: boolean
  /**
   * Flagship templates can declare their signature primary color. When a user
   * opens this template for the first time (no saved theme yet), the app will
   * seed `theme.primaryColor` with this value instead of the global default.
   */
  readonly recommendedPrimaryColor?: string
  /** Template-level default font style. Defaults to `sans`. */
  readonly recommendedFontFamilyId?: ResumeFontFamilyId
}


/**
 * 模板注册表
 * 使用动态import，每个模板会被Vite自动分割成独立chunk
 */
export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  // ——— Legacy templates (pre-kernel, kept as the utility baseline) —————
  simple: {
    ...TEMPLATE_METADATA.simple,
    component: lazy(() => import('@/templates/simple')),
  },
  elegant: {
    ...TEMPLATE_METADATA.elegant,
    component: lazy(() => import('@/templates/elegant')),
  },
};
export const getTemplate = (id: string): TemplateConfig | undefined => TEMPLATE_REGISTRY[id];
export const getAllTemplates = () => Object.values(TEMPLATE_REGISTRY);
export const getPublicTemplates = getAllTemplates;
export const searchTemplatesByTag = (tag: string) => getAllTemplates().filter(t=>t.tags.includes(tag));
