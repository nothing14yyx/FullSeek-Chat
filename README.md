# FullSeek-Chat

English | [简体中文](README.zh-CN.md)

<p align="center"><img src="src/logo/fullseek-white.svg" width="220" alt="FullSeek-Chat logo"></p>

FullSeek-Chat is an open-source chat client based on [DeepSeek AI's chat-demo](https://github.com/deepseek-ai/chat-demo), adapted for Windows and Android. It is licensed under MIT; see [LICENSE](LICENSE) and the upstream project for attribution.

## Direct downloads

- [Windows x64 installer (.exe)](https://github.com/nothing14yyx/FullSeek-Chat/releases/download/v0.1.1/FullSeek-Chat-Setup-0.1.1.exe)
- [Android APK](https://github.com/nothing14yyx/FullSeek-Chat/releases/download/v0.1.1/FullSeek-Chat-Android-0.1.1-debug.apk)

The repository is private for now, so these links require GitHub access. They will be directly downloadable by everyone after the repository is made public.

## Privacy

The FullSeek-Chat application itself does not collect personal information. It has no FullSeek data-collection backend or analytics service. API keys and settings are stored in local app storage, and chat history is stored on the device.

When you use chat, file, or voice features, the app sends the necessary content directly to the API gateway you configured. FullSeek-Chat does not receive a separate copy. The gateway you choose processes those requests under its own privacy policy.

## Build

- On Windows, build an installer with `pnpm build:windows`.
- Build an Android debug APK with `pnpm build:android` (JDK 21 and Android SDK required).
- GitHub Actions can build both packages from the **Build FullSeek-Chat installers** workflow.

To run the development preview, install Node.js 22.12+ and pnpm:

```sh
git clone https://github.com/nothing14yyx/FullSeek-Chat.git
cd FullSeek-Chat
pnpm install
pnpm dev
```

Open http://localhost:8090.

## API gateways

DeepSeek is the default gateway. Add your API key in Settings, then select a protocol and gateway. The model field is empty by default; use **Get Models** or enter a model name.

- DeepSeek Responses base URL: `https://api.deepseek.com` (the app calls `/responses`, without a `/v1` prefix).
- DeepSeek Messages base URL: `https://api.deepseek.com/anthropic` (the app calls `/v1/messages`).
- Custom gateways can use either the Messages or Responses protocol. Include any required path prefix in the gateway URL.

## Features

- Multiple conversations, editing, regeneration, and message branches.
- Streaming replies, deep thinking, search, link reading, and citations.
- File attachments, voice input, and read-aloud.
- Markdown, code highlighting, KaTeX, and Mermaid diagrams.
- Simplified Chinese and English, light and dark themes, and chat history import/export.
- Windows and Android app packaging; no FullSeek server deployment is required.

## License

FullSeek-Chat is released under the [MIT License](LICENSE). Third-party dependencies are subject to their own licenses.
