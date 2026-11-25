# Changelog

本文件记录各版本的依赖变更、打包方式调整与验证结果。

## 2026-11-25 — 依赖更新与打包工具迁移

### 变更

| 包 / 工具 | 变更前 | 变更后 | 说明 |
| --- | --- | --- | --- |
| pkg | 5.8.1（停止维护，最高 node18） | `@yao-pkg/pkg` 6.26.0 | 社区维护分支，目标 `node24-win-x64` |
| nexe | 5.0.0-beta.4 | 已移除 | 仓库内无任何引用 |
| readline | 1.3.0 | 已移除 | Node 内置模块，npm 包为冗余依赖 |
| highlight.js | 11.11.1 | 已移除 | 源码未引用（高亮由 `src/tools.js` 自实现） |
| ws | 8.18.0 | 已移除 | 源码未引用 |
| simple-git | 3.36.0 | 4.1.0 | 主版本升级，`require` 用法不变 |
| jimp | 0.22.12 | 1.7.0 | 构建脚本改用 `Jimp.read` + `resize({ w, h })` + `await image.write()` |
| png-to-ico | 3.0.1 | 3.0.2 | 补丁升级 |
| rcedit | 5.0.1（已废弃） | 已移除，改用 `resedit` 3.1.1 | 图标注入改为纯 JS，不再调用外部 exe |

### 代码与配置改动

- `build-exe.js`
  - 打包命令改为 `npx @yao-pkg/pkg . --target node24-win-x64`；
    字节码预编译失败时自动退回 `--no-bytecode` 重试（受限执行环境下不会直接中断）。
  - jimp 换成 1.x 的新 API。
  - 图标注入由 `rcedit` 改为 `resedit`：解析 PE → 读取现有 icon group → 替换 → 回写，失败不影响其他构建步骤。
- `package.json`
  - 新增脚本 `npm run build:exe`。
  - `pkg.targets` 更新为 `node24-win-x64`。
  - `engines.node` 调整为 `>=22.0.0`：`diff@9` 为 ESM 包，本项目为 CommonJS，
    依赖 Node 22+ 的 `require(esm)` 才能加载。
- `README.md`
  - 补充「打包成单个 exe」说明，修正克隆地址中的占位符。

### 兼容性说明

- 运行时依赖只保留 `chalk@4`（CJS）、`diff@9`（ESM）、`simple-git@4`。
  chalk 停留在 4.x 是有意为之：chalk 5 及以后为纯 ESM，本项目为 CJS，升级需要整体改造模块系统。
- `diff@9` 为纯 ESM。若将来把工程迁移到 ESM，这一限制自然解除；
  若需在 Node 22 以下运行，可回退到 `diff@5.2.0`（API 兼容，已含 ReDoS 修复）。

### 验证记录

- `node bin/yingzi-kwh.js --version` / `--help`：正常。
- 各模块加载（`src/tools.js`、`src/agent.js`、`src/server.js`）：正常。
- Web 服务实测：`/cover.html` 200、`/terminal.html` 200、目录穿越请求被拦截（404）。
- exe 打包实测：`@yao-pkg/pkg` 构建成功（约 93MB），图标注入步骤单独验证成功。

### 已知限制

- 生成的 exe 在受执行策略限制的环境（禁止运行新下载的未签名二进制）中无法启动，
  需在常规桌面环境双击验证；这属于运行环境限制，与构建产物无关。

### 回滚

回滚到上一提交即可恢复到 pkg + jimp 0.22 + rcedit 的组合。
