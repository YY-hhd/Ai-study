# 记忆格式转换器

**功能**: OpenClaw 文件式记忆 ↔ Hermes SQLite 记忆 双向转换

---

## 📋 记忆系统对比

### OpenClaw 记忆结构 (文件式)

```
~/.openclaw/workspace/
├── MEMORY.md              # 长期记忆 ( curated )
├── USER.md                # 用户信息
├── SOUL.md                # AI 人格
├── IDENTITY.md            # AI 身份
├── AGENTS.md              # 工作规则
└── memory/
    ├── YYYY-MM-DD.md      # 短期记忆 (每日)
    └── ...
```

**MEMORY.md 格式**:
```markdown
# MEMORY.md - 长期记忆

_最后更新：2026-04-20_

---

## 📚 框架学习记录

### 2026-04-20 15:00 - Hermes 整合计划启动

**项目**: Hermes × OpenClaw 整合
**方案**: 方案 A + 渐进式迁移
**周期**: 3-4 个月

---

## 🎯 核心偏好

| 维度 | 偏好 |
|:---|:---|
| **沟通** | 简洁结构化，不说废话 |
| **决策** | 数据驱动、成本敏感、风控优先 |

---

## 📋 项目状态

### 当前活跃项目
- **Hermes 整合** - 进行中 (2026-04-20 启动)
```

### Hermes 记忆结构 (SQLite)

```sql
-- 记忆表
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding BLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  tags TEXT,
  importance INTEGER DEFAULT 1
);

-- 会话表
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP,
  parent_id TEXT,
  lineage TEXT
);

-- 用户模型表 (Honcho)
CREATE TABLE user_models (
  id TEXT PRIMARY KEY,
  dialectic_data TEXT,
  preferences TEXT,
  updated_at TIMESTAMP
);

-- FTS5 全文搜索
CREATE VIRTUAL TABLE memories_fts USING fts5(content, tags);
```

---

## 🔄 转换规则

### OpenClaw → Hermes (文件 → SQLite)

| OpenClaw 文件 | Hermes 表 | 转换逻辑 |
|:---|:---|:---|
| `MEMORY.md` | `memories` | 按章节分割为多条记录 |
| `memory/YYYY-MM-DD.md` | `memories` | 每日一条，tags=日期 |
| `USER.md` | `user_models.preferences` | JSON 序列化 |
| `SOUL.md` | `memories` (tag=soul) | 单条记录 |
| `IDENTITY.md` | `memories` (tag=identity) | 单条记录 |

### Hermes → OpenClaw (SQLite → 文件)

| Hermes 表 | OpenClaw 文件 | 转换逻辑 |
|:---|:---|:---|
| `memories` (tag=soul) | `SOUL.md` | 合并 content |
| `memories` (tag=identity) | `IDENTITY.md` | 合并 content |
| `user_models.preferences` | `USER.md` | JSON → Markdown |
| `memories` (其他) | `MEMORY.md` | 按日期分组生成 |

---

## 🛠️ 使用方法

### OpenClaw → Hermes
```bash
# 迁移所有记忆文件到 SQLite
node memory-converter.js to-hermes \
  --workspace ~/.openclaw/workspace \
  --database ~/.hermes/memory.db

# 仅迁移特定文件
node memory-converter.js to-hermes \
  --workspace ~/.openclaw/workspace \
  --database ~/.hermes/memory.db \
  --files MEMORY.md,USER.md,SOUL.md
```

### Hermes → OpenClaw
```bash
# 从 SQLite 导出到文件
node memory-converter.js to-openclaw \
  --database ~/.hermes/memory.db \
  --workspace ~/.openclaw/workspace

# 预览变更 (不实际写入)
node memory-converter.js to-openclaw \
  --database ~/.hermes/memory.db \
  --workspace ~/.openclaw/workspace \
  --dry-run
```

---

## 📊 迁移示例

### 示例 1: MEMORY.md → SQLite

**输入** (`MEMORY.md`):
```markdown
## 2026-04-20 - Hermes 整合计划

**项目**: Hermes × OpenClaw 整合
**方案**: 方案 A
```

**输出** (SQLite):
```sql
INSERT INTO memories (id, content, tags, created_at)
VALUES (
  'memory-20260420-hermes',
  '**项目**: Hermes × OpenClaw 整合\n**方案**: 方案 A',
  '["project","hermes"]',
  '2026-04-20T15:00:00+08:00'
);
```

### 示例 2: SQLite → MEMORY.md

**输入** (SQLite):
```sql
SELECT * FROM memories WHERE tags LIKE '%project%';
```

**输出** (`MEMORY.md`):
```markdown
## 📋 项目状态

### Hermes 整合 (2026-04-20)
- **项目**: Hermes × OpenClaw 整合
- **方案**: 方案 A + 渐进式迁移
- **周期**: 3-4 个月
```

---

## ✅ 测试用例

### 测试 1: Markdown 解析
```javascript
const md = `## 2026-04-20 - 测试
**内容**: 测试记忆`;
const records = parseMarkdown(md);
// 期望：[{ title: '测试', content: '**内容**: 测试记忆', date: '2026-04-20' }]
```

### 测试 2: SQLite 插入
```javascript
await insertMemory(db, {
  id: 'test-1',
  content: '测试内容',
  tags: ['test'],
  created_at: '2026-04-20T15:00:00+08:00'
});
// 验证：SELECT COUNT(*) FROM memories = 1
```

### 测试 3: 双向转换一致性
```javascript
const original = readFileSync('MEMORY.md');
const db = convertToSqlite(original);
const exported = convertToFile(db);
assert.equal(normalize(original), normalize(exported));
```

---

## 📝 迁移报告

```json
{
  "timestamp": "2026-04-20T15:00:00+08:00",
  "direction": "openclaw-to-hermes",
  "files": {
    "MEMORY.md": { "status": "migrated", "records": 15 },
    "USER.md": { "status": "migrated", "records": 1 },
    "SOUL.md": { "status": "migrated", "records": 1 },
    "memory/2026-04-20.md": { "status": "migrated", "records": 1 }
  },
  "database": {
    "path": "~/.hermes/memory.db",
    "totalRecords": 18,
    "ftsIndexed": true
  },
  "warnings": [],
  "backupPath": "~/.hermes/backups/memory-20260420-150000.db"
}
```

---

_版本：v0.1.0_  
_状态：开发中_
