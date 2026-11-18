export type ChatChangeProposal =
  | {
      action: 'updateBlock';
      blockId: string;
      html: string;
      reason?: string;
    }
  | {
      action: 'addSection';
      type: string;
      title: string;
      contentHtml?: string;
    }
  | {
      action: 'suggestSkills';
      skills: string[];
      category: string;
    };

