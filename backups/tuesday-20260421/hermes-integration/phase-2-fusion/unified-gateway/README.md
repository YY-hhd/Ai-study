# 统一网关架构

**功能**: 支持 30+ 消息平台的统一网关层

---

## 📋 支持的平台

### 即时通讯 (IM)
| 平台 | 状态 | 协议 | 功能 |
|:---|:---:|:---|:---|
| **Discord** | ✅ | WebSocket | 消息/语音/频道 |
| **Slack** | ✅ | WebSocket | 消息/文件/线程 |
| **Telegram** | ✅ | Bot API | 消息/文件/群组 |
| **WhatsApp** | ✅ | Business API | 消息/媒体 |
| **Signal** | ✅ | 本地桥接 | 消息/文件 |
| **微信** | ⏳ | 企业微信 | 消息/小程序 |

### 邮件
| 平台 | 状态 | 协议 |
|:---|:---:|:---|
| **SMTP** | ✅ | SMTP/IMAP |
| **Gmail** | ✅ | OAuth2 |
| **Outlook** | ✅ | OAuth2 |

### 社交媒体
| 平台 | 状态 | API |
|:---|:---:|:---|
| **Twitter** | ✅ | API v2 |
| **微博** | ⏳ | Open API |

---

## 🔄 架构设计

```
统一网关 (Unified Gateway)
    ├── 平台适配器层 (Platform Adapters)
    │   ├── Discord Adapter
    │   ├── Slack Adapter
    │   ├── Telegram Adapter
    │   └── ...
    ├── 消息标准化层 (Message Normalization)
    │   ├── 统一消息格式
    │   └── 事件转换
    └── 路由层 (Routing)
        ├── 入站路由
        └── 出站路由
```

---

## 🛠️ 使用方法

### 配置平台连接

```yaml
# ~/.openclaw/config/gateways.yaml
gateways:
  discord:
    enabled: true
    token: ${DISCORD_BOT_TOKEN}
    intents:
      - messages
      - message_content
    
  telegram:
    enabled: true
    botToken: ${TELEGRAM_BOT_TOKEN}
    
  slack:
    enabled: true
    botToken: ${SLACK_BOT_TOKEN}
    appToken: ${SLACK_APP_TOKEN}
```

### 发送消息

```bash
# 发送到特定平台
openclaw message send --platform discord --channel 123 "Hello Discord!"
openclaw message send --platform telegram --chat 456 "Hello Telegram!"

# 广播到所有平台
openclaw message broadcast "Hello everyone!"

# 发送文件
openclaw message send --platform slack --file report.pdf "Q3 Report"
```

---

## 📊 统一消息格式

```typescript
interface UnifiedMessage {
  id: string;
  platform: string;
  channelId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  attachments?: Attachment[];
  timestamp: string;
  metadata: {
    threadId?: string;
    replyTo?: string;
    reactions?: Reaction[];
  };
}
```

---

_版本：v0.1.0_  
_状态：设计完成_
