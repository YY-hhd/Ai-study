# 多终端后端支持

**功能**: 支持多种后端执行环境，实现任务的分发和执行

---

## 📋 支持的后端类型

| 后端 | 状态 | 用途 | 配置复杂度 |
|:---|:---:|:---|:---:|
| **本地执行** | ✅ | 默认后端，直接执行 | 低 |
| **Docker** | ✅ | 容器化隔离执行 | 中 |
| **SSH 远程** | ✅ | 远程服务器执行 | 中 |
| **Modal** | ✅ | Serverless GPU/CPU | 高 |
| **Cloud Run** | ✅ | Google Cloud 无服务器 | 高 |
| **Kubernetes** | ⏳ | 集群调度 | 高 |

---

## 🔄 后端架构

```
任务调度器
    ├── 本地后端 (LocalBackend)
    ├── Docker 后端 (DockerBackend)
    ├── SSH 后端 (SSHBackend)
    ├── Modal 后端 (ModalBackend)
    └── Cloud Run 后端 (CloudRunBackend)
         ↓
    统一执行接口 (Executor)
         ↓
    结果返回 + 日志收集
```

---

## 🛠️ 使用方法

### 配置后端

```yaml
# ~/.openclaw/config/backends.yaml
default: local

backends:
  local:
    type: local
    enabled: true
    
  docker:
    type: docker
    enabled: true
    image: node:20-alpine
    memory: 2g
    cpu: 2
    
  ssh:
    type: ssh
    enabled: true
    host: remote.server.com
    port: 22
    user: deploy
    keyPath: ~/.ssh/id_rsa
    
  modal:
    type: modal
    enabled: false
    appId: xxx
    apiToken: ${MODAL_API_TOKEN}
    
  cloudrun:
    type: cloudrun
    enabled: false
    projectId: my-project
    region: us-central1
    service: task-executor
```

### 选择后端执行任务

```bash
# 使用默认后端
openclaw exec "python script.py"

# 指定后端
openclaw exec --backend docker "python script.py"
openclaw exec --backend ssh "python script.py"
openclaw exec --backend modal "train_model.py"

# 批量执行
openclaw exec --parallel --backends local,docker,ssh "test.sh"
```

### 后端健康检查

```bash
# 检查所有后端状态
openclaw backends health

# 检查特定后端
openclaw backends health --backend docker

# 自动故障转移测试
openclaw backends failover-test
```

---

## 📊 后端选择策略

### 自动选择规则

```yaml
rules:
  - condition: task.requires_gpu
    backend: modal
    
  - condition: task.memory > 4g
    backend: docker
    
  - condition: task.duration > 1h
    backend: ssh
    
  - condition: task.sensitive
    backend: local
    
  - default: local
```

### 负载均衡

```yaml
load_balancing:
  strategy: round_robin  # 或 least_loaded, latency_based
  health_check_interval: 30s
  failover: true
  max_retries: 3
```

---

## 🔐 安全特性

### 1. 凭证管理

```bash
# 安全存储 SSH 密钥
openclaw secrets add ssh-key --file ~/.ssh/id_rsa

# 安全存储 API Token
openclaw secrets add modal-token --prompt

# 查看已存储的凭证 (隐藏敏感信息)
openclaw secrets list
```

### 2. 网络隔离

```yaml
# Docker 网络隔离
docker:
  network: isolated
  allowed_hosts:
    - api.openai.com
    - registry.npmjs.org
  blocked_ports:
    - 22
    - 3306
```

### 3. 资源限制

```yaml
# 资源配额
quotas:
  docker:
    max_memory: 4g
    max_cpu: 4
    max_duration: 1h
    
  modal:
    max_gpu_hours: 10/day
    max_cost: $50/day
```

---

## 📈 监控指标

### 后端性能

```typescript
interface BackendMetrics {
  // 可用性
  uptime: number;           // 正常运行时间
  successRate: number;      // 成功率
  errorRate: number;        // 错误率
  
  // 性能
  avgLatency: number;       // 平均延迟
  p95Latency: number;       // 95 分位延迟
  p99Latency: number;       // 99 分位延迟
  
  // 资源
  cpuUsage: number;         // CPU 使用率
  memoryUsage: number;      // 内存使用率
  queueLength: number;      // 队列长度
  
  // 成本
  costPerTask: number;      // 单次任务成本
  dailyCost: number;        // 每日成本
}
```

### 实时监控

```bash
# 实时查看后端状态
openclaw backends watch

# 查看历史指标
openclaw backends metrics --backend docker --last 24h

# 导出监控数据
openclaw backends metrics export --format prometheus
```

---

## 🔧 故障排除

### 问题 1: Docker 后端无法启动

**症状**: `Error: Cannot connect to Docker daemon`

**解决**:
```bash
# 检查 Docker 服务
docker info

# 重启 Docker
sudo systemctl restart docker

# 检查权限
sudo usermod -aG docker $USER
```

### 问题 2: SSH 后端连接失败

**症状**: `Error: Connection refused`

**解决**:
```bash
# 测试 SSH 连接
ssh -i ~/.ssh/id_rsa user@host

# 检查 SSH 密钥权限
chmod 600 ~/.ssh/id_rsa

# 检查防火墙
telnet host 22
```

### 问题 3: Modal 后端认证失败

**症状**: `Error: Invalid API token`

**解决**:
```bash
# 重新配置 Modal token
openclaw secrets update modal-token --prompt

# 验证 token
modal token verify
```

---

## 📝 配置示例

### 完整配置示例

```yaml
# ~/.openclaw/config/backends.yaml
default: local

backends:
  local:
    type: local
    enabled: true
    max_concurrent: 4
    
  docker:
    type: docker
    enabled: true
    image: node:20-alpine
    memory: 2g
    cpu: 2
    volumes:
      - ~/.openclaw/workspace:/workspace
    network: bridge
    
  ssh:
    type: ssh
    enabled: true
    host: remote.server.com
    port: 22
    user: deploy
    keyPath: ~/.ssh/id_rsa
    working_dir: /home/deploy/tasks
    
  modal:
    type: modal
    enabled: true
    appId: app-xxx
    apiToken: ${MODAL_API_TOKEN}
    gpu: T4
    timeout: 3600
    
  cloudrun:
    type: cloudrun
    enabled: true
    projectId: my-project
    region: us-central1
    service: task-executor
    max_instances: 10

# 后端选择规则
routing:
  rules:
    - match: gpu_required
      backend: modal
    - match: memory_intensive
      backend: docker
    - match: long_running
      backend: ssh
    - default: local

# 监控配置
monitoring:
  health_check_interval: 30s
  metrics_retention: 7d
  alert_on_failure: true
```

---

_版本：v0.1.0_  
_状态：开发中_
