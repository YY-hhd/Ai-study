# 洛克王国世界 - 自动跑图采集 AI 工具

> **项目状态**: 设计方案  
> **创建时间**: 2026-04-14  
> **技术栈**: Python + OpenCV + ADB + YOLO

---

## 🎯 功能目标

自动化完成洛克王国世界的跑图采集任务，包括：
- ✅ 自动寻路到采集点
- ✅ 自动识别矿石/采集物
- ✅ 自动骑宠冲撞采集
- ✅ 自动取消僵直（摇杆 + 双击）
- ✅ 自动拾取掉落物
- ✅ 多开组队双倍收益
- ✅ 智能路线规划

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户界面层 (GUI)                      │
│              - 配置面板 / 地图选择 / 启动控制             │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   核心控制层 (Controller)                │
│  - 状态机管理  - 任务调度  - 异常处理  - 日志记录        │
└─────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  图像识别层   │ │  路径规划层   │ │  操作执行层   │
    │  - YOLO 模型   │ │  - 地图导航   │ │  - ADB 控制   │
    │  - OpenCV    │ │  - 采集点定位  │ │  - 触摸模拟   │
    │  - 模板匹配   │ │  - 路线优化   │ │  - 按键映射   │
    └──────────────┘ └──────────────┘ └──────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   设备适配层 (Device)                    │
│      - Android ADB  - 模拟器  - 云手机 (桃心/红手指)      │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
roco-auto-farmer/
├── README.md                 # 项目说明
├── requirements.txt          # Python 依赖
├── config/
│   ├── settings.yaml        # 主配置文件
│   ├── map_points.json      # 采集点坐标
│   └── routes/              # 预设路线
│       ├── lava_mine.json   # 熔岩矿道路线
│       ├── frost_valley.json # 寒霜裂谷路线
│       └── labron.json      # 拉布朗矿山路线
├── src/
│   ├── __init__.py
│   ├── main.py              # 程序入口
│   ├── controller/
│   │   ├── __init__.py
│   │   ├── state_machine.py # 状态机管理
│   │   ├── task_scheduler.py # 任务调度
│   │   └── logger.py        # 日志系统
│   ├── vision/
│   │   ├── __init__.py
│   │   ├── ore_detector.py  # 矿石识别
│   │   ├── minimap_nav.py   # 小地图导航
│   │   ├── ui_detector.py   # UI 元素识别
│   │   └── models/          # YOLO 模型文件
│   │       └── ore_detection.pt
│   ├── pathfinding/
│   │   ├── __init__.py
│   │   ├── route_planner.py # 路线规划
│   │   └── waypoint_nav.py  # 航点导航
│   ├── device/
│   │   ├── __init__.py
│   │   ├── adb_controller.py # ADB 控制
│   │   ├── touch_simulator.py # 触摸模拟
│   │   └── multi_instance.py # 多开管理
│   └── actions/
│       ├── __init__.py
│       ├── mount_rush.py    # 骑宠冲撞
│       ├── cancel_lag.py    # 取消僵直
│       ├── pickup.py        # 自动拾取
│       └── team_sync.py     # 组队同步
├── scripts/
│   ├── train_model.py       # 训练识别模型
│   ├── capture_points.py    # 采集点标注工具
│   └── record_route.py      # 路线录制工具
├── logs/                    # 运行日志
└── screenshots/             # 截图缓存
```

---

## 🔧 核心功能实现

### 1. 矿石识别模块 (`ore_detector.py`)

```python
import cv2
import numpy as np
from ultralytics import YOLO

class OreDetector:
    """矿石识别器 - 支持 YOLO + 模板匹配双模式"""
    
    def __init__(self, model_path='src/vision/models/ore_detection.pt'):
        self.yolo_model = YOLO(model_path) if model_path else None
        self.templates = self._load_templates()
    
    def detect(self, screenshot: np.ndarray) -> list:
        """
        检测屏幕中的矿石
        返回：[(类型，置信度，中心坐标), ...]
        """
        results = []
        
        # YOLO 检测
        if self.yolo_model:
            yolo_results = self.yolo_model(screenshot, conf=0.5)
            for box in yolo_results[0].boxes:
                results.append({
                    'type': self._class_to_ore(int(box.cls)),
                    'confidence': float(box.conf),
                    'bbox': box.xyxy[0].cpu().numpy(),
                    'center': self._get_center(box.xyxy[0])
                })
        
        # 模板匹配兜底
        if not results:
            results = self._template_match(screenshot)
        
        return results
    
    def _get_center(self, bbox) -> tuple:
        """计算边界框中心"""
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) / 2, (y1 + y2) / 2)
```

### 2. 骑宠冲撞模块 (`mount_rush.py`)

```python
import time
from device.adb_controller import ADBController

class MountRush:
    """骑宠冲撞采集器"""
    
    def __init__(self, adb: ADBController):
        self.adb = adb
        self.mount_skills = {
            '罗隐': {'skill_pos': (800, 600), 'speed': 1.0},
            '魔力猫': {'skill_pos': (800, 600), 'speed': 1.0},
            '雪巨人': {'skill_pos': (800, 600), 'speed': 1.2},
            '月牙雪熊': {'skill_pos': (800, 600), 'speed': 1.2}
        }
    
    def rush_to_ore(self, ore_center: tuple) -> bool:
        """
        骑宠冲撞矿石
        参数：ore_center - 矿石中心坐标 (x, y)
        """
        # 1. 召唤骑宠
        self.adb.tap(900, 500)  # 骑宠按钮位置
        time.sleep(0.5)
        
        # 2. 选择冲撞技能
        self.adb.tap(800, 600)  # 冲撞技能位置
        time.sleep(0.3)
        
        # 3. 朝向矿石方向滑动
        screen_center = (960, 540)  # 假设 1920x1080
        dx = ore_center[0] - screen_center[0]
        dy = ore_center[1] - screen_center[1]
        self.adb.swipe(screen_center, (screen_center[0] + dx*0.8, screen_center[1] + dy*0.8), 300)
        
        # 4. 等待冲撞完成
        time.sleep(1.5)
        
        # 5. 取消僵直 (关键技巧！)
        self._cancel_lag()
        
        return True
    
    def _cancel_lag(self):
        """取消冲撞后摇僵直 - 核心技巧"""
        # 轻推摇杆 (任意方向微偏)
        self.adb.swipe((500, 800), (520, 800), 100)
        time.sleep(0.05)
        # 双击跳跃
        self.adb.tap(1400, 700)
        time.sleep(0.1)
        self.adb.tap(1400, 700)
```

### 3. 路线规划模块 (`route_planner.py`)

```python
import json
from typing import List, Dict
from dataclasses import dataclass

@dataclass
class Waypoint:
    """航点"""
    x: float  # 归一化坐标 0-1
    y: float
    action: str  # 'move', 'collect', 'teleport'
    ore_type: str = None

class RoutePlanner:
    """智能路线规划器"""
    
    def __init__(self, map_name: str):
        self.map_name = map_name
        self.waypoints = self._load_route(map_name)
    
    def _load_route(self, map_name: str) -> List[Waypoint]:
        """加载预设路线"""
        route_file = f'config/routes/{map_name}.json'
        with open(route_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return [Waypoint(**wp) for wp in data['waypoints']]
    
    def get_optimal_route(self, collected: set) -> List[Waypoint]:
        """
        获取最优采集路线
        参数：collected - 已采集的矿石类型集合
        返回：优化后的航点列表
        """
        # 过滤已采集点，按距离排序
        remaining = [wp for wp in self.waypoints if wp.ore_type not in collected]
        
        # 简单的最近邻算法
        if not remaining:
            return self.waypoints
        
        route = [remaining[0]]
        unvisited = remaining[1:]
        
        while unvisited:
            last = route[-1]
            nearest = min(unvisited, key=lambda wp: self._distance(last, wp))
            route.append(nearest)
            unvisited.remove(nearest)
        
        return route
    
    def _distance(self, wp1: Waypoint, wp2: Waypoint) -> float:
        """计算航点间距离"""
        return ((wp1.x - wp2.x)**2 + (wp1.y - wp2.y)**2)**0.5
```

### 4. ADB 控制器 (`adb_controller.py`)

```python
import subprocess
import time

class ADBController:
    """ADB 设备控制器"""
    
    def __init__(self, device_id: str = None):
        self.device_id = device_id
        self._connect()
    
    def _connect(self):
        """连接设备"""
        if self.device_id:
            self._run(f'adb -s {self.device_id} shell')
        else:
            self._run('adb shell')
    
    def _run(self, command: str) -> str:
        """执行 ADB 命令"""
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.stdout
    
    def tap(self, x: int, y: int):
        """点击屏幕"""
        self._run(f'adb shell input tap {x} {y}')
    
    def swipe(self, start: tuple, end: tuple, duration: int = 300):
        """滑动屏幕"""
        x1, y1 = start
        x2, y2 = end
        self._run(f'adb shell input swipe {x1} {y1} {x2} {y2} {duration}')
    
    def screenshot(self, save_path: str = None) -> np.ndarray:
        """截取屏幕"""
        if save_path:
            self._run(f'adb shell screencap -p /sdcard/screenshot.png')
            self._run(f'adb pull /sdcard/screenshot.png {save_path}')
        # 直接返回 numpy 数组
        # ... (实现略)
    
    def get_resolution(self) -> tuple:
        """获取屏幕分辨率"""
        output = self._run('adb shell wm size')
        # 解析输出，返回 (width, height)
```

---

## 📋 配置文件示例

### `config/settings.yaml`

```yaml
# 洛克王国自动采集配置

device:
  type: "emulator"  # emulator / android / cloud
  emulator_id: "emulator-5554"
  resolution: [1920, 1080]
  
vision:
  model: "yolov8n"  # YOLO 模型版本
  confidence: 0.6
  use_template_fallback: true

mount:
  preferred: "罗隐"  # 优先使用的骑宠
  alternatives: ["魔力猫", "雪巨人", "月牙雪熊"]
  
route:
  map: "lava_mine"  # 默认采集地图
  loop_count: 10     # 循环次数
  auto_switch_map: true  # 自动切换地图
  
team:
  enable: false     # 是否启用组队
  partner_device: "emulator-5555"
  role: "leader"    # leader / follower
  
safety:
  anti_detect: true
  random_delay: [0.5, 2.0]
  break_interval: 300  # 每 5 分钟休息
  max_runtime: 7200    # 最大运行 2 小时
```

### `config/routes/lava_mine.json`

```json
{
  "name": "熔岩矿道",
  "description": "火山主城左侧，金矿/铜矿密集区",
  "refresh_time": 180,
  "waypoints": [
    {"x": 0.25, "y": 0.35, "action": "teleport", "note": "传送点"},
    {"x": 0.30, "y": 0.40, "action": "collect", "ore_type": "金矿"},
    {"x": 0.35, "y": 0.42, "action": "collect", "ore_type": "铜矿"},
    {"x": 0.40, "y": 0.38, "action": "collect", "ore_type": "金矿"},
    {"x": 0.45, "y": 0.35, "action": "collect", "ore_type": "铜矿"},
    {"x": 0.50, "y": 0.40, "action": "collect", "ore_type": "金矿"},
    {"x": 0.48, "y": 0.50, "action": "collect", "ore_type": "铜矿"},
    {"x": 0.42, "y": 0.55, "action": "collect", "ore_type": "金矿"},
    {"x": 0.35, "y": 0.52, "action": "collect", "ore_type": "铜矿"},
    {"x": 0.30, "y": 0.45, "action": "collect", "ore_type": "金矿"}
  ]
}
```

---

## 🚀 快速开始

### 1. 环境准备

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 安装 ADB (如未安装)
# Windows: 下载 platform-tools 并添加到 PATH
# Linux: sudo apt install adb
```

### 2. 训练矿石识别模型

```bash
# 使用标注工具采集截图
python scripts/capture_points.py

# 标注矿石位置 (使用 LabelImg)
# 然后训练 YOLO 模型
python scripts/train_model.py --data dataset.yaml --epochs 100
```

### 3. 运行采集脚本

```bash
# 单开模式
python src/main.py --map lava_mine --loops 10

# 多开组队模式
python src/main.py --map lava_mine --multi-instance 2 --team-sync

# 指定设备
python src/main.py --device emulator-5554 --config config/settings.yaml
```

---

## ⚠️ 风险提示

1. **账号安全**: 自动化可能违反游戏服务条款，请谨慎使用
2. **检测风险**: 建议开启防检测模式（随机延迟、模拟人工操作）
3. **使用频率**: 避免 24 小时连续运行，建议设置休息间隔
4. **责任自负**: 本工具仅供学习研究，封号风险自行承担

---

## 📝 开发计划

| 阶段 | 功能 | 优先级 | 状态 |
|:---|:---|:---:|:---:|
| 阶段一 | ADB 基础控制 + 手动脚本 | P0 | ⏳ 待开发 |
| 阶段二 | 矿石识别 (模板匹配) | P0 | ⏳ 待开发 |
| 阶段三 | 骑宠冲撞自动化 | P0 | ⏳ 待开发 |
| 阶段四 | 小地图导航 | P1 | ⏳ 待开发 |
| 阶段五 | YOLO 模型训练 | P1 | ⏳ 待开发 |
| 阶段六 | 智能路线规划 | P1 | ⏳ 待开发 |
| 阶段七 | 多开组队同步 | P2 | ⏳ 待开发 |
| 阶段八 | GUI 配置界面 | P2 | ⏳ 待开发 |

---

## 🛠️ 依赖清单 (`requirements.txt`)

```txt
# 核心依赖
opencv-python>=4.8.0
numpy>=1.24.0
ultralytics>=8.0.0  # YOLOv8
pyyaml>=6.0

# ADB 控制
adbutils>=2.0.0

# 图像处理
Pillow>=10.0.0

# 日志
loguru>=0.7.0

# GUI (可选)
customtkinter>=5.2.0

# 开发工具
pytest>=7.0.0
black>=23.0.0
```

---

## 📚 参考资料

- [洛克王国世界挖矿教程](https://wap.pp.cn/news/865283.html)
- [桃心云手机挂机方案](https://www.txyunos.com/help/detail-2957)
- [资源点分布图](http://news.17173.com/z/lkwgsj2024/content/11172025/142432375.shtml)
- [GitHub CDKey 自动兑换工具](https://github.com/SkyBlue997/Roco-Kingdom-CDKey-Auto-Exchanger)

---

_最后更新：2026-04-14_
