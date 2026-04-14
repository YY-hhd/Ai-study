# 洛克王国自动采集器 - 快速启动指南

> **版本**: v1.0  
> **更新时间**: 2026-04-14

---

## 📋 前置要求

### 1. 硬件/软件环境

| 项目 | 要求 |
|:---|:---|
| **操作系统** | Windows 10/11, Linux, macOS |
| **Python** | 3.8+ |
| **ADB** | 已安装并添加到 PATH |
| **设备** | Android 模拟器 / 真机 / 云手机 |

### 2. 推荐模拟器

- **雷电模拟器** (推荐) - 性能好，ADB 稳定
- **夜神模拟器** - 多开支持好
- **MuMu 模拟器** - 网易官方，兼容性好
- **蓝叠模拟器** - 国际版稳定

---

## 🚀 5 分钟快速开始

### 步骤 1: 安装依赖

```bash
# 进入项目目录
cd roco-auto-farmer

# 创建虚拟环境 (推荐)
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 步骤 2: 连接设备

```bash
# 启动模拟器

# 检查设备连接
adb devices

# 应该看到类似输出:
# List of devices attached
# emulator-5554    device
```

### 步骤 3: 配置采集器

编辑 `config/settings.yaml`:

```yaml
device:
  type: "emulator"
  emulator_id: "emulator-5554"  # 改成你的设备 ID
  resolution: [1920, 1080]      # 根据模拟器设置
  
route:
  map: "lava_mine"    # 采集地图
  loop_count: 10      # 循环次数
```

### 步骤 4: 运行采集器

```bash
# 基础运行
python src/main.py

# 指定地图
python src/main.py --map lava_mine --loops 20

# 指定设备
python src/main.py --device emulator-5554
```

---

## 🎮 游戏内准备

### 1. 解锁骑宠

确保已解锁以下至少一只骑宠:

| 骑宠 | 解锁等级 | 获取方式 |
|:---|:---:|:---|
| 魔力猫 | 1 级 | 初始宠物进化 |
| 罗隐 | 10 级 | 主线任务捕捉 |
| 雪巨人 | 25 级 | 雪山区域捕捉 |
| 月牙雪熊 | 25 级 | 雪山区域捕捉 |

### 2. 技能配置

- 确保骑宠已学习 **"蓄力冲撞"** 技能
- 将冲撞技能放在快捷栏第 1 位

### 3. 推荐采集地图

| 地图 | 主要矿石 | 刷新时间 | 推荐等级 |
|:---|:---|:---:|:---:|
| 熔岩矿道 | 金矿、铜矿 | 3 分钟 | 15+ |
| 拉布朗矿山 | 铁矿 | 5 分钟 | 10+ |
| 寒霜裂谷 | 冰晶锥矿、金矿 | 4 分钟 | 25+ |

---

## ⚙️ 高级配置

### 多开组队模式

```bash
# 启动双开组队
python src/main.py --multi-instance 2 --team-sync
```

配置 `config/settings.yaml`:

```yaml
team:
  enable: true
  partner_device: "emulator-5555"
  role: "leader"  # leader 或 follower
```

### 防检测设置

```yaml
safety:
  anti_detect: true
  random_delay: [0.5, 2.0]  # 随机延迟范围 (秒)
  break_interval: 300        # 每 5 分钟休息
  max_runtime: 7200          # 最大运行 2 小时
```

### 自定义路线

1. 使用录制工具:
```bash
python scripts/record_route.py --map my_custom_map
```

2. 手动编辑 `config/routes/my_custom_map.json`

---

## 🛠️ 故障排除

### 问题 1: ADB 无法连接设备

```bash
# 解决方法:
# 1. 重启模拟器
# 2. 重启 ADB 服务
adb kill-server
adb start-server

# 3. 检查模拟器 ADB 设置 (开启 USB 调试)
```

### 问题 2: 矿石识别失败

```bash
# 解决方法:
# 1. 确保游戏画质设置为"高"
# 2. 截图测试识别
python scripts/capture_points.py

# 3. 如使用模板匹配，添加矿石模板到 src/vision/templates/
```

### 问题 3: 冲撞不生效

```
检查项:
□ 骑宠是否正确召唤
□ 冲撞技能是否在快捷栏
□ 技能等级是否足够
□ 网络是否延迟
```

---

## 📊 查看统计

运行结束后会自动显示统计:

```
==================================================
📊 采集统计摘要
==================================================
⏱️  运行时长：01:30:45
🔄 循环次数：10
📦 总采集数：87
   • 金矿：45
   • 铜矿：42
==================================================
```

日志文件位置：`logs/farmer_YYYY-MM-DD.log`

---

## ⚠️ 重要提醒

1. **账号安全**: 自动化可能违反游戏服务条款
2. **适度使用**: 建议每天不超过 4 小时
3. **防检测**: 开启随机延迟和休息间隔
4. **责任自负**: 封号风险自行承担

---

## 📚 下一步

- [ ] 训练 YOLO 矿石识别模型
- [ ] 录制自定义采集路线
- [ ] 配置多开组队
- [ ] 添加更多采集地图

---

_遇到问题？查看 README.md 获取详细文档_
