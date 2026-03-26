#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Token 预算追踪脚本 - 百炼 Lite 套餐
检查每日/每月 token 使用情况，触发预警
"""

import json
import os
from datetime import datetime

WORKSPACE = os.path.expanduser("~/.openclaw/workspace")
STATE_FILE = os.path.join(WORKSPACE, "data/heartbeat-state.json")

# 预算限制（百炼 Lite 基础套餐）
DAILY_LIMIT = 50000
MONTHLY_LIMIT = 1000000
ALERT_THRESHOLD = 0.8
CRITICAL_THRESHOLD = 0.95

def load_state():
    """加载状态文件"""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_state(state):
    """保存状态文件"""
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

def check_budget(state):
    """检查预算状态"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # 初始化或重置每日统计
    if "tokenBudget" not in state:
        state["tokenBudget"] = {
            "daily": {
                "limit": DAILY_LIMIT,
                "used": 0,
                "remaining": DAILY_LIMIT,
                "usagePercent": 0,
                "lastReset": f"{today}T00:00:00Z",
                "nextReset": f"{tomorrow()}T00:00:00Z"
            },
            "monthly": {
                "limit": MONTHLY_LIMIT,
                "used": 0,
                "remaining": MONTHLY_LIMIT,
                "usagePercent": 0,
                "resetDay": 1
            },
            "alerts": {
                "daily80Percent": False,
                "daily95Percent": False,
                "monthly80Percent": False
            }
        }
    
    budget = state["tokenBudget"]
    daily = budget["daily"]
    alerts = budget["alerts"]
    
    # 检查是否需要重置每日统计
    if daily.get("lastReset", "")[:10] != today:
        daily["used"] = 0
        daily["remaining"] = DAILY_LIMIT
        daily["usagePercent"] = 0
        daily["lastReset"] = f"{today}T00:00:00Z"
        daily["nextReset"] = f"{tomorrow()}T00:00:00Z"
        # 重置预警
        alerts["daily80Percent"] = False
        alerts["daily95Percent"] = False
    
    # 计算使用百分比
    daily["usagePercent"] = round(daily["used"] / DAILY_LIMIT * 100, 2)
    
    # 检查预警
    status = "✅ 正常"
    if daily["usagePercent"] >= 95:
        alerts["daily95Percent"] = True
        status = "🚨 紧急 - 预算即将耗尽"
    elif daily["usagePercent"] >= 80:
        alerts["daily80Percent"] = True
        status = "⚠️ 预警 - 预算使用超过 80%"
    
    return {
        "date": today,
        "daily_used": daily["used"],
        "daily_limit": DAILY_LIMIT,
        "daily_remaining": daily["remaining"],
        "usage_percent": daily["usagePercent"],
        "status": status,
        "alerts": alerts
    }

def tomorrow():
    """返回明天日期"""
    from datetime import timedelta
    return (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

def add_token_usage(tokens: int):
    """添加 token 使用量"""
    state = load_state()
    if "tokenBudget" not in state:
        state["tokenBudget"] = {
            "daily": {"used": 0, "limit": DAILY_LIMIT},
            "monthly": {"used": 0, "limit": MONTHLY_LIMIT}
        }
    
    state["tokenBudget"]["daily"]["used"] += tokens
    state["tokenBudget"]["monthly"]["used"] += tokens
    
    # 更新剩余量
    state["tokenBudget"]["daily"]["remaining"] = max(
        0, DAILY_LIMIT - state["tokenBudget"]["daily"]["used"]
    )
    state["tokenBudget"]["monthly"]["remaining"] = max(
        0, MONTHLY_LIMIT - state["tokenBudget"]["monthly"]["used"]
    )
    
    save_state(state)
    return check_budget(state)

def main():
    """主函数"""
    state = load_state()
    result = check_budget(state)
    
    print("=" * 50)
    print("📊 百炼 Lite Token 预算状态")
    print("=" * 50)
    print(f"日期：{result['date']}")
    print(f"状态：{result['status']}")
    print(f"已用：{result['daily_used']:,} / {result['daily_limit']:,} tokens")
    print(f"剩余：{result['daily_remaining']:,} tokens")
    print(f"使用率：{result['usage_percent']}%")
    print("=" * 50)
    
    if result['usage_percent'] >= 80:
        print("\n⚠️  建议：")
        print("- 使用高速池（qwen-turbo）处理简单任务")
        print("- 避免长文本和复杂推理")
        print("- 压缩上下文，减少 token 消耗")
    
    save_state(state)
    return result

if __name__ == "__main__":
    main()
