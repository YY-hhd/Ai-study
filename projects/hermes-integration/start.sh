#!/bin/bash

# Hermes × OpenClaw 整合框架启动脚本
# 版本：v1.0.0

echo "🚀 Hermes × OpenClaw Integration Framework v1.0.0"
echo "=================================================="
echo ""

# 检查依赖
echo "📦 检查依赖..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! npm list sqlite3 &> /dev/null; then
    echo "⚠️  安装依赖..."
    npm install sqlite3 js-yaml
fi

echo "✅ 依赖检查完成"
echo ""

# 显示可用模块
echo "📋 可用模块:"
echo ""
echo "  阶段一：互操作层"
echo "  ├── 1. config-migrator    - 配置迁移工具"
echo "  ├── 2. memory-converter   - 记忆转换器"
echo "  ├── 3. skill-adapter      - 技能兼容层"
echo "  ├── 4. api-key-sync       - API Key 共享"
echo "  └── 5. session-sync       - 会话历史互通"
echo ""
echo "  阶段二：功能融合"
echo "  ├── 6. self-improvement   - 自改进学习循环"
echo "  ├── 7. multi-backend      - 多终端后端"
echo "  ├── 8. fts5-search        - FTS5 记忆搜索"
echo "  ├── 9. unified-gateway    - 统一网关"
echo "  ├── 10. honcho-modeling   - 用户建模"
echo "  └── 11. atropos-rl        - RL 环境"
echo ""

# 启动学习循环（核心功能）
echo "🎯 启动核心功能：自改进学习循环"
echo ""

# 初始化学习数据库
node phase-2-fusion/self-improvement-loop/learning-loop.ts collect 2>&1 | head -5

echo ""
echo "✅ 框架已就绪!"
echo ""
echo "使用示例:"
echo "  node phase-2-fusion/self-improvement-loop/learning-loop.ts analyze"
echo "  node phase-2-fusion/fts5-search/search.ts search \"Python\""
echo "  node phase-1-interoperability/skill-adapter/adapter.ts validate ~/.openclaw/workspace/skills/python"
echo ""
echo "文档:"
echo "  cat RELEASE.md"
echo "  cat phase-3-unified/INTEGRATION.md"
echo ""
