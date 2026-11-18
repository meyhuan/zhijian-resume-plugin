# 验证记录

## 0.4.0 首个公开版本验收（2026-11-18）

| 检查 | 结果 |
|---|---|
| build / typecheck / npm test | 通过，5 项协议与存储测试 |
| test:ui | 通过，模拟宿主真实 STDIO：编辑、双模板、行距、自动保存、PDF 预览与下载 RPC |
| smoke | 通过，1 页与 3 页 A4；中文及全部 100 条分页标记保留 |
| test:install | 通过，Windows PowerShell 5.1、中文空格路径、草稿保留、CLI 参数替身 |
| test:doubao-package | 通过，PATH 无系统 Node；包内 Node 22.23.5；编辑保存；3 页 A4、80/80 标记 |
| 豆包 0.4.0 实机重装与首次提示 | 通过；直接上传 0.4.0 UI 验收候选 ZIP，中文说明与编辑器品牌显示；一句话提示创建完整虚构简历（模型首次参数解析失败后自行重试成功） |
| 豆包 0.4.0 实机编辑与下载 | 通过；姓名修改、simple→elegant、行距 1.5→1.8、revision 4；实际下载 2 页 A4，修改姓名和全部 6 个模块保留，无空页 |
| npm audit --omit=dev | 0 漏洞；完整开发审计的未修复问题见 SECURITY.md |
| 授权与公开文件检查 | Apache-2.0、NOTICE、第三方许可及内置 Node LICENSE；公开源码采用干净初始提交 |

图标来自项目所有者网站；只改独立插件。公开截图使用虚构资料并收起私人会话侧栏。
最终便携启动器另修复了 Windows UTF-8/BOM 握手问题：先在本机强制 UTF-8 复现超时，再验证修复后连接及 PDF 通过。最终包保留原有启动命令格式，编辑器与 PDF 代码未变化；该启动器以包级回归验证，未再次通过豆包 UI 上传。

补充：验收后的豆包全屏快捷键跳转出现宿主空白路由；草稿与下载文件已核验，未强制重启宿主。见排错说明。
本次未重新安装 ChatGPT；之前的真实宿主功能记录保留在下方，不能视为所有 ChatGPT 账号/版本均支持。

## 豆包直接上传 ZIP 验收（2026-11-18）

最终包：`zhijian-resume-0.3.0-doubao-win-x64.zip`，35,535,508 字节，SHA256 `8f13dad521baee392543830060e938e8159ae83d0ee46cd8a5250adf4a37f2e6`。

| 验证 | 结果 |
|---|---|
| `npm run package:doubao` | 通过；官方 Node 22.23.5 Windows x64 校验及许可证、根目录清单、白名单打包 |
| `npm run test:doubao-package` | 通过；中文空格解压路径，PATH 无 Node/npm，真实 PowerShell 启动适配、MCP 资源、编辑保存、3 页 A4、80/80 段落 |
| `npm run typecheck` / `npm test` | 通过；类型检查及 5 项协议／存储测试 |
| `git diff --check` | 通过 |
| 豆包“添加 → 上传插件 → 选择 ZIP” | 通过；无解压、Node 安装或手动命令路径配置；连接器 READY，5 个工具 |
| 实际内嵌编辑 | 通过；虚构姓名改为“ZIP编辑已验证（虚构）”，simple→elegant，行距 1.5→2.0，自动保存 revision 4 |
| 实际 PDF 预览、下载和文件核验 | 通过；5 页 A4、60/60 编号段落、中文修改保留、无空页 |

本机实际进程路径指向豆包插件目录内 `runtime/node.exe`，没有使用全局 Node。旧手动连接器 `zhijian-resume` 已停用且保留配置，新上传连接器为 `zhijian-resume-desktop`。原 DOCX Editor 插件和网站均未修改。

安装过程发现并解决：旧连接器同名导致拒绝上传；客户端首次包下载失败，刷新重试成功；下载完成后仍不展开 `${PLUGIN_ROOT}`，新增 Windows 自动定位和字节流启动适配后重新上传，最终安装与 UI 全部通过。安装通过豆包自身云端上传／下载，运行无需我们的公网服务或 ngrok。

本地验收材料（不进入发布 ZIP）：`artifacts/doubao-zip-smoke.json`、`artifacts/doubao-zip-editor.png`、`artifacts/doubao-zip-pdf.png`、`artifacts/doubao-zip-export.pdf`、`artifacts/doubao-zip-result.json`。实际下载文件为本机下载目录中的 `resume (5).pdf`。

范围：当前 Windows x64 豆包客户端；未验证 ARM64、其它豆包版本／安装目录布局、企业限制 PowerShell 的环境。未重测 ChatGPT，因为该上传包为豆包专用，原 ChatGPT 打包配置未改动。CI 已更新，未声称远端 CI 已运行。

## 真实宿主验收（2026-11-18）

使用虚构简历；无 HTTP 服务、公开域名或隧道。

| 宿主 | 覆盖 | 结果 |
|---|---|---|
| ChatGPT 桌面 | 创建、姓名修改、simple→elegant、行距 1.5→2.0、自动保存、预览和下载 | 通过；3 页 A4，65/65 标记齐全、无空页 |
| 豆包 Windows | 自定义 STDIO、对话内卡片、侧栏／全屏、姓名修改、模板、行距、自动保存、预览和下载 | 通过；草稿 revision 4，5 页 A4，65/65 标记齐全、无空页 |

豆包首轮保存被 structured context 深度限制拦截，改用 documentJson 后实际复测通过；保留旧对象输入。模型曾因工作区标签列表为空错误声称未显示界面，实际 UI 和文件验证证明界面已加载。

真实宿主验收未覆盖所有正文格式按钮、头像、撤销重做及 .zresume 重开入口。上述界面验收针对 0.2.0 基础实现与随后合入 0.3.0 的豆包保存修复；宿主升级可能改变兼容性。

## 0.3.0 开源安装包验收

维护者发布前运行：

| 命令 | 覆盖 |
|---|---|
| `npm run build` | 单文件 HTML、Node bundle、依赖授权声明 |
| `npm run typecheck` | TypeScript |
| `npm test` | MCP 发现、UI 资源、鉴权、保存新旧格式、非法输入、冲突与磁盘重开 |
| `npm run test:ui` | 模拟宿主 + 真实 STDIO：编辑、模板、行距、保存、预览和下载 RPC |
| `npm run smoke` | 1 页与长内容 3 页 A4、中文和内容完整性 |
| `npm run test:install` | Windows PowerShell 5.1、中文空格路径、独立安装、配置解析、安装后 STDIO、重复安装保留草稿、ChatGPT 注册参数 |

自动 UI 宿主不等同真实 ChatGPT／豆包验收；安装注册测试使用隔离 CLI 替身，不覆盖用户当前插件配置。输出在忽略的 artifacts 目录，真实简历与机器用户名不进入发布包。

2026-11-18 在 Windows 上运行以上六组命令：全部通过（协议／存储单元测试 5 项；UI 编辑、保存、下载 RPC 通过；PDF smoke 为 1 页和 3 页）。安装测试使用 Windows PowerShell 5.1 和独立目录，验证真实安装后的 STDIO 子进程；ChatGPT CLI 注册使用替身验证调用参数与失败退出，不代表新机器账号已完成登录。CI 工作流已配置，未声称云端 CI 已运行。
