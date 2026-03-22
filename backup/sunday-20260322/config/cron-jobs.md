# 定时任务配置记录

**配置时间**: 2026-03-08 15:52

---

## ✅ 已配置定时任务（4 个）

| ID | 名称 | 计划 | 下次运行 | 状态 |
|:---|:---|:---|:---|:---:|
| e122b1fe | heartbeat-check | `*/30 * * * *` (每 30 分钟) | 7 分钟后 | ✅ idle |
| 1648ea89 | smart-backup | `0 * * * *` (每小时) | 12 分钟后 | ✅ idle |
| b9933a8f | model-health-check | `0 */6 * * *` (每 6 小时) | 2 小时后 | ✅ idle |
| 38bf7bed | daily-evolution | `0 22 * * *` (每天 22:00) | 6 小时后 | ✅ idle |

---

## 📋 任务说明

### 1. heartbeat-check（每 30 分钟）
- **功能**: Heartbeat 记忆维护检查
- **系统事件**: `heartbeat_check`
- **检查项**:
  - 紧急事项（邮件/日历/待办）
  - 记忆整理
  - 日志清理
  - 提醒事项

### 2. smart-backup（每小时）
- **功能**: 智能备份
- **系统事件**: `smart_backup_check`
- **备份内容**: 核心配置文件、记忆文件
- **策略**: 7 天轮换

### 3. model-health-check（每 6 小时）
- **功能**: 模型池健康检查
- **系统事件**: `model_health_check`
- **检查项**: 模型可用性、响应时间

### 4. daily-evolution（每天 22:00）
- **功能**: 每日进化报告
- **系统事件**: `daily_evolution`
- **输出**: 学习总结、技能固化建议

---

## ⏳ ClawHub 技能安装

**状态**: 遇到速率限制，稍后重试

**计划安装技能**:
- `writer` - 内容写作
- `summarize` - 文本摘要
- `python-executor` - Python 代码执行（需--force）
- `code-executor` - 通用代码执行（需--force）

**安装命令**:
```bash
clawhub install writer
clawhub install summarize
clawhub install python-executor --force
```

---

## 🔧 管理命令

```bash
# 查看定时任务
openclaw cron list

# 禁用任务
openclaw cron disable <id>

# 启用任务
openclaw cron enable <id>

# 删除任务
openclaw cron remove <id>
```

---

_配置时间：2026-03-08 15:52_
