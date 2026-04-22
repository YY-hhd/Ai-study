# API Key 共享同步工具

**功能**: OpenClaw ↔ Hermes API Key 双向同步

---

## 📋 密钥存储对比

### OpenClaw 密钥存储

**位置**: `~/.openclaw/keys/` 或环境变量

**格式**:
```bash
# 环境变量方式
export OPENCLAW_BAILIAN_API_KEY="sk-xxx"
export OPENCLAW_TELEGRAM_BOT_TOKEN="xxx"

# 或配置文件 ~/.openclaw/keys.json
{
  "bailian": {
    "apiKey": "sk-xxx"
  },
  "telegram": {
    "botToken": "xxx"
  }
}
```

### Hermes 密钥存储

**位置**: `~/.hermes/keys/` 或 `~/.hermes/.env`

**格式**:
```bash
# .env 文件
HERMES_BAILIAN_API_KEY=sk-xxx
HERMES_TELEGRAM_BOT_TOKEN=xxx

# 或密钥目录
~/.hermes/keys/
├── bailian.key
└── telegram.key
```

---

## 🔄 同步策略

### 方案 A: 统一存储 (推荐)

**存储位置**: `~/.openclaw/shared-keys/`

**格式**:
```json
{
  "version": "1.0",
  "keys": {
    "bailian": {
      "apiKey": "sk-xxx",
      "lastUpdated": "2026-04-20T19:00:00+08:00"
    },
    "telegram": {
      "botToken": "xxx",
      "lastUpdated": "2026-04-20T19:00:00+08:00"
    }
  },
  "syncTargets": ["openclaw", "hermes"]
}
```

**优点**:
- ✅ 单一事实来源
- ✅ 版本控制
- ✅ 时间戳追踪
- ✅ 易于备份

### 方案 B: 双向同步

**机制**: 监听变化，自动同步

```
OpenClaw Keys ←→ Sync Service ←→ Hermes Keys
     ↓                                  ↓
  keys.json                        .env + keys/
```

**优点**:
- ✅ 向后兼容
- ✅ 独立运行
- ✅ 故障隔离

**缺点**:
- ❌ 复杂度高
- ❌ 可能冲突

---

## 🛠️ 使用方法

### 初始化共享密钥

```bash
# 创建共享密钥存储
node api-key-sync.js init

# 输出:
# ✅ Created ~/.openclaw/shared-keys/keys.json
# ⚠️ Please add your API keys to the file
```

### 导入现有密钥

```bash
# 从 OpenClaw 导入
node api-key-sync.js import --from openclaw

# 从 Hermes 导入
node api-key-sync.js import --from hermes

# 从环境变量导入
node api-key-sync.js import --from env
```

### 导出密钥

```bash
# 导出到 OpenClaw
node api-key-sync.js export --to openclaw

# 导出到 Hermes
node api-key-sync.js export --to hermes

# 导出到环境变量 (当前 shell)
node api-key-sync.js export --to env
```

### 同步密钥

```bash
# 双向同步
node api-key-sync.js sync

# 单向同步 (shared → openclaw)
node api-key-sync.js sync --to openclaw

# 单向同步 (shared → hermes)
node api-key-sync.js sync --to hermes
```

### 验证密钥

```bash
# 验证所有密钥
node api-key-sync.js validate

# 验证特定服务
node api-key-sync.js validate bailian
node api-key-sync.js validate telegram
```

---

## 🔐 安全特性

### 1. 文件权限
```bash
# 自动设置权限为 600 (仅所有者可读写)
chmod 600 ~/.openclaw/shared-keys/keys.json
```

### 2. 加密存储 (可选)
```bash
# 使用主密码加密
node api-key-sync.js init --encrypt

# 输入主密码后，密钥将使用 AES-256 加密存储
```

### 3. 审计日志
```json
{
  "auditLog": [
    {
      "timestamp": "2026-04-20T19:00:00+08:00",
      "action": "key_added",
      "service": "bailian",
      "source": "import-openclaw"
    },
    {
      "timestamp": "2026-04-20T19:05:00+08:00",
      "action": "sync",
      "target": "hermes",
      "result": "success"
    }
  ]
}
```

---

## 📊 支持的服务

| 服务 | OpenClaw | Hermes | 同步状态 |
|:---|:---:|:---:|:---|
| **百炼 API** | ✅ | ✅ | ✅ 支持 |
| **Telegram** | ✅ | ✅ | ✅ 支持 |
| **Discord** | ✅ | ✅ | ✅ 支持 |
| **Slack** | ✅ | ✅ | ✅ 支持 |
| **WhatsApp** | ✅ | ✅ | ✅ 支持 |
| **Signal** | ✅ | ✅ | ✅ 支持 |
| **Email (SMTP)** | ✅ | ✅ | ✅ 支持 |
| **GitHub** | ✅ | ✅ | ✅ 支持 |

---

## 📝 配置文件格式

### 共享密钥文件 (`keys.json`)

```json
{
  "version": "1.0",
  "createdAt": "2026-04-20T19:00:00+08:00",
  "updatedAt": "2026-04-20T19:00:00+08:00",
  "keys": {
    "bailian": {
      "apiKey": "sk-xxx",
      "endpoint": "https://dashscope.aliyuncs.com",
      "lastUpdated": "2026-04-20T19:00:00+08:00"
    },
    "telegram": {
      "botToken": "xxx:yyy",
      "apiEndpoint": "https://api.telegram.org",
      "lastUpdated": "2026-04-20T19:00:00+08:00"
    }
  },
  "syncTargets": ["openclaw", "hermes"],
  "auditLog": []
}
```

---

## ⚠️ 注意事项

### 安全最佳实践

1. **不要提交密钥到版本控制**
   ```bash
   # 添加到 .gitignore
   echo "shared-keys/keys.json" >> .gitignore
   ```

2. **定期轮换密钥**
   ```bash
   # 生成新密钥后更新
   node api-key-sync.js rotate bailian
   ```

3. **使用最小权限原则**
   - 为每个服务创建专用密钥
   - 不要共享主账号密钥

4. **备份密钥**
   ```bash
   # 导出加密备份
   node api-key-sync.js backup --encrypt --output backup.json
   ```

---

## 🔧 故障排除

### 问题 1: 同步失败

**症状**: `Error: Failed to sync keys to hermes`

**解决**:
```bash
# 检查 Hermes 配置目录
ls -la ~/.hermes/

# 手动创建目录
mkdir -p ~/.hermes/keys

# 重试同步
node api-key-sync.js sync --to hermes
```

### 问题 2: 密钥格式错误

**症状**: `Error: Invalid key format for bailian`

**解决**:
```bash
# 验证密钥格式
node api-key-sync.js validate bailian

# 手动修复
code ~/.openclaw/shared-keys/keys.json
```

### 问题 3: 权限问题

**症状**: `Error: Permission denied`

**解决**:
```bash
# 修复权限
chmod 600 ~/.openclaw/shared-keys/keys.json
chown $(whoami) ~/.openclaw/shared-keys/keys.json
```

---

_版本：v0.1.0_  
_状态：开发中_
