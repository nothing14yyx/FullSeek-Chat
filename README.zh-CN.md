# FullSeek-Chat

[English](README.md) | 简体中文

FullSeek-Chat 是基于 [DeepSeek AI 的 chat-demo](https://github.com/deepseek-ai/chat-demo) 构建并适配 Windows、Android 的开源聊天客户端，采用 MIT 许可证。详见 [LICENSE](LICENSE) 和上游项目说明。

## 隐私说明

FullSeek-Chat 应用本身不收集个人信息，不设置 FullSeek 数据收集后台，也不包含行为分析服务。API Key 和设置保存在应用本地，会话记录保存在设备上。

使用聊天、文件或语音功能时，应用会将相应内容直接发送到你配置的 API 网关。FullSeek-Chat 不会另外接收一份副本；所选网关会按照其自身的隐私政策处理请求。

## 安装与构建

- Windows 安装包和 Android APK 可从 [Releases](https://github.com/nothing14yyx/FullSeek-Chat/releases) 下载（发布后可用）。
- 在 Windows 上运行 `pnpm build:windows` 构建安装程序。
- 运行 `pnpm build:android` 构建 Android debug APK（需要 JDK 21 和 Android SDK）。
- 也可以在 GitHub Actions 中手动运行 **Build FullSeek-Chat installers** 工作流构建两种安装包。

本地预览需要 Node.js 22.12+ 和 pnpm：

```sh
git clone https://github.com/nothing14yyx/FullSeek-Chat.git
cd FullSeek-Chat
pnpm install
pnpm dev
```

然后打开 http://localhost:8090。

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

## 许可证

FullSeek-Chat 使用 [MIT 许可证](LICENSE)。第三方依赖遵循各自的许可证。
