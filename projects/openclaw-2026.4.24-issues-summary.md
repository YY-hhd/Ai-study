# OpenClaw 2026.4.24 版本问题总结与应对策略

> 整理时间：2026-04-27  
> 当前系统版本：2026.4.22（**未升级到 2026.4.24**）  
> 最新版本：2026.4.25（pre-release，4/26 发布）

---

## 🔴 严重问题（影响系统可用性）

### 1. Agent Harness "claude-cli" 未注册 — 网关完全不可用

| 项目 | 详情 |
|:---|:---|
| **Issue** | [#72434](https://github.com/openclaw/openclaw/issues/72434) |
| **严重度** | 🔴 致命 — 所有网关请求失败 |
| **影响范围** | 从 2026.4.23 升级到 2026.4.24 的用户 |
| **触发条件** | 配置中 `agents.defaults.embeddedHarness.runtime` 为 `"claude-cli"` |

**问题描述**：
- 升级后，`claude-cli` 被重命名/迁移，但**没有配置迁移脚本**
- 所有网关请求报错：`"Requested agent harness 'claude-cli' is not registered and PI fallback is disabled"`
- 所有 Claude 模型回退和压缩功能完全失效
- 工具完全不可用

**修复状态**：已在 `main` 分支修复，包含在 2026.4.25 中

**应对策略**：
```json
// 临时修复：修改 openclaw.json
{
  "agents": {
    "defaults": {
      "embeddedHarness": {
        "runtime": "auto"  // 改为 auto，让网关自动选择
      }
    }
  }
}
```

**注意事项**：
- 改回 `auto` 会停止报错，但**不会恢复 claude-cli 功能**
- 回滚到 2026.4.23 会重新引入消息消失 bug（#69406）

---

### 2. 级联 ENOTEMPTY 错误 — 网关启动失败

| 项目 | 详情 |
|:---|:---|
| **Issue** | [#72270](https://github.com/openclaw/openclaw/issues/72270) |
| **严重度** | 🔴 致命 — 0 个插件加载，机器人完全不可用 |
| **影响范围** | 使用共享 `~/node_modules/` 的用户 |
| **触发条件** | 网关启动时 npm 尝试重命名已有目录 |

**问题描述**：
- 网关启动时，无法加载大多数内置频道（slack、telegram、nextcloud-talk 等）
- 级联 `ENOTEMPTY` 错误（errno -39）
- Telegram 插件在注册阶段也失败
- 网关报告加载 0 个插件而非预期的 1 个

**根因**：
- npm 原子重命名机制在共享 `~/node_modules` 中失败
- 2026.4.24 尝试安装/更新内置依赖时，与已有目录冲突

**修复状态**：已在 `main` 分支修复（PR #67099），包含在 2026.4.25 中

**应对策略**：
```bash
# 清理脚本（临时修复）
rm -rf ~/.openclaw/plugin-runtime-deps/openclaw-2026.4.24-*
openclaw gateway restart
```

**注意事项**：
- 首次启动后可能需要 10-15 分钟重新构建依赖树

---

### 3. acpx 插件 ENOTEMPTY — 首次启动失败

| 项目 | 详情 |
|:---|:---|
| **Issue** | [#71244](https://github.com/openclaw/openclaw/issues/71244) |
| **严重度** | 🟡 高 — 插件初始化失败 |
| **影响范围** | Linux bare-os/prebuilds 用户 |
| **触发条件** | 从 2026.4.22 升级到 2026.4.23/24 后首次启动 |

**问题描述**：
- `acpx` 插件在 `node_modules/bare-os/prebuilds` 上失败
- npm ENOTEMPTY 错误（errno -39）
- 并行插件 staging 导致共享依赖冲突

**修复状态**：已在 `main` 分支修复（commit 56e299cbca），序列化依赖修复

**应对策略**：
```bash
# 清理并重启
rm -rf ~/.openclaw/plugin-runtime-deps/openclaw-2026.4.24-*
openclaw gateway restart
```

---

## 🟡 中等问题（影响功能但不致命）

### 4. logging.file 配置不生效

| 项目 | 详情 |
|:---|:---|
| **Issue** | [#67168](https://github.com/openclaw/openclaw/issues/67168) |
| **严重度** | 🟡 中 — 日志写入错误路径 |
| **影响范围** | 自定义日志路径的用户 |

**问题描述**：
- `logging.file` 配置被读取但未应用
- 日志始终写入默认 `/tmp/openclaw/openclaw-YYYY-MM-DD.log`
- 配置验证通过，但运行时不生效

**修复状态**：已在 `main` 修复（commit 5d3168c343）

**应对策略**：
```bash
# 临时修复：使用 shell 重定向
openclaw gateway start 2>&1 | tee /path/to/custom/log
```

---

### 5. ACP 配额耗尽导致网关死锁

| 项目 | 详情 |
|:---|:---|
| **Issue** | [#68823](https://github.com/openclaw/openclaw/issues/68823) |
| **严重度** | 🟡 高 — 所有会话死锁 |
| **影响范围** | 使用 ACP/opencode 子代理的用户 |

**问题描述**：
- ACP 配额耗尽时，网关进程获取多个 `.jsonl.lock` 文件但不释放
- 所有频道（Telegram、微信、WhatsApp）会话死锁
- `/reset` 和 `/new` 命令完全无响应
- 恢复需要手动删除所有 `.lock` 文件 + 重启网关

**根因**：
- 锁释放逻辑在 `finally` 块中，但 ACP 超时/配额失败时未正确执行
- 看门狗定时器（60 秒）未检测到锁泄漏

**应对策略**：
```bash
# 紧急恢复
find ~/.openclaw/agents -name "*.jsonl.lock" -delete
openclaw gateway restart
```

**预防措施**：
- 监控 ACP 配额使用情况
- 设置合理的超时时间
- 避免在配额紧张时启动大量子代理任务

---

### 6. CLI 退出挂起

| 项目 | 详情 |
|:---|:---|
| **Issue** | [#66227](https://github.com/openclaw/openclaw/issues/66227) |
| **严重度** | 🟡 中 — CLI 命令卡住 |
| **影响范围** | 所有使用 CLI 的用户 |

**问题描述**：
- `openclaw cron list` / `agents list` / `status` 输出数据后挂起
- 网关正常工作，但 CLI 进程不退出
- 挂起在 `futex_wait` 状态

**修复状态**：已有 PR 修复（#66276、#66435）

**应对策略**：
- 使用 `openclaw gateway status` 代替 `openclaw status`
- 或等待修复版本发布

---

### 7. 压缩死区 — reserveTokens 配置无效

| 项目 | 详情 |
|:---|:---|
| **Issue** | [#66830](https://github.com/openclaw/openclaw/issues/66830) |
| **严重度** | 🟡 中 — 配置不生效 |
| **影响范围** | 调整压缩参数的用户 |

**问题描述**：
- `compaction.reserveTokens` 配置被读取但不影响实际压缩阈值
- 系统使用 `reserveTokensFloor` 而非 `reserveTokens`
- 配置压缩参数实际上无效

**修复状态**：PR #69379 修复中

**应对策略**：
```json
// 临时修复：直接设置 memoryFlush.softThresholdTokens
{
  "agents": {
    "defaults": {
      "compaction": {
        "mode": "safeguard",
        "reserveTokens": 30000,
        "reserveTokensFloor": 20000
      },
      "memoryFlush": {
        "softThresholdTokens": 20000
      }
    }
  }
}
```

---

## 🟢 低等问题（不影响核心功能）

### 8. npm 全局安装缺失频道插件依赖

| 项目 | 详情 |
|:---|:---|
| **Issue** | [#61787](https://github.com/openclaw/openclaw/issues/61787) |
| **严重度** | 🟢 低 — 特定安装方式受影响 |
| **影响范围** | `npm install -g openclaw` 用户 |

**问题描述**：
- npm 全局安装时静默省略频道插件依赖
- 导致 `MODULE_NOT_FOUND` 级联错误
- 根因：`packageManager: pnpm` 声明与 npm 不兼容

**修复状态**：PR #69837 修复中

---

## 📊 问题统计

| 严重度 | 数量 | 状态 |
|:---|:---:|:---|
| 🔴 致命 | 2 | 已在 2026.4.25 修复 |
| 🟡 高 | 3 | 部分已修复 |
| 🟡 中 | 2 | 修复中 |
| 🟢 低 | 1 | 修复中 |

---

## 🛡️ 升级建议

### 当前系统：2026.4.22

**建议：暂不升级到 2026.4.24**

理由：
1. 2026.4.24 有 2 个致命问题，可能导致系统完全不可用
2. 2026.4.25（pre-release）已修复大部分问题
3. 当前 2026.4.22 稳定运行 41+ 天

### 如果必须升级

**升级前准备**：
```bash
# 1. 备份配置
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak

# 2. 备份记忆文件
tar -czf ~/openclaw-memory-backup.tar.gz ~/.openclaw/workspace/memory/

# 3. 检查当前版本
openclaw --version

# 4. 升级
npm install -g openclaw@latest

# 5. 验证
openclaw --version
openclaw gateway status
```

**升级后检查**：
```bash
# 检查网关日志
tail -f ~/.openclaw/logs/gateway.log

# 检查插件加载
openclaw plugins list

# 检查会话
openclaw agents list
```

### 推荐升级路径

```
2026.4.22 → 等待 2026.4.25 稳定版 → 升级
```

---

## 🔧 通用预防措施

| 措施 | 说明 |
|:---|:---|
| **定期备份** | 使用系统内置备份机制（已配置 7 天轮换） |
| **监控日志** | 定期检查 `~/.openclaw/logs/gateway.log` |
| **配置版本控制** | 将 `openclaw.json` 纳入 Git 管理 |
| **延迟升级** | 新版本发布后等待 1-2 周，观察社区反馈 |
| **备份恢复测试** | 定期测试备份恢复流程 |

---

## 📝 总结

2026.4.24 是一个**问题较多**的版本，主要问题集中在：
1. **配置迁移不完整** — claude-cli 重命名但未迁移配置
2. **并行依赖安装冲突** — npm ENOTEMPTY 错误
3. **锁管理缺陷** — 配额耗尽时锁不释放导致死锁

**核心建议**：
- ✅ 当前 2026.4.22 稳定运行，**暂不升级**
- ✅ 等待 2026.4.25 稳定版发布
- ✅ 升级前务必备份配置和记忆文件
- ✅ 升级后检查网关日志和插件状态

---

_文档生成时间：2026-04-27 15:00 GMT+8_  
_数据来源：GitHub Issues、Release Notes、社区讨论_
