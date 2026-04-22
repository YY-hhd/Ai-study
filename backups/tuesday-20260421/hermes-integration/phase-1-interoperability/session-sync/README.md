# 会话历史互通工具

**功能**: OpenClaw ↔ Hermes 会话历史双向同步

---

## 📋 会话存储对比

### OpenClaw 会话存储

**位置**: `~/.openclaw/agents/main/sessions/sessions.json`

**格式**:
```json
{
  "sessions": [
    {
      "sessionKey": "agent:main:main",
      "kind": "direct",
      "lastActivity": "2026-04-20T17:00:00+08:00",
      "model": "bailian/qwen3.5-plus",
      "messageCount": 150
    }
  ]
}
```

### Hermes 会话存储

**位置**: `~/.hermes/sessions/` (SQLite)

**格式**:
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP,
  parent_id TEXT,
  lineage TEXT
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  role TEXT,  -- 'user' | 'assistant' | 'system'
  content TEXT,
  timestamp TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

---

## 🔄 同步策略

### 方案：JSON ↔ SQLite 转换

**OpenClaw 会话** → **中间格式** → **Hermes 会话**

```
sessions.json  →  SessionExport[]  →  SQLite tables
     ↓                ↓                    ↓
  JSON 数组     标准化格式         Hermes 会话表
```

---

## 🛠️ 使用方法

### 导出会话

```bash
# 导出 OpenClaw 会话
node session-sync.js export --from openclaw --output sessions-export.json

# 导出 Hermes 会话
node session-sync.js export --from hermes --output sessions-export.json
```

### 导入会话

```bash
# 导入到 OpenClaw
node session-sync.js import --to openclaw --input sessions-export.json

# 导入到 Hermes
node session-sync.js import --to hermes --input sessions-export.json
```

### 同步会话

```bash
# 双向同步
node session-sync.js sync

# 单向同步
node session-sync.js sync --direction openclaw-to-hermes
node session-sync.js sync --direction hermes-to-openclaw
```

### 列出会话

```bash
# 列出 OpenClaw 会话
node session-sync.js list --from openclaw

# 列出 Hermes 会话
node session-sync.js list --from hermes
```

---

## 📊 中间格式

```typescript
interface SessionExport {
  id: string;
  title?: string;
  createdAt: string;
  lastActivity: string;
  model?: string;
  messageCount: number;
  messages: MessageExport[];
  metadata?: Record<string, any>;
}

interface MessageExport {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}
```

---

## ⚠️ 注意事项

### 1. 会话 ID 冲突

不同系统的会话 ID 可能冲突，导入时会自动重命名：
```
原 ID: agent:main:main
新 ID: openclaw-agent-main-main-20260420
```

### 2. 消息格式差异

| 特性 | OpenClaw | Hermes | 处理方式 |
|:---|:---|:---|:---|
| 工具调用 | ✅ 支持 | ✅ 支持 | 直接映射 |
| 嵌入内容 | ✅ 支持 | ⚠️ 部分支持 | 转为文本 |
| 思维链 | ✅ 支持 | ✅ 支持 | 直接映射 |

### 3. 大会话处理

会话超过 1000 条消息时，建议分批导入：
```bash
# 分批导入 (每批 500 条)
node session-sync.js import --to hermes --input sessions.json --batch-size 500
```

---

## 📝 示例

### 导出 OpenClaw 会话

```bash
$ node session-sync.js export --from openclaw --output backup.json
✅ Exported 5 sessions with 1,234 messages
📄 Output: backup.json
```

### 导入到 Hermes

```bash
$ node session-sync.js import --to hermes --input backup.json
✅ Imported 5 sessions with 1,234 messages
📊 New sessions: 3, Updated: 2
```

### 列出会话

```bash
$ node session-sync.js list --from openclaw
Sessions in OpenClaw:
  1. agent:main:main (150 messages, last: 2026-04-20 17:00)
  2. agent:main:cron:xxx (45 messages, last: 2026-04-20 16:30)
  3. agent:main:feishu:xxx (89 messages, last: 2026-04-19 10:00)
```

---

_版本：v0.1.0_  
_状态：开发中_
