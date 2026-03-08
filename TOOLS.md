# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

---

## 🌐 浏览器配置

### Windows Chrome (WSL2 环境)
- **路径**: `/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`
- **用途**: 打开网页、浏览器自动化

### 备用方案
- `xdg-open` - 未安装
- Firefox - 未安装

---

## 💻 后端开发环境

### Python
- **状态**: 待安装
- **学习计划**: 20:00-24:00 时段（数据分析、自动化）

### Java
- **状态**: 待学习
- **学习计划**: 根据 24 小时定向学习安排

### MySQL
- **状态**: 待学习
- **学习计划**: 根据 24 小时定向学习安排

---

## 🔧 已启用工具

| 工具 | 状态 | 用途 |
|:---|:---:|:---|
| `exec` | ✅ | 执行 shell 命令 |
| `browser` | ✅ | 浏览器控制 |
| `web_fetch` | ✅ | 网页内容获取 |
| `message` | ✅ | 消息发送 |
| `sessions_*` | ✅ | 会话管理 |
| `read` | ✅ | 文件读取 |
| `write` | ✅ | 文件写入 |
| `edit` | ✅ | 文件编辑 |

---

## 📚 ClawHub 技能（待安装）

```bash
# 核心技能
clawhub install python
clawhub install python-patterns
clawhub install writer
clawhub install summarize
clawhub install image

# 后端开发技能（待学习）
clawhub install java
clawhub install mysql
clawhub install database
```

---

## 🗄️ 目录结构

```
~/.openclaw/workspace/
├── config/              # 配置文件
│   ├── model-pools.json
│   ├── task-iron-law.md
│   └── self-evolution.md
├── scripts/             # 脚本文件（待创建）
├── data/                # 数据文件
│   ├── daily-reports/
│   ├── evolution-reports/
│   └── heartbeat-state.json
├── memory/              # 短期记忆
│   └── YYYY-MM-DD.md
└── logs/                # 日志文件
```

---

## ⏰ 定时任务（待配置）

```bash
# Heartbeat 检查（每 30 分钟）
openclaw cron add --name "heartbeat-check" --cron "*/30 * * * *" --system-event "heartbeat_check"

# 每日进化（22:00）
openclaw cron add --name "daily-evolution" --cron "0 22 * * *" --system-event "daily_evolution"

# 模型健康检查（每 6 小时）
openclaw cron add --name "model-health-check" --cron "0 */6 * * *" --system-event "model_health_check"

# 智能备份（每小时）
openclaw cron add --name "smart-backup" --cron "0 * * * *" --system-event "smart_backup_check"
```

---

## 📊 模型池配置

| 模型池 | 主模型 | 用途 |
|:---|:---|:---|
| **高速池** | bailian/qwen3.5-plus | 快速响应 |
| **智能池** | bailian/qwen3.5-plus | 复杂推理 |
| **文本池** | bailian/qwen3.5-plus | 长文本 |
| **视觉池** | bailian/qwen3.5-plus | 图片/视频 |

---

_最后更新：2026-03-08_
