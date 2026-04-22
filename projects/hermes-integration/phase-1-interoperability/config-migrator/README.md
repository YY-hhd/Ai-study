# 配置迁移工具

**功能**: OpenClaw ↔ Hermes 双向配置转换

---

## 📋 配置文件对比

### OpenClaw 配置结构
```json
{
  "gateway": {
    "bind": "ws://127.0.0.1:18789",
    "trustedProxies": [],
    "nodes": {}
  },
  "channels": {
    "feishu": {
      "groupPolicy": "open",
      "appId": "...",
      "appSecret": "..."
    }
  },
  "agents": {
    "defaults": {
      "model": "bailian/qwen3.5-plus",
      "userTimezone": "Asia/Shanghai"
    }
  },
  "plugins": {
    "entries": {},
    "allow": []
  },
  "tools": {
    "elevated": true,
    "fs": {
      "workspaceOnly": true
    }
  }
}
```

### Hermes 配置结构
```json
{
  "profiles": {
    "default": {
      "HERMES_HOME": "~/.hermes",
      "model": {
        "provider": "bailian",
        "model": "qwen3.5-plus"
      },
      "terminal": {
        "backend": "local"
      },
      "gateway": {
        "platforms": ["telegram", "discord"],
        "auth": {
          "dmPolicy": "pairing",
          "groupPolicy": "allowlist"
        }
      },
      "memory": {
        "provider": "sqlite",
        "path": "~/.hermes/memory.db"
      },
      "skills": {
        "autoCreate": true,
        "directory": "~/.hermes/skills"
      }
    }
  }
}
```

---

## 🔄 转换规则

### OpenClaw → Hermes

| OpenClaw 字段 | Hermes 字段 | 转换逻辑 |
|:---|:---|:---|
| `agents.defaults.model` | `profiles.default.model` | 解析 provider/model |
| `agents.defaults.userTimezone` | `profiles.default.timezone` | 直接复制 |
| `gateway.bind` | `profiles.default.gateway.port` | 提取端口号 |
| `channels.feishu` | `profiles.default.gateway.platforms` | 添加 feishu |
| `tools.fs.workspaceOnly` | `profiles.default.terminal.sandbox` | 布尔值转换 |

### Hermes → OpenClaw

| Hermes 字段 | OpenClaw 字段 | 转换逻辑 |
|:---|:---|:---|
| `profiles.default.model` | `agents.defaults.model` | 格式化为 provider/model |
| `profiles.default.timezone` | `agents.defaults.userTimezone` | 直接复制 |
| `profiles.default.gateway.platforms` | `channels.*` | 为每个平台创建配置 |
| `profiles.default.memory.provider` | `memory.provider` | 映射 (sqlite→file) |

---

## 🛠️ 使用方法

### OpenClaw → Hermes
```bash
# 迁移当前 OpenClaw 配置到 Hermes
openclaw migrate-to-hermes --output ~/.hermes/config.json

# 迁移指定配置文件
openclaw migrate-to-hermes --config ~/.openclaw/config.json --output ~/.hermes/config.json

# 仅迁移特定部分
openclaw migrate-to-hermes --only models,channels --output ~/.hermes/config.json
```

### Hermes → OpenClaw
```bash
# 导入 Hermes 配置到 OpenClaw
openclaw import-from-hermes --config ~/.hermes/config.json

# 预览变更 (不实际写入)
openclaw import-from-hermes --config ~/.hermes/config.json --dry-run

# 仅导入特定部分
openclaw import-from-hermes --config ~/.hermes/config.json --only models,memory
```

---

## ✅ 测试用例

### 测试 1: 模型配置迁移
```json
// 输入 (OpenClaw)
{ "agents": { "defaults": { "model": "bailian/qwen3.5-plus" } } }

// 期望输出 (Hermes)
{ "profiles": { "default": { "model": { "provider": "bailian", "model": "qwen3.5-plus" } } } }
```

### 测试 2: 时区配置迁移
```json
// 输入 (OpenClaw)
{ "agents": { "defaults": { "userTimezone": "Asia/Shanghai" } } }

// 期望输出 (Hermes)
{ "profiles": { "default": { "timezone": "Asia/Shanghai" } } }
```

### 测试 3: 通道配置迁移
```json
// 输入 (OpenClaw)
{ "channels": { "feishu": { "appId": "xxx" }, "telegram": { "botToken": "xxx" } } }

// 期望输出 (Hermes)
{ "profiles": { "default": { "gateway": { "platforms": ["feishu", "telegram"] } } } }
```

---

## 📝 迁移报告

每次迁移生成报告：
```json
{
  "timestamp": "2026-04-20T15:00:00+08:00",
  "direction": "openclaw-to-hermes",
  "migrated": {
    "models": true,
    "channels": true,
    "timezone": true,
    "tools": false
  },
  "skipped": [
    { "field": "plugins.entries", "reason": "不兼容的插件系统" }
  ],
  "warnings": [
    "Feishu 配置需要手动填写 appSecret"
  ],
  "backupPath": "~/.openclaw/backups/config-20260420-150000.json"
}
```

---

_版本：v0.1.0_  
_状态：开发中_
