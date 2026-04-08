#!/bin/bash
# WSL2 测试 Ollama 连接脚本

set -e

echo "🦙 WSL2 测试 Ollama 连接"
echo "======================="

# 获取 Windows 主机 IP
WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo "Windows Host IP: $WINDOWS_HOST"

# 测试连接
echo ""
echo "🔍 测试连接 Ollama 服务..."
if curl -s "http://$WINDOWS_HOST:11434/api/tags" > /tmp/ollama-tags.json 2>&1; then
    echo "✅ 连接成功"
    echo ""
    echo "📦 可用模型:"
    cat /tmp/ollama-tags.json | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/  - /'
    
    # 设置环境变量
    echo ""
    echo "📝 设置环境变量..."
    echo "export OLLAMA_HOST=\"http://$WINDOWS_HOST:11434\"" >> ~/.bashrc
    export OLLAMA_HOST="http://$WINDOWS_HOST:11434"
    
    echo ""
    echo "🧪 测试模型运行..."
    if curl -s "http://$WINDOWS_HOST:11434/api/generate" \
      -H "Content-Type: application/json" \
      -d '{"model":"qwen2.5:7b","prompt":"你好","stream":false}' > /dev/null 2>&1; then
        echo "✅ 模型运行正常"
    else
        echo "⚠️ 模型测试失败（可能还在下载中）"
    fi
    
    echo ""
    echo "🎉 配置完成！"
    echo ""
    echo "📋 下一步:"
    echo "1. 配置 OpenClaw Provider (config/ollama-provider-patch.json)"
    echo "2. 重启 OpenClaw 网关"
else
    echo "❌ 连接失败"
    echo ""
    echo "请确保:"
    echo "1. Windows 主机已运行 ollama-windows-config.ps1"
    echo "2. Ollama 服务正在运行 (ollama serve)"
    echo "3. 防火墙允许 11434 端口"
    exit 1
fi
