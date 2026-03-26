# Remote CDP 配置指南

## 📋 配置概述

**目标**: 在 WSL2 环境中通过 Remote CDP 控制 Windows Chrome 浏览器

**架构**:
```
┌─────────────────┐     CDP over HTTP     ┌─────────────────┐
│   WSL2 OpenClaw │ ────────────────────> │  Windows Chrome │
│   172.20.240.x  │   http://172.20.240.1:18800  │   localhost     │
└─────────────────┘                       └─────────────────┘
```

---

## 🔧 配置步骤

### 步骤 1: 启动 Chrome (带远程调试)

**方法 A: 使用启动脚本** (推荐)

在 Windows 上双击运行:
```
workspace/scripts/start-chrome-remote.bat
```

**方法 B: 手动命令行**

在 Windows CMD 或 PowerShell 中运行:
```cmd
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
    --remote-debugging-port=18800 ^
    --remote-debugging-address=0.0.0.0 ^
    --no-first-run ^
    --no-default-browser-check ^
    --user-data-dir="C:\temp\chrome-openclaw"
```

---

### 步骤 2: 验证 Chrome 启动

在 WSL2 中运行:
```bash
curl http://172.20.240.1:18800/json/version
```

**成功响应示例**:
```json
{
  "Browser": "Chrome/120.0.0.0",
  "Protocol-Version": "1.3",
  "User-Agent": "...",
  "V8-Version": "...",
  "WebKit-Version": "...",
  "webSocketDebuggerUrl": "ws://172.20.240.1:18800/devtools/..."
}
```

---

### 步骤 3: 测试 OpenClaw Browser 工具

```bash
cd /home/yyreal/.openclaw
openclaw browser status --profile windows-remote
openclaw browser open https://www.baidu.com
openclaw browser snapshot
```

---

## 📝 配置详情

### openclaw.json 配置

```json
{
  "browser": {
    "enabled": true,
    "defaultProfile": "windows-remote",
    "profiles": {
      "windows-remote": {
        "cdpUrl": "http://172.20.240.1:18800",
        "color": "#0066CC",
        "attachOnly": true
      }
    }
  }
}
```

### 配置说明

| 字段 | 值 | 说明 |
|:---|:---|:---|
| `cdpUrl` | `http://172.20.240.1:18800` | Windows 主机 IP + 调试端口 |
| `attachOnly` | `true` | 仅附加到现有 Chrome，不尝试启动 |
| `color` | `#0066CC` | 浏览器 UI 颜色标识 |
| `defaultProfile` | `windows-remote` | 默认使用此 profile |

---

## 🔍 故障排查

### 问题 1: Chrome 无法启动

**症状**: 双击脚本无反应

**解决**:
1. 检查 Chrome 路径是否正确
2. 以管理员身份运行脚本
3. 手动在 CMD 中运行命令查看错误

---

### 问题 2: WSL2 无法连接 CDP

**症状**: `curl http://172.20.240.1:18800/json/version` 超时

**解决**:
1. 确认 Chrome 已启动带 `--remote-debugging-port=18800`
2. 确认 Chrome 已启动带 `--remote-debugging-address=0.0.0.0`
3. 检查 Windows 防火墙是否允许 18800 端口
4. 获取正确的 Windows 主机 IP: `ip route | grep default | awk '{print $3}'`

---

### 问题 3: 防火墙阻止连接

**症状**: 连接被拒绝

**解决**: 在 Windows 上运行 (管理员 PowerShell):
```powershell
New-NetFirewallRule -DisplayName "Chrome Remote Debugging" -Direction Inbound -Protocol TCP -LocalPort 18800 -Action Allow
```

---

### 问题 4: Browser 工具报错 "timed out"

**症状**: `browser open` 或 `browser snapshot` 超时

**解决**:
1. 确认 Chrome 正在运行
2. 确认 CDP URL 可访问: `curl http://172.20.240.1:18800/json`
3. 重启网关：`openclaw gateway restart`
4. 检查 profile 状态：`openclaw browser status --profile windows-remote`

---

## 🎯 使用示例

### 打开网页
```bash
openclaw browser open https://www.baidu.com
```

### 获取页面快照
```bash
openclaw browser snapshot --interactive
```

### 点击元素
```bash
# 先获取快照获取 ref
openclaw browser snapshot --interactive
# 然后点击 (替换 <ref> 为实际 ref)
openclaw browser click <ref>
```

### 输入文本
```bash
openclaw browser type <ref> "搜索内容"
```

### 截图
```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
```

---

## 📊 当前配置状态

| 项目 | 配置值 |
|:---|:---|
| Windows 主机 IP | `172.20.240.1` |
| CDP 端口 | `18800` |
| CDP URL | `http://172.20.240.1:18800` |
| 默认 Profile | `windows-remote` |
| 启动脚本 | `workspace/scripts/start-chrome-remote.bat` |

---

## ⚠️ 注意事项

1. **Chrome 必须保持运行** - 关闭 Chrome 会导致 CDP 连接断开
2. **首次启动需手动** - WSL2 无法自动启动 Windows Chrome
3. **防火墙配置** - 确保 18800 端口在 Windows 防火墙中允许
4. **安全提示** - 远程调试端口不应暴露在公网

---

_最后更新：2026-03-26_
