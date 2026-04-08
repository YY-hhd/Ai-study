# Exa Search - 自动记录使用量的搜索技能

## 📋 技能说明

此技能封装了 Exa 搜索功能，**自动记录每次搜索的使用量**，并在额度紧张时提醒用户。

---

## 🚀 使用方法

### 方式 1：命令行脚本（推荐）

```bash
# 搜索并自动记录
node ~/.openclaw/workspace/scripts/exa-search.js "搜索关键词"

# 查看状态
node ~/.openclaw/workspace/scripts/exa-search.js --status

# 检查是否超额
node ~/.openclaw/workspace/scripts/exa-search.js --check
```

### 方式 2：OpenClaw 工具调用

在 OpenClaw 对话中，使用以下格式：

```
/exa-search 搜索关键词
```

或直接在消息中说：
```
用 Exa 搜索：搜索关键词
```

---

## 📦 文件结构

```
~/.openclaw/workspace/
├── scripts/
│   ├── exa-usage-tracker.js    # 使用量追踪核心脚本
│   └── exa-search.js           # 搜索封装脚本
├── data/
│   ├── exa-usage.json          # 使用量数据（自动生成）
│   └── exa-usage-config.json   # 配置文件
├── logs/
│   └── exa-usage.log           # 使用日志（自动生成）
└── docs/
    └── exa-usage-guide.md      # 完整使用文档
```

---

## ⚠️ 警告级别

| 级别 | 阈值 | 行为 |
|:---|:---:|:---|
| ✅ OK | 0-49% | 正常搜索 |
| ⚠️ NOTICE | 50-79% | 提醒关注 |
| 🚨 WARNING | 80-94% | 建议减少使用 |
| 🛑 CRITICAL | 95-100% | 5 秒倒计时后可取消 |

---

## 🔄 自动化集成

### 在 OpenClaw 中使用

创建一个简单的技能文件，自动调用追踪脚本：

```markdown
# skills/exa-search/SKILL.md

## 触发条件
用户消息包含：
- "用 Exa 搜索"
- "/exa-search"
- "搜索 XXX"（当 Exa 为默认 provider 时）

## 执行步骤
1. 运行 `node ~/.openclaw/workspace/scripts/exa-search.js --check`
2. 如果返回 OK/WARNING/CRITICAL，继续搜索
3. 如果返回 EXCEEDED，提示用户使用替代方案
4. 执行 web_search 工具
5. 运行 `node ~/.openclaw/workspace/scripts/exa-search.js log "查询词"`
```

---

## 📊 监控命令

```bash
# 查看今日使用量
node ~/.openclaw/workspace/scripts/exa-usage-tracker.js status

# 查看使用日志
tail -f ~/.openclaw/workspace/logs/exa-usage.log

# 检查是否可以使用 Exa
node ~/.openclaw/workspace/scripts/exa-search.js --check && echo "可以使用"
```

---

## 💡 最佳实践

### ✅ 推荐做法
1. **始终通过 wrapper 脚本搜索** - 自动记录
2. **定期检查状态** - 避免意外超额
3. **优先使用 web_fetch** - 已知 URL 直接抓取
4. **批量搜索** - 一次查询涵盖多个关键词

### ❌ 避免做法
1. 直接调用 web_search 不记录
2. 短时间内大量搜索
3. 忽略警告继续搜索
4. 用相同关键词重复搜索（有缓存）

---

## 🔧 配置选项

编辑 `~/.openclaw/workspace/data/exa-usage-config.json`:

```json
{
  "monthlyLimit": 1000,
  "warningThresholds": {
    "notice": 50,
    "warning": 80,
    "critical": 95
  },
  "notifications": {
    "enabled": true
  },
  "autoDisable": {
    "enabled": false,  // 设为 true 可在超额时自动禁用
    "threshold": 100
  }
}
```

---

## 📈 使用统计

查看历史使用记录：

```bash
# 查看完整日志
cat ~/.openclaw/workspace/logs/exa-usage.log

# 查看今日使用次数
grep "$(date +%Y-%m-%d)" ~/.openclaw/workspace/logs/exa-usage.log | wc -l

# 查看本月总使用量
node ~/.openclaw/workspace/scripts/exa-usage-tracker.js status | grep "当前使用"
```

---

## 🆘 故障排除

### 问题 1：脚本无法执行
```bash
# 检查 Node.js 是否安装
node --version

# 检查脚本权限
chmod +x ~/.openclaw/workspace/scripts/*.js
```

### 问题 2：使用量未记录
```bash
# 手动测试追踪脚本
node ~/.openclaw/workspace/scripts/exa-usage-tracker.js log "test"

# 检查数据文件
cat ~/.openclaw/workspace/data/exa-usage.json
```

### 问题 3：警告通知未发送
```bash
# 检查 cron 任务状态
openclaw cron list

# 手动触发检查
openclaw cron run <cron-job-id>
```

---

_最后更新：2026-04-03_
