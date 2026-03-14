# ClawHub 技能安装状态

**更新时间**: 2026-03-08 15:56

---

## ⚠️ 当前状态：速率限制

**问题**: ClawHub API 速率限制（Rate limit exceeded）

**原因**: 短时间内多次请求触发限制

---

## 📋 计划安装技能

| 技能 | 用途 | 状态 |
|:---|:---|:---:|
| `writer` | 内容写作 | ⏳ 等待 |
| `summarize` | 文本摘要 | ⏳ 等待 |
| `python-executor` | Python 代码执行 | ⏳ 等待（需--force） |

---

## 🔧 解决方案

### 方案 1: 等待后重试（推荐）
**等待时间**: 10-15 分钟

```bash
# 15 分钟后重试
clawhub install writer
clawhub install summarize
```

### 方案 2: 检查登录状态
```bash
clawhub whoami
clawhub login
```

### 方案 3: 使用 inspect 预览
```bash
clawhub inspect writer
clawhub inspect summarize
```

---

## 📊 已安装技能

**当前状态**: 无已安装技能

```bash
$ clawhub list
No installed skills.
```

---

## 🎯 重试命令

```bash
# 等待 15 分钟后执行：
clawhub install writer
clawhub install summarize
clawhub install python-executor --force
```

---

_创建时间：2026-03-08 15:56_
