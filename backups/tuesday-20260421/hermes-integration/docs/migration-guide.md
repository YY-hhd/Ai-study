# Hermes × OpenClaw 迁移指南

**版本**: v1.0  
**最后更新**: 2026-04-20

---

## 📋 目录

1. [迁移前准备](#迁移前准备)
2. [阶段一：互操作层](#阶段一互操作层)
3. [阶段二：功能融合](#阶段二功能融合)
4. [阶段三：统一框架](#阶段三统一框架)
5. [故障排除](#故障排除)
6. [回滚指南](#回滚指南)

---

## 迁移前准备

### 系统要求

| 组件 | 最低要求 | 推荐 |
|:---|:---|:---|
| Node.js | v18+ | v22+ |
| npm | v8+ | v10+ |
| Python (可选) | v3.10+ | v3.12+ |
| SQLite | v3.35+ | v3.40+ |
| 磁盘空间 | 500MB | 2GB |

### 备份清单

在开始迁移前，请确保备份以下文件：

```bash
# OpenClaw 配置
cp -r ~/.openclaw ~/.openclaw.backup-$(date +%Y%m%d)

# Hermes 配置 (如果已有)
cp -r ~/.hermes ~/.hermes.backup-$(date +%Y%m%d)

# 验证备份
ls -la ~/.openclaw.backup-*
ls -la ~/.hermes.backup-*
```

### 兼容性检查

```bash
# 运行兼容性检查脚本
npx @openclaw/hermes-integration check-compatibility

# 输出示例:
# ✅ Node.js: v22.22.1 (兼容)
# ✅ SQLite: v3.40.0 (兼容)
# ⚠️ Python: 未安装 (部分功能受限)
```

---

## 阶段一：互操作层

### 1.1 配置迁移

#### OpenClaw → Hermes

```bash
# 迁移配置
npx @openclaw/hermes-integration migrate config \
  --from openclaw \
  --to hermes \
  --config ~/.openclaw/config.json \
  --output ~/.hermes/config.json

# 验证
npx @openclaw/hermes-integration validate config ~/.hermes/config.json
```

#### Hermes → OpenClaw

```bash
# 迁移配置
npx @openclaw/hermes-integration migrate config \
  --from hermes \
  --to openclaw \
  --config ~/.hermes/config.json \
  --output ~/.openclaw/config.json

# 验证
npx @openclaw/hermes-integration validate config ~/.openclaw/config.json
```

### 1.2 记忆迁移

#### OpenClaw → Hermes (文件 → SQLite)

```bash
# 迁移记忆
npx @openclaw/hermes-integration migrate memory \
  --from openclaw \
  --workspace ~/.openclaw/workspace \
  --database ~/.hermes/memory.db

# 验证
npx @openclaw/hermes-integration validate memory ~/.hermes/memory.db
```

#### Hermes → OpenClaw (SQLite → 文件)

```bash
# 迁移记忆
npx @openclaw/hermes-integration migrate memory \
  --from hermes \
  --database ~/.hermes/memory.db \
  --workspace ~/.openclaw/workspace

# 验证
npx @openclaw/hermes-integration validate memory ~/.openclaw/workspace
```

### 1.3 技能迁移

```bash
# 迁移技能
npx @openclaw/hermes-integration migrate skills \
  --from openclaw \
  --skills-dir ~/.openclaw/workspace/skills \
  --output ~/.hermes/skills

# 验证
npx @openclaw/hermes-integration validate skills ~/.hermes/skills
```

---

## 阶段二：功能融合

### 2.1 启用学习循环

在 OpenClaw 配置中添加:

```json
{
  "learning": {
    "enabled": true,
    "autoCreateSkills": true,
    "improveOnFeedback": true,
    "persistInterval": "24h"
  }
}
```

### 2.2 配置多终端后端

```json
{
  "terminals": {
    "default": "local",
    "backends": {
      "local": { "enabled": true },
      "docker": { "enabled": false },
      "ssh": { "enabled": false, "host": "", "user": "" },
      "modal": { "enabled": false, "token": "" }
    }
  }
}
```

### 2.3 启用 FTS5 记忆搜索

```bash
# 安装 SQLite FTS5 扩展
npm install @openclaw/memory-sqlite

# 配置
{
  "memory": {
    "provider": "sqlite",
    "path": "~/.openclaw/memory.db",
    "fts": {
      "enabled": true,
      "language": "zh"
    }
  }
}
```

---

## 阶段三：统一框架

### 3.1 安装统一框架

```bash
# 卸载旧版本
npm uninstall -g openclaw
npm uninstall -g hermes-agent

# 安装统一框架
npm install -g @openclaw/unified

# 验证
openclaw --version
hermes --version
```

### 3.2 迁移到统一框架

```bash
# 自动迁移
unified-migrate --auto

# 或手动选择
unified-migrate \
  --config-from ~/.openclaw/config.json \
  --memory-from ~/.openclaw/workspace \
  --skills-from ~/.openclaw/workspace/skills
```

### 3.3 验证迁移

```bash
# 运行完整性检查
unified validate --full

# 测试基本功能
unified test --suite basic

# 测试消息平台
unified test --suite messaging
```

---

## 故障排除

### 问题 1: 配置迁移失败

**症状**: `Error: Cannot parse config file`

**解决**:
```bash
# 检查配置文件语法
jq . ~/.openclaw/config.json
jq . ~/.hermes/config.json

# 修复后重试
npx @openclaw/hermes-integration migrate config --retry
```

### 问题 2: 记忆迁移丢失数据

**症状**: 迁移后记录数不匹配

**解决**:
```bash
# 检查源文件
wc -l ~/.openclaw/workspace/memory/*.md

# 检查数据库
sqlite3 ~/.hermes/memory.db "SELECT COUNT(*) FROM memories;"

# 重新迁移 (增量模式)
npx @openclaw/hermes-integration migrate memory --incremental
```

### 问题 3: 技能不兼容

**症状**: `Error: Skill format not supported`

**解决**:
```bash
# 转换技能格式
npx @openclaw/hermes-integration convert-skill \
  --from agentskills \
  --to agentskills-io \
  --input ./skill \
  --output ./skill-converted
```

---

## 回滚指南

### 回滚到阶段一之前

```bash
# 恢复配置
cp ~/.openclaw.config.backup-*/config.json ~/.openclaw/config.json

# 恢复记忆
rm ~/.hermes/memory.db
cp -r ~/.openclaw.workspace.backup-*/ ~/.openclaw/workspace/

# 重启网关
openclaw gateway restart
```

### 回滚到阶段二之前

```bash
# 禁用学习循环
openclaw config set learning.enabled false

# 恢复文件记忆
unified-migrate rollback --to file-memory

# 重启
openclaw gateway restart
```

### 回滚到统一框架之前

```bash
# 卸载统一框架
npm uninstall -g @openclaw/unified

# 恢复旧版本
npm install -g openclaw@latest
npm install -g hermes-agent@latest

# 恢复配置
cp ~/.openclaw.backup-*/config.json ~/.openclaw/config.json
cp ~/.hermes.backup-*/config.json ~/.hermes/config.json

# 重启
openclaw gateway restart
hermes gateway restart
```

---

## 支持资源

- **文档**: https://docs.openclaw.ai/hermes-integration
- **GitHub**: https://github.com/openclaw/hermes-integration
- **Discord**: https://discord.gg/clawd
- **问题反馈**: https://github.com/openclaw/hermes-integration/issues

---

_迁移愉快！如有问题，请查阅故障排除部分或提交 Issue。_
