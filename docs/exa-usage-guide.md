# Exa API 使用量追踪 - 使用说明

## 📦 已创建文件

| 文件 | 用途 |
|:---|:---|
| `scripts/exa-usage-tracker.js` | 主追踪脚本 |
| `scripts/exa-search.js` | 搜索封装脚本（自动记录） |
| `data/exa-usage.json` | 使用量数据（自动生成） |
| `data/exa-usage-config.json` | 配置文件 |
| `logs/exa-usage.log` | 使用日志（自动生成） |
| `skills/exa-search/SKILL.md` | 技能文档 |

---

## 🚀 快速使用

### 方式 1：使用封装脚本（推荐）
```bash
# 搜索并自动记录使用量
node ~/.openclaw/workspace/scripts/exa-search.js "搜索关键词"

# 查看状态
node ~/.openclaw/workspace/scripts/exa-search.js --status

# 检查是否超额
node ~/.openclaw/workspace/scripts/exa-search.js --check
```

### 方式 2：使用追踪脚本（手动）
```bash
# 查看当前状态
node ~/.openclaw/workspace/scripts/exa-usage-tracker.js status

# 记录一次使用
node ~/.openclaw/workspace/scripts/exa-usage-tracker.js log "搜索关键词"

# 检查是否超额（自动化用）
node ~/.openclaw/workspace/scripts/exa-usage-tracker.js check
# 退出码：0=OK, 1=超额，2=严重，3=警告

# 重置计数器
node ~/.openclaw/workspace/scripts/exa-usage-tracker.js reset
```

---

## ⚠️ 警告阈值

| 级别 | 阈值 | 动作 |
|:---|:---:|:---|
| ✅ OK | 0-49% | 正常使用 |
| ⚠️ NOTICE | 50-79% | 关注使用量 |
| 🚨 WARNING | 80-94% | 减少非必要搜索 |
| 🛑 CRITICAL | 95-100% | 立即切换方案 |

---

## 🔄 自动检查

已配置每日自动检查 cron 任务：
- **频率**: 每 24 小时
- **任务 ID**: `b74a7a3e-8e5f-4b2b-8c6a-b75f6a293daf`
- **通知方式**: Feishu 消息

---

## 📊 替代方案优先级

当 Exa 额度耗尽时，按以下优先级使用：

| 优先级 | 方案 | 工具 | 限制 |
|:---:|:---|:---|:---|
| 1 | 抓取已知 URL | `web_fetch` | 无限制 |
| 2 | 手动搜索 + AI 分析 | 浏览器 + 对话 | 无限制 |
| 3 | SearXNG 自托管 | `web_search` | 需部署 |

---

## 💡 节省额度技巧

1. **优先用 web_fetch** - 知道 URL 直接抓取
2. **批量搜索** - 一次查询涵盖多个关键词
3. **缓存复用** - 相同查询 15 分钟内返回缓存
4. **精确查询** - 减少重复搜索

---

## 📝 示例工作流

```bash
# 1. 搜索前检查状态
node ~/.openclaw/workspace/scripts/exa-usage-tracker.js check

# 2. 如果 OK，执行搜索并记录
web_search "一念逍遥 攻略"
node ~/.openclaw/workspace/scripts/exa-usage-tracker.js log "一念逍遥 攻略"

# 3. 如果 WARNING/CRITICAL，改用 web_fetch
web_fetch "https://example.com/guide"
```

---

## 🔧 配置选项

编辑 `data/exa-usage-config.json`:

```json
{
  "monthlyLimit": 1000,      // 每月限额
  "resetDay": 1,             // 每月重置日
  "warningThresholds": {
    "notice": 50,
    "warning": 80,
    "critical": 95
  },
  "notifications": {
    "enabled": true,         // 是否启用通知
    "channels": ["webchat"]  // 通知渠道
  },
  "autoDisable": {
    "enabled": false,        // 是否自动禁用（谨慎开启）
    "threshold": 100
  }
}
```

---

_最后更新：2026-04-03_
