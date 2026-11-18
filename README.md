# FullSeek-Chat

简体中文 | [English](README.en.md)

<p align="center"><img src="src/logo/fullseek-white.svg" width="220" alt="FullSeek-Chat 标志"></p>

FullSeek-Chat 是基于 [DeepSeek AI 的 chat-demo](https://github.com/deepseek-ai/chat-demo) 构建并适配 Windows、Android 的开源聊天客户端，采用 MIT 许可证。详见 [LICENSE](LICENSE) 和上游项目说明。

## 下载与安装

请前往 [GitHub Releases 下载页面](https://github.com/nothing14yyx/FullSeek-Chat/releases/latest)，在最新版本的 **Assets** 中选择安装包：

- **Windows x64**：下载 `.exe` 安装包并按提示完成安装。
- **Android**：下载 `.apk` 文件，在手机上打开并完成安装。

## 隐私说明

FullSeek-Chat 应用本身不收集用户数据。API Key、设置和会话记录保存在设备本地。使用聊天、文件或语音功能时，必要内容会直接发送到你配置的 API 网关；FullSeek-Chat 不会另外接收一份副本。

## API 网关

默认网关为 DeepSeek。在设置中填写 API Key，选择协议和网关。模型名称默认留空，可点击「获取模型」选择，或手动填写。

- DeepSeek Responses 网关地址：`https://api.deepseek.com`，应用请求 `/responses`，不带 `/v1` 前缀。
- DeepSeek Messages 网关地址：`https://api.deepseek.com/anthropic`，应用请求 `/v1/messages`。
- 自定义网关可选择 Messages 或 Responses 协议；如果网关需要路径前缀，请将前缀写在网关地址中。

## 功能

- 多会话、编辑提问、重新生成和消息分支。
- 流式回答、深度思考、搜索、链接阅读与来源引用。
- 文件附件、语音输入和回复朗读。
- Markdown、代码高亮、KaTeX 公式和 Mermaid 图表。
- 简体中文与英文、浅色与深色主题、历史导入导出。
- 支持 Windows 和 Android 安装包，无需部署 FullSeek 自有服务器。

## 构建与预览

- Windows 上运行 `pnpm build:windows` 构建安装程序。
- 运行 `pnpm build:android` 构建 Android debug APK（需要 JDK 21 和 Android SDK）。
- 也可以在 GitHub Actions 中运行 **Build FullSeek-Chat installers** 工作流构建两种安装包。

本地预览需要 Node.js 22.12+ 和 pnpm：

```sh
git clone https://github.com/nothing14yyx/FullSeek-Chat.git
cd FullSeek-Chat
pnpm install
pnpm dev
```

然后打开 http://localhost:8090。

## 问题与支持

如有任何问题，欢迎在抖音或小红书搜索“卷福AI分享记录”。感谢大家的支持！

## 许可证

FullSeek-Chat 使用 [MIT 许可证](LICENSE)。第三方依赖遵循各自的许可证。
