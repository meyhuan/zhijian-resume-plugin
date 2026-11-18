# Contributing

本项目是独立仓库，不依赖原网站或 worktree。请先阅读 README 与 docs/privacy.md。

开发环境：Node.js 22+、Windows Chrome／Edge。运行 `npm ci`、`npm run build`、`npm run typecheck`、`npm test`。涉及界面或导出时运行 `npm run test:ui` 和 `npm run smoke`；安装／打包变更运行 `npm run test:install`。

测试只用虚构简历。不要提交 artifacts、node_modules、dist、release、.env、草稿或 .zresume。遵循现有 TypeScript 风格，保留保存鉴权、输入清理、版本冲突和打印分页行为；新增模板须验证编辑和 PDF 两端。

PR 说明用户可见变化、验证命令和已知限制。新增依赖后更新锁文件并运行 `npm run notices`，检查依赖授权文本与 third-party/README.md 中的补充来源。

项目代码采用 Apache-2.0，第三方代码保持原有声明。只提交你有权贡献的代码、图片和字体。项目没有要求向外部服务发送真实简历的测试步骤。
