# 技能兼容层

**功能**: OpenClaw AgentSkills ↔ agentskills.io 双向转换

---

## 📋 格式对比

### OpenClaw AgentSkills 格式

```markdown
---
name: python
description: Python coding guidelines and best practices. Use when writing, reviewing, or refactoring Python code.
---

# Python Coding Guidelines

## Code Style (PEP 8)

- 4 spaces for indentation (never tabs)
- Max line length: 88 chars

## Before Committing

```bash
python -m py_compile *.py
```

## Anti-patterns to Avoid
...
```

**特点**:
- ✅ YAML frontmatter (name, description)
- ✅ Markdown 正文
- ✅ 支持 scripts/, references/, assets/ 子目录
- ❌ 缺少 version, license, tags 等元数据
- ❌ 缺少 compatibility 字段
- ❌ 缺少 allowed-tools 字段

---

### agentskills.io 标准格式

```markdown
---
name: python-coding
description: Python best practices, PEP 8, testing. Use when writing Python code.
version: 1.0.0
license: Apache-2.0
compatibility: Python 3.10+, requires pytest for testing
metadata:
  author: openclaw
  spec-version: "1.0"
tags: [python, coding, pep8, testing]
platforms: [claude-code, cursor, github-copilot]
allowed-tools: Bash(python:*), Read, Write
---

# Python Coding Guidelines

## When to use this skill

Use this skill when the user needs to write, review, or refactor Python code.

## Code Style

...
```

**特点**:
- ✅ 完整 YAML frontmatter (必需 + 可选字段)
- ✅ 明确的 "When to use" 章节
- ✅ 渐进式披露 (元数据 ~100 tokens, 正文 <5000 tokens)
- ✅ 支持跨平台 (platforms 字段)
- ✅ 工具白名单 (allowed-tools)
- ✅ 版本控制 (semver)

---

## 🔄 转换规则

### OpenClaw → agentskills.io

| OpenClaw 字段 | agentskills.io 字段 | 转换逻辑 |
|:---|:---|:---|
| `name` | `name` | 验证格式，必要时修正 |
| `description` | `description` | 确保包含 "Use when..." |
| (无) | `version` | 默认 "1.0.0" |
| (无) | `license` | 默认 "Apache-2.0" |
| (无) | `compatibility` | 分析技能内容推断 |
| (无) | `metadata.author` | 从目录或配置提取 |
| (无) | `tags` | 从 name/description 提取关键词 |
| (无) | `platforms` | 默认 ["openclaw", "claude-code", "cursor"] |
| (无) | `allowed-tools` | 分析代码块推断 |

### agentskills.io → OpenClaw

| agentskills.io 字段 | OpenClaw 字段 | 转换逻辑 |
|:---|:---|:---|
| `name` | `name` | 直接复制 |
| `description` | `description` | 直接复制 |
| `version` | (忽略) | OpenClaw 不支持 |
| `license` | (保留为注释) | 在正文顶部添加注释 |
| `compatibility` | (保留为注释) | 在正文顶部添加注释 |
| `metadata` | (忽略) | OpenClaw 不支持 |
| `tags` | (忽略) | OpenClaw 不支持 |
| `platforms` | (忽略) | OpenClaw 不支持 |
| `allowed-tools` | (忽略) | OpenClaw 不支持 |

---

## 🛠️ 使用方法

### OpenClaw → agentskills.io

```bash
# 转换单个技能
node skill-adapter.js to-agentskills \
  --input ~/.openclaw/workspace/skills/python \
  --output ~/.agents/skills/python-coding

# 批量转换整个目录
node skill-adapter.js to-agentskills \
  --input ~/.openclaw/workspace/skills \
  --output ~/.agents/skills \
  --batch

# 验证输出
node skill-adapter.js validate ~/.agents/skills/python-coding
```

### agentskills.io → OpenClaw

```bash
# 转换单个技能
node skill-adapter.js to-openclaw \
  --input ~/.agents/skills/python-coding \
  --output ~/.openclaw/workspace/skills/python

# 批量转换
node skill-adapter.js to-openclaw \
  --input ~/.agents/skills \
  --output ~/.openclaw/workspace/skills \
  --batch
```

---

## ✅ 验证规则

### 名称验证
```javascript
// agentskills.io 要求
name: {
  pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  minLength: 1,
  maxLength: 64,
  noConsecutiveHyphens: true
}

// 示例
✅ python-coding
✅ data-analysis-v2
❌ Python-Coding  (大写)
❌ python--coding (连续连字符)
❌ -python        (开头连字符)
```

### 描述验证
```javascript
// agentskills.io 要求
description: {
  minLength: 1,
  maxLength: 1024,
  mustIncludeUseWhen: true  // 推荐包含 "Use when..."
}

// 示例
✅ "Python best practices. Use when writing Python code."
✅ "PDF processing. Use when handling PDF files."
❌ "Python coding"  (缺少 "Use when...")
```

### 目录结构验证
```javascript
// 允许的目录
allowedSubdirs: ['scripts', 'references', 'assets']

// 示例
✅ skill-name/
    ├── SKILL.md
    ├── scripts/
    └── references/

❌ skill-name/
    ├── SKILL.md
    └── templates/  (不允许的目录名)
```

---

## 📊 转换示例

### 示例 1: Python 技能转换

**输入** (OpenClaw):
```markdown
---
name: python
description: Python coding guidelines. Use when writing Python.
---

# Python Guidelines

## Code Style
- 4 spaces for indentation
```

**输出** (agentskills.io):
```markdown
---
name: python
description: Python coding guidelines. Use when writing Python code.
version: 1.0.0
license: Apache-2.0
metadata:
  author: openclaw
  spec-version: "1.0"
tags: [python, coding, guidelines]
platforms: [openclaw, claude-code, cursor]
---

# Python Guidelines

## When to use this skill

Use this skill when the user needs to write or review Python code.

## Code Style
- 4 spaces for indentation
```

---

## 📝 转换报告

```json
{
  "timestamp": "2026-04-20T16:00:00+08:00",
  "direction": "openclaw-to-agentskills",
  "skills": {
    "python": {
      "status": "converted",
      "input": "~/.openclaw/workspace/skills/python",
      "output": "~/.agents/skills/python",
      "changes": {
        "added": ["version", "license", "metadata", "tags", "platforms"],
        "modified": ["description"],
        "removed": []
      }
    }
  },
  "validation": {
    "passed": true,
    "warnings": ["description 建议更具体"],
    "errors": []
  }
}
```

---

_版本：v0.1.0_  
_状态：开发中_
