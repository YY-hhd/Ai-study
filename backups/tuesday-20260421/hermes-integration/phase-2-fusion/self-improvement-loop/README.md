# 自改进学习循环

**功能**: 实现 AI 助手从经验中持续学习和改进的能力

---

## 📋 核心概念

### 什么是自改进学习循环？

AI 助手通过以下循环持续改进：

```
1. 执行任务 → 2. 收集经验 → 3. 分析学习 → 4. 更新技能 → 5. 评估效果
       ↑                                                        ↓
       └────────────────────────────────────────────────────────┘
```

### Hermes vs OpenClaw 实现对比

| 特性 | Hermes Agent | OpenClaw | 整合方案 |
|:---|:---|:---|:---|
| **经验存储** | SQLite + 向量数据库 | JSON 文件 | SQLite (统一) |
| **学习触发** | 任务完成后自动 | Heartbeat 定时 | 混合触发 |
| **技能更新** | 自动修改技能文件 | 手动 + 建议 | 半自动 (需确认) |
| **效果评估** | RL 奖励信号 | 用户反馈 | 混合评估 |

---

## 🔄 学习循环流程

### 阶段 1: 经验收集

```typescript
interface Experience {
  id: string;
  timestamp: string;
  taskId: string;
  taskType: 'coding' | 'writing' | 'analysis' | 'conversation';
  outcome: 'success' | 'partial' | 'failure';
  duration: number;  // 毫秒
  tokensUsed: number;
  userFeedback?: UserFeedback;
  context: {
    sessionKey: string;
    model: string;
    toolsUsed: string[];
    skillsApplied: string[];
  };
  artifacts: {
    input: string;
    output: string;
    intermediateSteps?: string[];
  };
}
```

### 阶段 2: 学习分析

```typescript
interface LearningInsight {
  id: string;
  experienceIds: string[];  // 关联的经验
  pattern: 'success_pattern' | 'failure_pattern' | 'optimization';
  category: 'skill' | 'tool' | 'workflow' | 'communication';
  description: string;
  confidence: number;  // 0.0 ~ 1.0
  impact: 'high' | 'medium' | 'low';
  recommendation: {
    action: 'add_skill' | 'modify_skill' | 'remove_skill' | 'adjust_workflow';
    details: string;
    priority: number;  // 1-10
  };
}
```

### 阶段 3: 技能更新

```typescript
interface SkillUpdate {
  skillName: string;
  changeType: 'add_section' | 'modify_section' | 'add_example' | 'add_antipattern';
  content: string;
  rationale: string;  // 更新理由
  sourceExperiences: string[];  // 来源经验 ID
  status: 'pending_review' | 'approved' | 'rejected';
  reviewedBy?: string;  // 审核者 (用户)
  reviewedAt?: string;
}
```

---

## 🛠️ 使用方法

### 启用学习循环

```bash
# 在 OpenClaw 配置中启用
openclaw config patch --path agents.defaults.learning --value '{"enabled": true}'

# 设置学习触发条件
openclaw config patch --path agents.defaults.learning.triggers --value '{
  "onTaskComplete": true,
  "onUserFeedback": true,
  "heartbeatInterval": "30m"
}'
```

### 查看学习状态

```bash
# 查看最近学习的经验
node learning-loop.js experiences list --limit 10

# 查看待审核的技能更新
node learning-loop.js updates pending

# 查看学习统计
node learning-loop.js stats
```

### 审核技能更新

```bash
# 查看待审核更新
node learning-loop.js updates pending

# 批准更新
node learning-loop.js updates approve <update-id>

# 拒绝更新
node learning-loop.js updates reject <update-id> --reason "理由"

# 批量批准
node learning-loop.js updates approve-all --category skill
```

---

## 📊 学习策略

### 成功模式识别

当某个技能连续成功 3 次以上时：

```yaml
pattern: success_pattern
skill: python
successCount: 5
conditions:
  - taskType: coding
  - complexity: medium
  - userFeedback: positive
insight: "使用 pytest 进行测试的技能在中等复杂度任务中表现优秀"
action: reinforce  # 强化该技能的使用优先级
```

### 失败模式分析

当某个技能失败 2 次以上时：

```yaml
pattern: failure_pattern
skill: mysql
failureCount: 3
commonErrors:
  - "SQL syntax error near 'SELECT'"
  - "Table does not exist"
insight: "MySQL 技能在处理多表查询时容易出错"
action: add_antipattern  # 添加反模式警告
```

### 优化建议生成

基于经验数据分析：

```yaml
pattern: optimization
category: workflow
currentApproach: "先搜索网络，再读取本地文件"
optimizedApproach: "先读取本地文件，失败再搜索网络"
reason: "本地文件成功率 85%，网络搜索成功率 60%，且本地更快"
estimatedImprovement: "减少 40% 延迟，提升 25% 成功率"
```

---

## 🔐 安全机制

### 1. 审核机制

所有技能更新默认需要用户审核：

```
AI 建议 → 用户审核 → 批准/拒绝 → 应用更新
```

### 2. 回滚机制

每次更新前自动备份：

```bash
# 查看更新历史
node learning-loop.js history --skill python

# 回滚到特定版本
node learning-loop.js rollback --skill python --to 2026-04-20T10:00:00Z
```

### 3. 影响评估

更新前评估潜在影响：

```typescript
interface ImpactAssessment {
  affectedSkills: string[];
  affectedWorkflows: string[];
  riskLevel: 'low' | 'medium' | 'high';
  rollbackComplexity: 'easy' | 'medium' | 'hard';
  estimatedBenefit: number;  // 0.0 ~ 1.0
}
```

---

## 📈 效果评估

### 指标追踪

```typescript
interface LearningMetrics {
  // 学习速度
  experiencesCollected: number;
  insightsGenerated: number;
  skillsUpdated: number;
  
  // 学习效果
  successRateImprovement: number;  // 成功率提升
  efficiencyImprovement: number;   // 效率提升
  userSatisfactionChange: number;  // 满意度变化
  
  // 学习质量
  approvedRate: number;     // 批准率
  rollbackRate: number;     // 回滚率
  falsePositiveRate: number; // 误报率
}
```

### A/B 测试

```bash
# 启用 A/B 测试
node learning-loop.js ab-test start --skill python --variant new-strategy

# 查看测试结果
node learning-loop.js ab-test results --test-id abc123

# 结束测试并应用优胜方案
node learning-loop.js ab-test conclude --test-id abc123 --apply-winner
```

---

## 🎯 学习优先级

### 高优先级学习场景

1. **重复失败** - 同一技能连续失败 2 次以上
2. **用户明确反馈** - 用户给出正面/负面反馈
3. **新技能应用** - 新安装技能的前 10 次使用
4. **关键任务** - 代码提交、配置修改等关键操作

### 低优先级学习场景

1. **日常对话** - 普通闲聊
2. **一次性任务** - 不重复的特殊任务
3. **外部因素失败** - 网络问题、API 限制等

---

## 📝 配置示例

```yaml
# ~/.openclaw/config/learning.yaml
enabled: true

# 触发条件
triggers:
  onTaskComplete: true
  onUserFeedback: true
  heartbeatInterval: "30m"
  minExperiencesForAnalysis: 5

# 学习策略
strategies:
  successThreshold: 3      # 成功 3 次识别为模式
  failureThreshold: 2      # 失败 2 次触发分析
  confidenceThreshold: 0.7 # 置信度阈值
  
# 审核设置
review:
  requireApproval: true    # 需要用户审核
  autoApproveLowRisk: true # 自动批准低风险更新
  maxUpdatesPerDay: 10     # 每日最多更新次数
  
# 存储设置
storage:
  type: sqlite
  path: ~/.openclaw/learning.db
  retentionDays: 90        # 经验保留 90 天
```

---

## 🔧 故障排除

### 问题 1: 学习循环未触发

**症状**: 经验收集了但没有生成洞察

**解决**:
```bash
# 检查配置
openclaw config get agents.defaults.learning

# 手动触发分析
node learning-loop.js analyze --force

# 查看日志
tail -f ~/.openclaw/logs/learning.log
```

### 问题 2: 技能更新被拒绝

**症状**: AI 建议的更新总是被拒绝

**解决**:
```bash
# 查看拒绝原因
node learning-loop.js history --skill <skill-name>

# 调整学习策略
openclaw config patch --path agents.defaults.learning.strategies.confidenceThreshold --value 0.8
```

---

_版本：v0.1.0_  
_状态：开发中_
