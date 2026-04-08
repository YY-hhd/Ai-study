# Ollama Windows 配置脚本
# 在 Windows PowerShell（管理员）中运行

Write-Host "🦙 Ollama Windows 配置" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green

# 1. 配置 Ollama 允许外部访问
Write-Host "`n📝 配置环境变量 (允许 WSL2 访问)..." -ForegroundColor Yellow
[System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "User")

# 2. 配置防火墙规则
Write-Host "`n🔒 配置防火墙规则..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Ollama WSL2" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# 3. 重启 Ollama 服务
Write-Host "`n🔄 重启 Ollama 服务..." -ForegroundColor Yellow
Stop-Process -Name "ollama" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process "ollama" -ArgumentList "serve"

Write-Host "`n✅ 配置完成！" -ForegroundColor Green
Write-Host "`n⏳ 等待 10 秒让服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 4. 验证服务
Write-Host "`n🔍 验证服务..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
    Write-Host "✅ 服务运行正常" -ForegroundColor Green
    Write-Host "`n可用模型:" -ForegroundColor Cyan
    $response.models | ForEach-Object { Write-Host "  - $($_.name)" }
} catch {
    Write-Host "❌ 服务启动失败，请手动运行：ollama serve" -ForegroundColor Red
}

Write-Host "`n📋 下一步:" -ForegroundColor Cyan
Write-Host "1. 在 WSL2 中运行测试命令验证连接"
Write-Host "2. 配置 OpenClaw Provider"
