import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { randomUUID } from 'node:crypto';
import { normalizeResumeContent } from '../src/entities/resume/normalize-resume-content';
import { templateMetadata } from '../src/lib/templates/template-metadata';
import type { ResumeData } from '../src/entities/resume/resume-data';

const text = z.string().max(5000);
const html = z.string().max(50000).transform(value => sanitizeHtml(value, {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'span'],
  allowedAttributes: {},
}));
const id = z.string().min(1).max(100).optional();
const dates = { startDate: text.default(''), endDate: text.default('') };
const blocks = z.discriminatedUnion('type', [
  z.object({ id, type: z.literal('text'), html }),
  z.object({ id, type: z.literal('experience'), company: text, position: text, industry: text.optional(), ...dates, contentHtml: html }),
  z.object({ id, type: z.literal('education'), school: text, major: text.optional(), degree: text.optional(), ...dates, courseHtml: html.optional() }),
  z.object({ id, type: z.literal('project'), name: text, role: text.optional(), ...dates, contentHtml: html }),
  z.object({ id, type: z.literal('campus'), organization: text, position: text, ...dates, contentHtml: html }),
  z.object({ id, type: z.literal('list'), items: z.array(z.object({ id, html })).max(100) }),
]);
export const resumeSchema = z.object({
  id, name: text.min(1), language: z.enum(['zh', 'en']).optional(),
  baseInfo: z.object({
    title: text.optional(), phone: text.optional(), email: text.optional(), gender: text.optional(),
    age: z.number().min(0).max(150).optional(), location: text.optional(), currentLocation: text.optional(),
    nation: text.optional(), household: text.optional(), workStartTime: text.optional(), politicalStatus: text.optional(),
    height: text.optional(), weight: text.optional(), showAvatar: z.boolean().optional(),
    avatarUrl: z.string().max(1500000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).optional(),
    avatarSize: z.enum(['default', 'large', 'max']).optional(),
    customFields: z.array(z.object({ label: text, value: text })).max(20).optional(),
  }).optional(),
  jobIntention: z.record(z.string().max(100), z.union([text, z.boolean(), z.array(z.object({ label: text, value: text }))])).optional(),
  jobIntentionVisible: z.boolean().optional(), headerJobIntentionVisible: z.boolean().optional(),
  sections: z.array(z.object({ id, title: text, displayTitle: text.optional(), columns: z.number().int().min(1).max(2).default(1), blocks: z.array(blocks).max(100) })).max(30),
});
export const templateSchema = z.string().refine(value => templateMetadata.some(t => t.id === value && t.visibility.editor && t.visibility.catalog) || value === 'simple', '请选择公开模板');
export const themeSchema = z.object({
  primaryColor: z.string().regex(/^#[\da-fA-F]{6}$/), textColor: z.string().regex(/^#[\da-fA-F]{6}$/),
  fontFamily: z.string().max(300), fontFamilyId: z.enum(['sans', 'serif']).optional(),
  fontSize: z.number().min(12).max(24), lineHeight: z.number().min(1.2).max(2.5),
  spacingScale: z.number().min(0).max(3), pagePaddingVertical: z.number().min(0).max(40), pagePaddingHorizontal: z.number().min(0).max(40),
  titleScale: z.number().min(.5).max(2).optional(), paragraphIndent: z.number().min(0).max(4).optional(), onePageFit: z.literal(false).optional(),
});
export const documentSchema = z.object({
  resume: resumeSchema, template: templateSchema,
  themes: z.record(z.string().max(100), themeSchema).refine(v => Object.keys(v).length <= 150),
  sidebarSectionIds: z.array(z.string().max(100)).max(30).optional(),
});
export function normalizeInput(raw: z.infer<typeof resumeSchema>, resumeId: string): ResumeData {
  const resume = { ...raw, id: resumeId, sections: raw.sections.map(s => ({ ...s, id: s.id || randomUUID(), blocks: s.blocks.map(b => ({ ...b, id: b.id || randomUUID() })) })) };
  return normalizeResumeContent(resume as ResumeData);
}
