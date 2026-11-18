import { toast } from 'sonner';
import type { ReactNode } from 'react';
const explain = (..._args: unknown[]): void => { toast.info('此体验版请在 ChatGPT 对话中生成内容；编辑器内可以直接修改文字。'); };
export function useAiSection() { return { openPolish: explain, openGenerate: explain }; }
export default function AiAdapter({ children }: { children: ReactNode }) { return children; }
