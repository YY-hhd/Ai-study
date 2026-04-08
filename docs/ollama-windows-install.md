# Ollama Windows 安装指南

**创建时间**: 2026-04-08 14:26  
**适用**: Windows 主机 + WSL2 环境

---

## 📥 方案一：PowerShell 一键安装（推荐）

### 步骤 1: 打开 PowerShell（管理员）

按 `Win + X` → 选择 "Windows PowerShell (管理员)" 或 "终端 (管理员)"

### 步骤 2: 运行安装命令

```powershell
winget install Ollama.Ollama
```

或使用安装包：
```powershell
# 下载安装程序
Start-BitsTransfer -Source "https://ollama.com/download/OllamaSetup.exe" -Destination "$env:TEMP\OllamaSetup.exe"
& "$env:TEMP\OllamaSetup.exe"
```

### 步骤 3: 验证安装

```powershell
ollama --version
```

---

## 📦 下载推荐模型

```powershell
# 高速任务（轻量级，2GB 显存）
ollama pull llama3.2:3b

# 平衡型（4-6GB 显存）
ollama pull qwen2.5:7b

# 高性能（8-10GB 显存）
ollama pull qwen2.5:14b

# 代码专用
ollama pull codellama:7b
```

---

## 🔧 配置 WSL2 访问 Windows Ollama

### 步骤 1: 启动 Ollama 服务（Windows）

```powershell
# 确保服务运行
ollama serve
```

### 步骤 2: 配置环境变量（Windows）

在 PowerShell 中：
```powershell
$env:OLLAMA_HOST = "0.0.0.0:11434"
```

或永久设置：
```powershell
[System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "User")
```

### 步骤 3: 配置防火墙（允许 WSL2 访问）

```powershell
# 添加入站规则
New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow
```

### 步骤 4: 获取 Windows 主机 IP（从 WSL2）

在 WSL2 中运行：
```bash
# 获取 Windows 主机 IP
WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "Windows Host IP: $WINDOWS_HOST"

# 测试连接
curl http://$WINDOWS_HOST:11434/api/tags
```

### 步骤 5: 配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`，添加 Ollama provider：

```json
"ollama": {
  "baseUrl": "http://$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}'):11434/v1",
  "api": "openai-completions",
  "models": [
    {
      "id": "qwen2.5:7b",
      "name": "Ollama Qwen2.5 7B",
      "api": "openai-completions",
      "reasoning": false,
      "input": ["text"],
      "cost": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0},
      "contextWindow": 32768,
      "maxTokens": 4096
    }
  ]
}
```

---

## 🧪 测试连接

### Windows 主机测试
```powershell
curl http://localhost:11434/api/tags
ollama run qwen2.5:7b "你好"
```

### WSL2 测试
```bash
WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
curl http://$WINDOWS_HOST:11434/api/tags
```

---

## ⚡ 快速配置脚本（WSL2）

创建 `~/.openclaw/workspace/scripts/configure-ollama-wsl2.sh`:

```bash
#!/bin/bash
# 配置 WSL2 访问 Windows Ollama

set -e

echo "🦙 配置 WSL2 访问 Windows Ollama"
echo "================================"

# 获取 Windows 主机 IP
WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "Windows Host IP: $WINDOWS_HOST"

# 测试连接
echo ""
echo "🔍 测试连接..."
if curl -s "http://$WINDOWS_HOST:11434/api/tags" > /dev/null; then
    echo "✅ 连接成功"
    
    # 设置环境变量
    echo ""
    echo "📝 设置环境变量..."
    echo "export OLLAMA_HOST=http://$WINDOWS_HOST:11434" >> ~/.bashrc
    source ~/.bashrc
    
    echo "✅ 配置完成！"
    echo ""
    echo "可用模型:"
    curl -s "http://$WINDOWS_HOST:11434/api/tags" | jq -r '.models[].name'
else
    echo "❌ 连接失败"
    echo ""
    echo "请确保:"
    echo "1. Windows 主机已安装 Ollama"
    echo "2. Ollama 服务正在运行 (ollama serve)"
    echo "3. 防火墙允许 11434 端口"
    exit 1
fi
```

---

## 🔍 故障排查

### 问题 1: 无法下载模型
**解决**: 使用国内镜像
```powershell
$env:OLLAMA_HOST="https://ollama.ai"
ollama pull qwen2.5:7b
```

### 问题 2: WSL2 无法连接 Windows
**解决**: 检查防火墙
```powershell
# 查看防火墙规则
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Ollama*"}

# 添加允许规则
New-NetFirewallRule -DisplayName "Ollama WSL2" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow
```

### 问题 3: 显存不足
**解决**: 使用量化模型
```powershell
ollama pull qwen2.5:7b-q4_0  # 4bit 量化，显存减半
```

---

## 📊 完成检查清单

- [ ] Windows 主机安装 Ollama
- [ ] 下载至少 1 个模型（推荐 qwen2.5:7b）
- [ ] 配置防火墙允许 WSL2 访问
- [ ] WSL2 测试连接成功
- [ ] 更新 OpenClaw 配置
- [ ] 重启 OpenClaw 网关

---

_文档版本：v1.0_
