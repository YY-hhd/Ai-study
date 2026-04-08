# Ollama 本地模型整合方案

**创建时间**: 2026-04-08 14:02  
**目标**: 在 OpenClaw 中整合 Ollama 本地模型，优化 Token 预算

---

## 📋 实施步骤

### 步骤 1: 安装 Ollama

#### Windows (主机)
```powershell
# 下载安装程序
winget install Ollama.Ollama

# 或使用安装包
# https://ollama.com/download/OllamaSetup.exe
```

#### WSL2 (可选，推荐 Windows 主机安装)
```bash
# WSL2 安装脚本
curl -fsSL https://ollama.com/install.sh | sh
```

---

### 步骤 2: 推荐模型下载

```bash
# 高速任务（替代 qwen-turbo）
ollama pull qwen2.5:7b          # 7B 参数，约 4GB 显存
ollama pull llama3.2:3b         # 3B 参数，约 2GB 显存（轻量）

# 智能任务（替代 qwen-plus）
ollama pull qwen2.5:14b         # 14B 参数，约 9GB 显存
ollama pull llama3.1:8b         # 8B 参数，约 5GB 显存

# 代码专用
ollama pull codellama:7b        # 代码生成
ollama pull deepseek-coder:6.7b # 代码专用

# 中文优化
ollama pull qwen2.5:7b-instruct   # 指令遵循更好
```

---

### 步骤 3: 配置 OpenClaw

#### 3.1 添加 Ollama Provider

编辑 `~/.openclaw/openclaw.json`，在 `models.providers` 中添加：

```json
"ollama": {
  "baseUrl": "http://localhost:11434/v1",
  "api": "openai-completions",
  "models": [
    {
      "id": "qwen2.5:7b",
      "name": "Ollama Qwen2.5 7B",
      "api": "openai-completions",
      "reasoning": false,
      "input": ["text"],
      "cost": {
        "input": 0,
        "output": 0,
        "cacheRead": 0,
        "cacheWrite": 0
      },
      "contextWindow": 32768,
      "maxTokens": 4096
    },
    {
      "id": "qwen2.5:14b",
      "name": "Ollama Qwen2.5 14B",
      "api": "openai-completions",
      "reasoning": false,
      "input": ["text"],
      "cost": {
        "input": 0,
        "output": 0,
        "cacheRead": 0,
        "cacheWrite": 0
      },
      "contextWindow": 32768,
      "maxTokens": 4096
    },
    {
      "id": "llama3.2:3b",
      "name": "Ollama Llama3.2 3B",
      "api": "openai-completions",
      "reasoning": false,
      "input": ["text"],
      "cost": {
        "input": 0,
        "output": 0,
        "cacheRead": 0,
        "cacheWrite": 0
      },
      "contextWindow": 8192,
      "maxTokens": 2048
    }
  ]
}
```

#### 3.2 更新模型池配置

编辑 `config/model-pools.json`，添加本地池：

```json
{
  "version": 3,
  "budget": { ... },
  "pools": {
    "local": {
      "name": "本地池",
      "primary": "ollama/qwen2.5:7b",
      "fallback": "bailian/qwen-turbo",
      "description": "本地运行 - 零成本、隐私安全",
      "costLevel": "free",
      "maxTokens": 4000
    },
    "fast": {
      "name": "高速池",
      "primary": "ollama/llama3.2:3b",
      "fallback": "bailian/qwen-turbo",
      "description": "快速响应 - 优先本地",
      "costLevel": "low",
      "maxTokens": 2000
    },
    "smart": {
      "name": "智能池",
      "primary": "ollama/qwen2.5:14b",
      "fallback": "bailian/qwen-plus",
      "description": "复杂推理 - 优先本地",
      "costLevel": "medium",
      "maxTokens": 8000
    },
    "text": {
      "name": "文本池",
      "primary": "bailian/qwen-plus",
      "fallback": "bailian/qwen-turbo",
      "description": "长文本处理 - 云端",
      "costLevel": "medium",
      "maxTokens": 10000
    },
    "vision": {
      "name": "视觉池",
      "primary": "bailian/qwen-vl-plus",
      "fallback": "bailian/qwen-turbo",
      "description": "图片/视频 - 云端",
      "costLevel": "high",
      "maxTokens": 5000
    }
  },
  "routing": {
    "rules": [
      {
        "keywords": ["快速", "简单", "闲聊", "quick", "simple", "hello", "hi"],
        "pool": "fast"
      },
      {
        "keywords": ["分析", "推理", "编程", "代码", "analyze", "reason", "code", "debug"],
        "pool": "smart"
      },
      {
        "keywords": ["文档", "长文本", "写作", "翻译", "document", "write", "translate", "article"],
        "pool": "text"
      },
      {
        "keywords": ["图片", "视频", "看图", "图像", "image", "video", "vision", "draw"],
        "pool": "vision"
      }
    ],
    "localFirst": true,
    "budgetAware": true,
    "budgetRules": [
      {
        "condition": "dailyUsed > 0.8 * dailyLimit",
        "action": "forceUsePool",
        "targetPool": "local"
      },
      {
        "condition": "dailyUsed > 0.95 * dailyLimit",
        "action": "alertUser"
      }
    ]
  }
}
```

---

### 步骤 4: 测试配置

```bash
# 测试 Ollama 服务
curl http://localhost:11434/api/tags

# 测试模型运行
ollama run qwen2.5:7b "你好，测试"

# 测试 OpenAI 兼容 API
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

---

### 步骤 5: 重启 OpenClaw

```bash
openclaw gateway restart
```

---

## 📊 预期效果

| 指标 | 整合前 | 整合后 |
|:---|:---:|:---:|
| **日常 Token 消耗** | ~2K/天 | ~500/天（-75%） |
| **月度预算使用** | ~60K/月 | ~15K/月（-75%） |
| **响应速度** | 1-3 秒 | 0.5-2 秒（本地） |
| **隐私安全** | 云端处理 | 本地处理 |
| **离线可用** | ❌ | ✅ |

---

## ⚠️ 注意事项

### 硬件要求
| 模型 | 显存需求 | 内存需求 |
|:---|:---:|:---:|
| llama3.2:3b | 2GB | 4GB |
| qwen2.5:7b | 4-6GB | 8GB |
| qwen2.5:14b | 8-10GB | 16GB |
| llama3.1:8b | 5-7GB | 12GB |

### 性能优化
1. **GPU 加速**: 确保 NVIDIA 显卡驱动已安装
2. **WSL2 配置**: 增加显存分配（`.wslconfig`）
3. **模型量化**: 使用 `:q4_0` 量化版本减少显存

```bash
# 量化模型示例
ollama pull qwen2.5:7b-q4_0  # 4bit 量化，显存减半
```

---

## 🔧 故障排查

### Ollama 服务未启动
```bash
# Windows
ollama serve

# Linux/WSL2
systemctl status ollama
systemctl start ollama
```

### 模型下载失败
```bash
# 检查网络
curl -I https://ollama.com

# 使用镜像（国内）
export OLLAMA_HOST=https://ollama.ai
```

### OpenClaw 无法连接
```bash
# 检查 Ollama API
curl http://localhost:11434/api/tags

# 检查防火墙
netstat -an | grep 11434
```

---

## 📈 后续优化

1. **自动切换**: 本地模型不可用时自动切云端
2. **缓存策略**: 常用提示词本地缓存
3. **模型热切换**: 根据任务类型动态加载模型
4. **性能监控**: 记录本地 vs 云端 响应时间对比

---

_文档版本：v1.0_  
_下次更新：根据实际使用情况优化配置_
