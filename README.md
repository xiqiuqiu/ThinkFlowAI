# OmniMind

[English](#english) | [中文](#chinese)

<a name="english"></a>

## 🇬🇧 English

**OmniMind** is a visual idea expansion and inspiration tool powered by LLM (Large Language Models). It allows users to create mind maps, expand ideas using AI, and manage knowledge in a local-first environment with optional cloud synchronization.

### ✨ Features

- **Visual Mind Mapping**: Intuitive canvas for creating and organizing ideas using nodes and edges.
- **AI-Powered Expansion**: Leverage AI to generate new ideas, sub-topics, and connections based on your current context.
- **Local-First Architecture**: Your data resides on your device by default, ensuring privacy and speed.
- **Cloud Sync (Optional)**: Seamlessly sync your data with Supabase for multi-device access.
- **Modern UI/UX**: Built with a premium, responsive design using Tailwind CSS and rich animations.
- **I18n Support**: Fully localized interface.

### 🛠️ Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Diagramming**: [Vue Flow](https://vueflow.dev/)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/)

### 🚀 Getting Started

#### Prerequisites

- Node.js (v18+ recommended)
- npm or pnpm

#### Installation

```bash
# Clone the repository
git clone https://github.com/xiqiuqiu/OmniMind.git

# Enter the directory
cd OmniMind

# Install dependencies
npm install
```

#### Development

Start the local development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

#### Build

Build the project for production:

```bash
npm run build
```

### ⚙️ Configuration

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

**Key Environment Variables:**

- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous API key.
- `VITE_OPENAI_API_KEY`: (Optional) For AI features if not configured via UI.

### 📦 Deployment

This project is configured for deployment on **Cloudflare Pages**.

```bash
npm run deploy
```

---

<a name="chinese"></a>

## 🇨🇳 中文

**OmniMind** 是一款由大语言模型（LLM）驱动的视觉化创意扩展与灵感工具。它允许用户创建思维导图，利用 AI 扩展想法，并在本地优先的环境可以管理知识，同时支持的云端同步。

### ✨ 功能特性

- **可视化思维导图**：直观的画布，使用节点和连线轻松创建和组织想法。
- **AI 驱动创意扩展**：利用 AI 根据当前上下文生成新观点、子主题和关联。
- **本地优先架构**：默认情况下数据存储在本地设备上，确保隐私和速度。
- **云端同步**：支持与 Supabase 无缝同步，实现多设备访问。
- **现代 UI/UX**：使用 Tailwind CSS 构建的高级响应式设计，包含丰富的交互动画。
- **多语言支持**：完全本地化的用户界面。

### 🛠️ 技术栈

- **框架**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **图表库**: [Vue Flow](https://vueflow.dev/)
- **后端/认证**: [Supabase](https://supabase.com/)
- **部署**: [Cloudflare Pages](https://pages.cloudflare.com/)

### 🚀 快速开始

#### 前置要求

- Node.js (建议 v18+)
- npm 或 pnpm

#### 安装

```bash
# 克隆仓库
git clone https://github.com/xiqiuqiu/OmniMind.git

# 进入目录
cd OmniMind

# 安装依赖
npm install
```

#### 开发

启动本地开发服务器：

```bash
npm run dev
```

应用将在 `http://localhost:5173` 访问。

#### 构建

构建生产版本：

```bash
npm run build
```

### ⚙️ 配置

复制示例环境变量文件并配置您的凭据：

```bash
cp .env.example .env
```

**主要环境变量：**

- `VITE_SUPABASE_URL`: 您的 Supabase 项目 URL。
- `VITE_SUPABASE_ANON_KEY`: 您的 Supabase 匿名 API Key。
- `VITE_OPENAI_API_KEY`: (可选) 用于 AI 功能（也可在 UI 中配置）。

### 📦 部署

本项目已配置为通过 **Cloudflare Pages** 进行部署。

```bash
npm run deploy
```

## ❤️ 致谢

本项目基于 [ThinkFlowAI](https://github.com/ThinkFlowAI/ThinkFlowAI) 开发。

感谢原作者 [lz-t](https://github.com/lz-t) 的开源贡献。

---

<p align="center">
  如果这个项目对你有帮助，请给一个 ⭐️ 支持一下！
</p>
