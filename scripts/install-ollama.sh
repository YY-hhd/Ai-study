#!/bin/bash
# Ollama 安装脚本 - Windows/WSL2 通用
# 创建时间：2026-04-08

set -e

echo "🦙 Ollama 安装脚本"
echo "=================="

# 检测系统
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "检测到 Windows 系统"
    echo ""
    echo "请使用 PowerShell 运行以下命令安装:"
    echo "  winget install Ollama.Ollama"
    echo ""
    echo "或下载安装包:"
    echo "  https://ollama.com/download/OllamaSetup.exe"
    exit 0
fi

# Linux/WSL2 安装
echo "检测到 Linux/WSL2 系统"
echo ""

# 检查是否已安装
if command -v ollama &> /dev/null; then
    echo "✅ Ollama 已安装"
    ollama --version
else
    echo "⏳ 正在安装 Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo "✅ Ollama 安装完成"
fi

# 启动服务
echo ""
echo "⏳ 启动 Ollama 服务..."
ollama serve &
sleep 3

# 验证服务
echo ""
echo "🔍 验证服务..."
curl -s http://localhost:11434/api/tags > /dev/null && echo "✅ 服务运行正常" || echo "❌ 服务启动失败"

# 推荐模型
echo ""
echo "📦 推荐下载的模型:"
echo "  ollama pull llama3.2:3b      # 轻量级（2GB 显存）"
echo "  ollama pull qwen2.5:7b       # 平衡型（4-6GB 显存）"
echo "  ollama pull qwen2.5:14b      # 高性能（8-10GB 显存）"
echo ""
echo "💡 提示：下载模型前请确保有足够显存"

echo ""
echo "🎉 安装完成！"
