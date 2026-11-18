# Windows 安装、升级和卸载

豆包用户优先使用 **`*-doubao-win-x64.zip` 直接上传**，已内置便携 Node，无需以下安装器与手动配置。参见 [豆包 ZIP 安装](doubao.md)。本文其余部分介绍 ChatGPT／开发调试使用的备用 `*-windows.zip` 安装器。

## 安装条件

- Windows 10/11；Node.js 22.13 或更高版本，命令行中 `node --version` 可用。
- 本机 Chrome 或 Edge，用于无头 PDF 渲染；不额外下载 Chromium。
- 支持 STDIO MCP **及 MCP Apps** 的桌面宿主。仅支持 MCP 工具的客户端可能无法显示编辑器。
- ChatGPT 路径还需要具备本地插件功能的桌面环境和支持 `codex plugin` 的 CLI；豆包路径不需要 Codex。

Node.js 可从 [官方站点](https://nodejs.org/) 安装。安装后重新打开终端。脚本不自动安装系统依赖、不要求管理员权限、不修改防火墙或系统执行策略。

## 一键安装

下载维护者发布的 `zhijian-resume-<版本>-windows.zip`，核对 SHA256，**完整解压**，双击 `install.cmd`：

1. 选择 `1`：安装本地运行文件并生成豆包接入参数。
2. 选择 `2`：安装本地文件并通过 Codex CLI 注册 ChatGPT 桌面插件。
3. 选择 `3`：安装两者。豆包仍需在 UI 中填入一次连接器参数。

脚本支持 Windows PowerShell 5.1。安装目录默认为 `%LOCALAPPDATA%\Programs\ZhijianResume`，无需手动修改源码路径。含中文、空格的目录可用。安装完成后可移动或删除下载的解压目录；不要移动已安装的 versions 子目录。

从源码安装：下载仓库 ZIP 或 clone，运行同一个 `install.cmd`。源码模式执行 `npm ci`、构建和许可证生成，首次需要联网下载依赖。发布包已含构建结果，运行不需要 node_modules 或 npm 安装依赖。

若 Windows 标记下载文件或企业执行策略阻止脚本，先检查下载来源及脚本内容，通过文件属性的“解除锁定”处理可信下载文件；组织策略限制请联系管理员。安装器不会自动绕过安全策略。

## 命令行用法

在项目或解压目录运行：

```powershell
powershell.exe -NoProfile -File scripts/install.ps1 -CheckOnly
powershell.exe -NoProfile -File scripts/install.ps1 -Target Local
powershell.exe -NoProfile -File scripts/install.ps1 -Target ChatGPT
powershell.exe -NoProfile -File scripts/install.ps1 -Target Both -InstallRoot "$env:LOCALAPPDATA\Programs\ZhijianResume"
```

`-SkipBuild` 仅供已完成构建的开发者；普通源码安装不要使用。

安装目录输出：

| 文件 | 用途 |
|---|---|
| `versions/<版本>-<随机标识>/` | 独立运行文件及授权文本，每次安装新目录 |
| `doubao-setup.txt` | 可直接复制到豆包的命令、参数、CHROME_PATH |
| `mcp-config.json` | 通用 MCP 配置示例，绝对路径已生成 |
| `installation.json` | 当前版本、运行目录和安装时间 |
| `.agents/plugins/marketplace.json` | ChatGPT 本地 marketplace 声明 |

## 更新

先完成当前草稿保存。运行新版本安装器；豆包按新的 `doubao-setup.txt` 更新参数并重新启用连接器，ChatGPT 重新注册并刷新连接或新建会话。新版本不会覆盖运行中的旧版本目录，也不会删除草稿。旧卡片可能缓存旧 UI，验收时创建新卡片。

## 卸载与数据保留

先在宿主里关闭编辑器、禁用／移除连接器。ChatGPT CLI 可运行：

```powershell
codex plugin remove zhijian-resume@zhijian-local
codex plugin marketplace remove zhijian-local
```

然后用资源管理器把安装目录移到回收站即可。安装器不提供自动递归删除命令。

草稿另存于 `%LOCALAPPDATA%\ZhijianResume\drafts`，卸载程序不会自动删除。需要迁移或备份时保留整个草稿目录；`.zresume` 仅含本机草稿入口及访问凭据，不是完整简历文件。不要公开分享草稿 JSON 或 .zresume。
