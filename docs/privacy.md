# 数据与权限

- 插件不监听网络端口、不上传到原网站、不使用网站登录／支付／数据库或云 AI API。
- Windows 草稿默认存于 `%LOCALAPPDATA%\ZhijianResume\drafts`。macOS 默认存于 `~/Library/Application Support/ZhijianResume/drafts`，已使用 `~/ZhijianResume/drafts` 的用户继续使用原目录。草稿明文保存，请勿同步到公开仓库。
- 每份草稿使用随机访问凭据。`.zresume` 和草稿 JSON 包含凭据；不要粘贴到公开 Issue。凭据不是抵御同用户恶意进程的隔离边界。
- 用户提供给模型的内容受宿主平台隐私政策约束；MCP 参数、UI 与工具结果也由宿主处理。本地存储不代表内容从未进入模型平台。
- PDF 使用本机 Chrome／Edge 无头渲染，渲染阶段阻断 HTTP 等网络请求；字体使用系统字体。下载结果由宿主选择保存位置。
- 首次源码安装需要从 npm 下载依赖；Node、宿主及浏览器的联网行为由相应软件决定。
- 更新和卸载不自动删除草稿。插件不带分析上报、自动更新或远程内容服务。
- PDF 返回体上限为 6 MB；超限时缩小图片或精简内容。多人共享机器请使用独立系统账号。
