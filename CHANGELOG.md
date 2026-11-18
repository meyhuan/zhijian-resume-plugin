# 更新记录

## 0.4.0 — 2026-11-18

- 首个公开开源版本，Apache-2.0 授权。
- 修复 Windows UTF-8 区域设置下启动转发器插入 BOM 导致握手超时，加入便携包回归检查。
- 升级 PDF.js、Puppeteer 与 Zod，运行依赖审计零漏洞；备用安装器要求 Node 22.13+。
- 统一智简简历名称、品牌图标、中文说明与首次使用提示。
- 豆包 Windows x64 ZIP 内置 Node，无需手动配置路径。
- 保留本地编辑、双模板、行距调整和 A4 分页 PDF 导出。

# Changelog

## 0.3.0

- 豆包直接上传 ZIP：内置校验过的官方 Node 22.23.5 Windows x64 运行时和许可证，无需另装 Node 或填写路径。
- Windows 启动适配自动定位豆包插件目录，绕开当前宿主未展开 PLUGIN_ROOT 的问题；原始字节 STDIO 转发保持中文和 PDF 数据完整。
- 上传版独立连接器名称、无系统 Node 的解压包回归测试和 CI 打包。

- 独立 Windows 安装器：源码／预构建包、路径自动生成、版本隔离、依赖预检、错误退出码。
- ChatGPT 注册与豆包本地接入说明分离，豆包用户不依赖 Codex CLI。
- 豆包保存参数采用 documentJson，兼容旧对象格式并保持完整校验。
- 增加用户级 Chrome／Edge 路径探测。
- Apache-2.0、NOTICE、第三方依赖授权文本与可分发 ZIP／SHA256。
- Windows 安装回归、CI、隐私和贡献文档。

## 0.2.0

- 独立 STDIO MCP Apps 编辑器，两套模板、行距、本机草稿和分页 PDF。
- 完成 ChatGPT 桌面实际编辑、保存、3 页 PDF 下载验收。
