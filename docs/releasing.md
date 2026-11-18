# 发布维护

## 准备

项目自有代码 Apache-2.0。发布前确认新增代码、字体、图片的来源，检查 THIRD_PARTY_NOTICES.md 与 third-party/README.md；依赖升级后重新核对补充授权文件。LICENSE 来源为 Apache 官方文本，NOTICE 保留项目与来源说明。

同步更新 package.json、package-lock.json 和 .codex-plugin/plugin.json 的版本，以及 server/index.ts、web/bridge.ts 中的协议客户端版本与 CHANGELOG.md。

在干净 checkout 上：

```powershell
npm ci
npm run build
npm run typecheck
npm test
npm run test:ui
npm run smoke
npm run test:install
npm run release:windows
```

发布包出现在 `release/zhijian-resume-<版本>-windows.zip`，旁边有 `.sha256`。脚本使用明确文件白名单，不包含 node_modules、测试草稿、.env、Git 历史或原网站代码目录。包内无需 npm 依赖，但需要本机 Node 和浏览器。发布脚本拒绝覆盖同名输出；重做未发布版本时先把旧输出移出 release 目录，再重新构建。

## 上传内容

### 豆包直接上传 ZIP

Windows 维护者运行 `npm run release:doubao`，再运行 `npm run test:doubao-package`。
输出 `release/zhijian-resume-<版本>-doubao-win-x64.zip` 及 SHA256，ZIP 根目录直接包含 `plugin.json`、`mcp.json`、`skills/`、`dist/`、`runtime/`，不套外层文件夹。

参考 DOCX Editor 的 agent-plugins 清单结构；上传版连接器标识为 `zhijian-resume-desktop`，避免与早期手动连接器 `zhijian-resume` 重名。实测当前豆包不会展开启动命令里的 `${PLUGIN_ROOT}`，因此采用 `scripts/doubao-launcher.ps1`：由系统 PowerShell 定位用户目录下豆包已安装插件中的本项目清单，再启动包内 `runtime/node.exe`，通过原始字节流转发 STDIO。不依赖用户 Node PATH 或 npm，不修改执行策略。只支持 Windows x64；本机 Edge / Chrome 用于 PDF。该适配依赖豆包当前安装目录布局，宿主更新后需重新验收。

打包脚本从 nodejs.org 下载固定 Node 22.23.5 官方 ZIP，校验代码中固定的 SHA256，提取 node.exe 和完整 LICENSE，并记录来源到 runtime/source.json。首次构建需要联网，缓存位于 artifacts/runtime-cache；最终用户无需下载运行时。升级 Node 时必须同步更新版本、官方校验值及测试预期。不要从本机随意复制未知来源的 Node。

包验证会解压到中文、空格路径，在不含 Node 的 PATH 下启动包内运行时，通过真实 MCP 保存并导出分页 PDF。最后还需通过豆包“上传插件”入口完成真实安装和 UI 验收。

由维护者创建实际 GitHub 仓库／Release 后上传 ZIP 与校验文件，并填写 Windows、Node、宿主版本和验证范围。本项目不会自动创建仓库、推送、打标签或发布。

公开源码建议使用当前审查后的文件建立初始公共仓库；本地研发 Git 历史含迁移期间的机器路径，不属于运行依赖，也不需要向外分发。`git archive --format=zip --output=<目标文件> HEAD` 可导出已提交的干净源码，不含历史和忽略目录。不要把整个工作目录直接压缩上传。

## 验收和升级

下载并解压最终 ZIP，运行安装器选择 Local；确认生成的路径在目标机器有效。在支持的宿主内用虚构简历完成修改、保存、模板、行距、多页预览、实际下载检查。ChatGPT 和豆包分开验证，不能以一个宿主成功替代另一个。

安装更新保留旧版本目录和草稿，防止运行中的编辑器失效。旧版本清理由用户在关闭宿主后通过资源管理器进行；发布脚本不删除用户数据。

启动脚本以 PowerShell `-Command` 传入，源码保留在 scripts/doubao-launcher.ps1。转发器为子进程 stdin 显式设置无 BOM 的 UTF-8，避免 Windows UTF-8 区域设置下 .NET Framework 自动写入 BOM 导致 JSON 握手超时；输入输出逐段刷新。便携包测试同时检查原始清单命令与模拟 UTF-8 宿主。
