# 影子kwh (Yingzi KWH)

> An open-source AI coding agent inspired by Claude Code, featuring a web terminal, code diff display, Git integration, syntax highlighting, and autonomous planning.

[中文](#简介) | [English](#introduction)

---

## 简介

**影子kwh** 是一个受 Claude Code 启发的开源 CLI AI 编程智能体。它能够在您的项目目录中直接运行，通过终端或 Web 界面帮助您编写、分析和修改代码。

### 核心特性

- **Web 终端界面** - 基于浏览器的终端，无需安装额外软件
- **代码 Diff 显示** - 修改文件前自动显示变更对比
- **Git 集成** - 直接在对话中查看仓库状态、diff、提交历史、切换分支
- **语法高亮** - 支持 JS/TS/Python/Java/Go/Rust/C/Shell/HTML/CSS
- **自主规划** - 检测到复杂任务时自动生成执行计划
- **代码索引** - 构建项目文件索引，支持基于关键词的代码搜索

### 技术栈

| 库 | 用途 | Stars |
|----|------|-------|
| [chalk](https://github.com/chalk/chalk) | 终端颜色输出 | 20k+ |
| [diff](https://github.com/kpdecker/jsdiff) | 代码差异计算 | 14k+ |
| [simple-git](https://github.com/steveukx/git-js) | Git 操作 | 8k+ |
| [highlight.js](https://github.com/highlightjs/highlight.js) | 语法高亮 | 20k+ |

---

## Introduction

**Yingzi KWH** is an open-source AI coding agent inspired by Claude Code. It runs directly in your project directory, helping you write, analyze, and modify code through a terminal or web interface.

### Key Features

- **Web Terminal** - Browser-based terminal, no extra software needed
- **Code Diff Display** - Auto preview changes before modifying files
- **Git Integration** - Check status, diff, log, branch, and commit within chat
- **Syntax Highlighting** - JS/TS/Python/Java/Go/Rust/C/Shell/HTML/CSS
- **Autonomous Planning** - Auto-generate execution plans for complex tasks
- **Code Indexing** - Build project index for keyword-based code search

---

## 快速开始 / Quick Start

```bash
# 克隆仓库
 git clone https://github.com/yingzikwh/yingzi-kwh.git
 cd yingzi-kwh

# 安装依赖（需要 Node.js 22 及以上）
 npm install

# 首次配置（设置 API Key）
 npm start -- --setup

# 启动 Web 界面（默认）
 npm start

# 或启动 CLI 模式
 npm start -- --cli
```

---

## 安装 / Installation

```bash
npm install -g
yingzi-kwh --setup
```

---

## 打包成单个 exe / Build exe

```bash
npm install
npm run build:exe
```

产物为 `dist/影子kwh.exe`（Node 24 基线，内含 public 与 assets 资源）。

- 打包使用 `@yao-pkg/pkg`，目标平台写在 `package.json` 的 `pkg.targets`（默认 `node24-win-x64`）。
- 若运行环境不允许执行下载的 Node 基线二进制（字节码预编译失败），脚本会自动退回
  `--no-bytecode` 模式重试，功能一致、启动略慢。
- 图标注入由 `resedit` 完成，纯 JS 实现，不依赖外部 exe。
- 脚本最后会把 exe 复制到桌面；不需要时可自行删除该步骤。

---

## 使用方式 / Usage

```bash
yingzi-kwh              # 启动 Web 界面
yingzi-kwh --cli        # 启动 CLI 终端模式
yingzi-kwh --setup      # 重新配置 API Key
yingzi-kwh --port 8080  # 指定端口
```

### 支持的 AI 提供商 / Supported Providers

| 提供商 | 推荐度 | 说明 |
|--------|--------|------|
| **DeepSeek** | ⭐⭐⭐ | 国内访问快，性价比高 |
| **Qwen (千问)** | ⭐⭐⭐ | 阿里巴巴，中文能力强 |
| **OpenAI** | ⭐⭐ | 需要国际网络 |
| **Custom** | ⭐⭐ | 自定义 API 端点 |

---

## 交互命令 / Interactive Commands

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助 |
| `/clear` | 清空对话历史 |
| `/pwd` | 显示当前目录 |
| `/index` | 构建项目代码索引 |
| `/search <关键词>` | 搜索已索引的代码 |
| `/stats` | 显示智能体统计信息 |
| `/plan` | 开关自动规划模式 |
| `/exit` | 退出 |

---

## 可用工具 / Available Tools

- **read_file** - 读取文件内容（带语法高亮预览）
- **write_file** - 写入/创建文件（覆盖前显示 Diff）
- **list_dir** - 列出目录内容
- **run_command** - 执行终端命令
- **search_files** - 搜索文件
- **git_status** - 查看仓库状态
- **git_diff** - 查看 staged/unstaged 变更
- **git_log** - 查看提交历史
- **git_branch** - 列出/创建/切换分支
- **git_commit** - 暂存并提交更改

---

## 项目结构 / Project Structure

```
yingzi-kwh/
├── bin/yingzi-kwh.js      CLI 入口
├── src/
│   ├── launcher.js        启动器（Web/CLI 双模式）
│   ├── server.js          HTTP 服务器
│   ├── index.js           CLI 终端模式
│   ├── agent.js           AI 智能体核心
│   ├── api.js             LLM API 调用
│   ├── tools.js           工具集（diff/git/高亮）
│   └── config.js          配置管理
├── public/
│   ├── cover.html         启动封面
│   └── terminal.html      Web 终端
├── assets/
│   └── cover.jpg          封面图片
├── package.json
├── LICENSE
└── README.md
```

---

## 灵感来源 / Inspiration

- [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) - Anthropic's CLI AI assistant
- [OpenCode](https://github.com/opencode-ai/opencode) - 13k+ Stars open-source alternative (MIT, Go)
- [Goose](https://github.com/block/goose) - Linux Foundation Rust AI Agent

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

> Made with ❤️ by 影子kwh Team
