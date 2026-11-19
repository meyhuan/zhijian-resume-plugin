# macOS 接入

macOS 包面向支持本地 STDIO MCP 和 MCP Apps 的 ChatGPT／Codex 桌面环境。Apple Silicon 和 Intel 使用同一份 ZIP。请安装对应架构的 Node.js 22.13+。导出 PDF 需要 Chrome 或 Edge，浏览器可放在 `/Applications` 或 `~/Applications`。

## 在 ChatGPT／Codex 中安装

1. 从发布页下载带 `-macos.zip` 后缀的安装包并解压。在发布页提供该文件前，可以从本仓库源码构建。

   ```sh
   npm ci
   npm run release:macos
   ```

2. 在终端进入**解压后的安装包目录**。从源码构建时，进入 `release/` 下以 `-macos` 结尾的目录。确保 `codex plugin --help` 可用，执行：

   ```sh
   codex plugin marketplace add "$PWD"
   codex plugin add zhijian-resume@zhijian-local
   ```

3. 重新打开桌面客户端。在本机运行的新会话中，请智简简历创建一份虚构简历并打开编辑器。修改姓名，切换模板并调整行距，等待自动保存，然后导出并下载 PDF。

安装包会从桌面宿主提供的 Node 路径、`PATH`、Homebrew 或官方安装器的常用路径寻找可用的 Node。请保留已注册的安装包目录。切换到新安装包时，先运行 `codex plugin marketplace remove zhijian-local`，再从新目录重新注册和安装。

## 手动 STDIO 接入

如果客户端提供自定义 STDIO 连接器，并支持 MCP Apps 和文件下载，可以用以下参数尝试接入。豆包 macOS 的连接器和上传插件流程仍需在真实客户端验证。

| 字段 | 值 |
|---|---|
| 名称 | `zhijian-resume` |
| 命令 | 通过 `node -p 'process.execPath'` 查询 Node 的绝对路径 |
| 参数 | 安装包中 `plugin/dist/cli.cjs` 的绝对路径，作为单独一项 |
| 环境变量 | Chrome／Edge 安装在非默认位置时设置 `CHROME_PATH`，指向浏览器可执行文件 |

草稿默认在 `~/Library/Application Support/ZhijianResume/drafts`。若之前手动运行过插件并已有 `~/ZhijianResume/drafts`，插件会继续使用已有目录。
