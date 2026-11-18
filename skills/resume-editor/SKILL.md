---
name: resume-editor
description: 智简简历：在本地桌面宿主内打开可编辑简历、切换模板、调整行间距并导出分页 PDF。
---

Use the zhijian-resume create_resume tool to show the interactive resume editor inside the desktop host. The widget contains the editing UI; do not tell the user to open a website or start a public server.

Only use experiences supplied by the user. For a requested demonstration, label the data fictional. Supply resume.name, resume.baseInfo and resume.sections; each section has a title and typed blocks (text, experience, education, project, campus or list). Text blocks use html; experience blocks use company, position, startDate, endDate and contentHtml. Supported templates are simple and elegant.

The editor autosaves on this computer. The user can edit text, switch template, change line height, and click 导出分页 PDF, then 下载 PDF. PDF rendering requires Chrome or Edge on Windows. No website account or public endpoint is involved. Do not claim a PDF was exported without a successful tool or UI result.

## 首次使用

```text
请用智简简历创建一份虚构的中文求职简历，并打开内嵌编辑器，让我修改内容、切换模板、调整行间距并导出分页 PDF。
```

The product name shown to users is 智简简历. The stable technical identifiers remain zhijian-resume / zhijian-resume-desktop. Never invent factual experience; the starter prompt deliberately requests fictional data.
