# ChatGPT 桌面接入

## 适用范围

本方案面向具备**本地插件、STDIO MCP、MCP Apps** 能力的 ChatGPT／Codex 桌面环境。本项目已在开发者的桌面宿主实际验证。不同版本、账号或发行渠道可能没有本地插件入口，安装脚本不能为宿主增加该能力。它不是普通 chatgpt.com 网页版的远程 Apps SDK 安装教程，不需要填写公网 MCP URL。

## 安装

1. 完成 [Windows 依赖准备](windows.md)。确保 `codex plugin --help` 可用；若不识别，先按你所用桌面环境的官方说明安装或更新 Codex CLI。
2. 双击 `install.cmd`，选择 `2` 或 `3`。也可执行 `powershell.exe -NoProfile -File scripts/install.ps1 -Target ChatGPT`。
3. 脚本调用 `codex plugin marketplace add <本机安装目录>` 与 `codex plugin add zhijian-resume@zhijian-local`。它使用当前用户现有 CLI 环境，不修改其它插件。
4. 在桌面宿主检查“智简简历”已启用；刷新连接或新建会话。必要时保存其它工作后重启宿主。
5. 输入：

```text
请用智简简历创建一份虚构的中文求职简历，并打开内嵌编辑器，让我修改内容、切换模板、调整行间距并导出分页 PDF。
```

成功标志是出现含“模板、行间距、导出分页 PDF”的界面，而不只是模型回复“已打开”。卡片可展开；在界面中修改姓名，等“已保存到此电脑”后再导出。点击“下载 PDF”，按宿主提示保存。

## 手动注册与排查

本地运行文件已安装但 CLI 注册失败时，安装器会以非零码退出。查看报错后可对安装目录重新执行注册命令；无须重建编辑器。

`unknown MCP server` 通常表示旧会话未加载新连接。先刷新连接／新建会话，不要重复点击编辑器中的保存按钮。

若只能找到网页端的远程连接器 URL 表单，该入口不适用此本地方案。不要为此启动 ngrok；可改用已支持本地 STDIO 与 MCP Apps 的桌面宿主。

`.zresume` 文件入口使用 OpenAI 扩展，属于附加能力；跨宿主通用入口是 `create_resume`。本项目不会把访问凭据放入面向模型的 structuredContent，但编辑内容仍经宿主协议处理。详见 [隐私说明](privacy.md)。
