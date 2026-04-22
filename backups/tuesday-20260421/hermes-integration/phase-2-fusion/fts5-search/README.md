# FTS5 记忆搜索

**功能**: 基于 SQLite FTS5 的全文搜索，实现高效记忆检索

---

## 📋 FTS5 简介

**FTS5** (Full-Text Search 5) 是 SQLite 的全文搜索扩展，支持：

- ✅ 分词搜索
- ✅ 短语搜索
- ✅ 布尔查询
- ✅ 相关性排序
- ✅ 前缀匹配
- ✅ 高亮显示

---

## 🔄 架构设计

```
记忆存储 (SQLite)
    ├── memories 表 (原始数据)
    └── memories_fts 表 (FTS5 索引)
         ↓
    搜索引擎 (Search Engine)
         ↓
    查询解析 → 索引匹配 → 结果排序 → 高亮显示
```

---

## 🛠️ 使用方法

### 初始化搜索索引

```bash
# 创建 FTS5 索引
node fts5-search.js init

# 重建索引 (全量)
node fts5-search.js rebuild

# 增量更新
node fts5-search.js update
```

### 搜索记忆

```bash
# 基本搜索
node fts5-search.js search "Python coding guidelines"

# 短语搜索 (精确匹配)
node fts5-search.js search "\"async await pattern\""

# 布尔查询
node fts5-search.js search "Python AND (async OR concurrent)"

# 前缀匹配
node fts5-search.js search "pyth*"

# 排除词
node fts5-search.js search "Python -Java"
```

### 高级搜索

```bash
# 按时间范围搜索
node fts5-search.js search "API design" --after 2026-01-01 --before 2026-04-20

# 按类型过滤
node fts5-search.js search "database" --type skill

# 限制结果数量
node fts5-search.js search "coding" --limit 20

# 高亮显示匹配
node fts5-search.js search "TypeScript" --highlight
```

---

## 📊 搜索语法

### 基本语法

| 语法 | 示例 | 说明 |
|:---|:---|:---|
| **单词** | `Python` | 匹配包含 Python 的文档 |
| **短语** | `"design pattern"` | 精确匹配短语 |
| **AND** | `Python AND async` | 同时包含两个词 |
| **OR** | `Python OR Java` | 包含任一词 |
| **NOT** | `Python NOT Java` | 包含 Python 但不含 Java |
| **前缀** | `pyth*` | 匹配 python、pythagoras 等 |
| **NEAR** | `async NEAR/5 await` | 两词相距 5 词以内 |

### 字段搜索

```bash
# 搜索特定字段
node fts5-search.js search "title:Python content:coding"

# 支持的字段
- title: 标题
- content: 内容
- tags: 标签
- type: 类型 (skill/memory/note)
```

---

## 📝 数据库结构

### memories 表

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  type TEXT,  -- 'skill' | 'memory' | 'note' | 'experience'
  tags TEXT,  -- JSON array
  created_at TEXT,
  updated_at TEXT,
  metadata TEXT  -- JSON
);
```

### memories_fts 表 (FTS5)

```sql
CREATE VIRTUAL TABLE memories_fts USING fts5(
  title,
  content,
  tags,
  content='memories',
  content_rowid='rowid'
);

-- 触发器：自动同步
CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, title, content, tags)
  VALUES (new.rowid, new.title, new.content, new.tags);
END;
```

---

## 🔍 搜索优化

### 1. 相关性排序

```sql
SELECT *, bm25(memories_fts) as relevance
FROM memories_fts
WHERE memories_fts MATCH 'Python coding'
ORDER BY relevance;
```

### 2. 高亮显示

```sql
SELECT highlight(memories_fts, 0, '<mark>', '</mark>') as highlighted_content
FROM memories_fts
WHERE memories_fts MATCH 'Python';
```

### 3. 搜索建议 (自动补全)

```sql
SELECT DISTINCT title
FROM memories_fts
WHERE title LIKE 'pyth%'
LIMIT 10;
```

---

## 📈 性能优化

### 索引优化

```sql
-- 分析表
ANALYZE memories;
ANALYZE memories_fts;

-- 优化 FTS5 索引
PRAGMA optimize;
```

### 查询优化

```sql
-- 使用 LIMIT 限制结果
SELECT * FROM memories_fts MATCH 'Python' LIMIT 20;

-- 使用字段过滤减少扫描
SELECT * FROM memories_fts 
WHERE memories_fts MATCH 'title:Python' 
AND type = 'skill';
```

---

## 🔧 故障排除

### 问题 1: 搜索结果为空

**症状**: 查询返回 0 条结果，但数据存在

**解决**:
```bash
# 检查索引同步
node fts5-search.js check-sync

# 重建索引
node fts5-search.js rebuild
```

### 问题 2: 搜索速度慢

**症状**: 搜索耗时超过 1 秒

**解决**:
```bash
# 分析表
sqlite3 ~/.openclaw/memory.db "ANALYZE;"

# 检查索引大小
sqlite3 ~/.openclaw/memory.db "SELECT count(*) FROM memories_fts;"
```

### 问题 3: 中文分词问题

**症状**: 中文搜索不准确

**解决**:
```sql
-- 使用中文分词器
CREATE VIRTUAL TABLE memories_fts USING fts5(
  title, content,
  tokenize='unicode61'
);
```

---

## 📝 配置示例

```yaml
# ~/.openclaw/config/search.yaml
fts5:
  enabled: true
  db_path: ~/.openclaw/memory.db
  
  # 索引配置
  index:
    auto_sync: true
    rebuild_interval: 24h
    
  # 搜索配置
  search:
    default_limit: 20
    max_limit: 100
    highlight_enabled: true
    highlight_pre: '<mark>'
    highlight_post: '</mark>'
    
  # 分词配置
  tokenizer:
    type: unicode61
    remove_diacritics: true
    
  # 性能优化
  optimization:
    auto_analyze: true
    analyze_threshold: 1000
```

---

_版本：v0.1.0_  
_状态：开发中_
