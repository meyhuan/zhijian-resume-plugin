import type { TemplateTaxonomy } from './template-taxonomy'

export interface TemplateMetadata {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly preview: string
  readonly tags: readonly string[]
  readonly taxonomy: TemplateTaxonomy
  readonly visibility: { readonly editor: boolean; readonly catalog: boolean }
}

/** Shared display data only: no React, template components or server dependencies.
 * Taxonomy describes suitability, not a release/ATS certification.
 * Keep historical visibility until separate publication review.
 */
export const TEMPLATE_METADATA = {
  simple: {
    id: 'simple',
    name: '简约',
    description: '简洁大方，适合所有场景',
    preview: '/thumbnails/template_simple.webp',
    tags: ['通用', '简洁'],
    taxonomy: {
      stages: ['graduate', 'experienced'],
      roles: ['general', 'business'],
      styles: ['minimal'],
      layouts: ['single'],
      densities: ['standard'],
      languages: ['zh'],
    },
    visibility: { editor: true, catalog: true },
  },
  elegant: {
    id: 'elegant',
    name: '典雅',
    description: '深色头部 + 金色点缀，庄重大方，适合正式场合',
    preview: '/thumbnails/template_elegant.webp',
    tags: ['正式', '庄重', '典雅', '金色'],
    taxonomy: {
      stages: ['experienced'],
      roles: ['general'],
      styles: ['formal'],
      layouts: ['single'],
      densities: ['standard'],
      languages: ['zh'],
    },
    visibility: { editor: true, catalog: true },
  },
} as const satisfies Record<string, TemplateMetadata>
export const templateMetadata: TemplateMetadata[] = Object.values(TEMPLATE_METADATA);
