# Honcho 用户建模

**功能**: 基于用户交互历史构建用户画像和偏好模型

---

## 📋 核心概念

### 用户画像维度

1. **技术偏好**
   - 编程语言偏好
   - 工具链偏好
   - 代码风格偏好

2. **沟通风格**
   - 正式/非正式
   - 简洁/详细
   - 技术深度

3. **工作模式**
   - 活跃时段
   - 任务类型分布
   - 响应时间偏好

---

## 🔄 建模流程

```
用户交互 → 特征提取 → 模式识别 → 画像更新 → 应用优化
```

---

## 📊 用户画像示例

```json
{
  "userId": "user-123",
  "preferences": {
    "codeStyle": "concise",
    "language": ["Python", "TypeScript"],
    "responseLength": "medium",
    "formality": "casual"
  },
  "patterns": {
    "activeHours": [9, 10, 14, 15, 20, 21],
    "commonTasks": ["coding", "debugging", "documentation"],
    "avgSessionLength": "45m"
  },
  "learnedBehaviors": {
    "prefersExamples": true,
    "likesTests": true,
    "avoidLongExplanations": true
  }
}
```

---

_版本：v0.1.0_  
_状态：设计完成_
