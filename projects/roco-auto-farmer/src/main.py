"""
洛克王国世界 - 自动跑图采集 AI 工具
主程序入口
"""

import argparse
import time
import signal
import sys
from pathlib import Path
from loguru import logger

from src.controller.state_machine import StateMachine
from src.controller.task_scheduler import TaskScheduler
from src.device.adb_controller import ADBController
from src.vision.ore_detector import OreDetector
from src.pathfinding.route_planner import RoutePlanner
from src.actions.mount_rush import MountRush


class AutoFarmer:
    """自动采集器主类"""
    
    def __init__(self, config_path: str = 'config/settings.yaml'):
        self.config = self._load_config(config_path)
        self.running = False
        
        # 初始化组件
        self.adb = ADBController(self.config['device'].get('emulator_id'))
        self.detector = OreDetector()
        self.planner = RoutePlanner(self.config['route']['map'])
        self.mount_rush = MountRush(self.adb)
        
        # 状态机
        self.state_machine = StateMachine()
        self.scheduler = TaskScheduler(self.config)
        
        # 设置日志
        self._setup_logger()
    
    def _load_config(self, path: str) -> dict:
        """加载配置文件"""
        import yaml
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def _setup_logger(self):
        """配置日志"""
        logger.remove()
        logger.add(
            'logs/farmer_{time:YYYY-MM-DD}.log',
            rotation='00:00',
            retention='7 days',
            level='INFO',
            format='{time:HH:mm:ss} | {level} | {message}'
        )
        logger.add(sys.stdout, level='INFO')
    
    def start(self):
        """启动采集"""
        logger.info("🚀 启动洛克王国自动采集器")
        logger.info(f"📍 采集地图：{self.config['route']['map']}")
        logger.info(f"🔄 循环次数：{self.config['route']['loop_count']}")
        
        # 显示防检测设置
        safety = self.config.get('safety', {})
        if safety.get('anti_detect', False):
            logger.info("🛡️  防检测模式：已启用")
            logger.info(f"   • 随机延迟：{safety.get('random_delay', {}).get('min', 0.5)}-{safety.get('random_delay', {}).get('max', 2.0)}秒")
            logger.info(f"   • 定时休息：每{int(safety.get('break_interval', 300)/60)}分钟")
        
        self.running = True
        self._register_signals()
        self.scheduler.start()  # 启动调度器
        
        try:
            self._run_loop()
        except KeyboardInterrupt:
            logger.info("⏹️  用户中断，停止采集")
        finally:
            self.stop()
            self.scheduler.print_summary()  # 打印统计摘要
    
    def stop(self):
        """停止采集"""
        self.running = False
        logger.info("✅ 采集器已停止")
    
    def _register_signals(self):
        """注册信号处理"""
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """信号处理"""
        logger.info(f"收到信号 {signum}，准备停止...")
        self.running = False
    
    def _run_loop(self):
        """主循环 - 增强防检测版"""
        max_loops = self.config['route']['loop_count']
        
        while self.running:
            # 检查是否应该停止（运行时长限制）
            if self.scheduler.should_stop():
                logger.info("⏰ 达到运行限制，停止采集")
                break
            
            self.scheduler.record_loop()
            logger.info(f"🔄 开始第 {self.scheduler.loop_count}/{max_loops} 轮采集")
            
            # 获取最优路线
            route = self.planner.get_optimal_route(collected=set())
            
            for waypoint in route:
                if not self.running:
                    break
                
                # 执行航点动作
                self._execute_waypoint(waypoint)
                
                # 应用随机延迟（防检测）
                self.scheduler.apply_random_delay(f"航点 {waypoint.action}")
                
                # 随机暂停（模拟用户查看）
                self.scheduler.apply_random_pause()
            
            # 检查是否需要定时休息（每 5 分钟）
            if self.scheduler.should_break():
                self.scheduler.take_break()
        
        logger.info(f"✅ 完成 {self.scheduler.loop_count} 轮采集")
    
    def _execute_waypoint(self, waypoint):
        """执行航点动作"""
        if waypoint.action == 'teleport':
            logger.info(f"📍 传送到 {waypoint.note}")
            # 执行传送操作
            self._teleport_to(waypoint.x, waypoint.y)
        
        elif waypoint.action == 'collect':
            logger.info(f"⛏️  采集 {waypoint.ore_type}")
            # 检测并采集矿石
            self._collect_ore(waypoint.ore_type)
    
    def _teleport_to(self, x: float, y: float):
        """传送到指定位置"""
        # 打开地图
        self.adb.tap(1800, 100)  # 地图按钮位置
        time.sleep(0.5)
        
        # 点击传送点
        width, height = self.config['device']['resolution']
        self.adb.tap(int(x * width), int(y * height))
        time.sleep(2.0)  # 等待传送完成
        
        # 关闭地图
        self.adb.tap(1800, 100)
        time.sleep(0.5)
    
    def _collect_ore(self, ore_type: str):
        """采集矿石"""
        # 截取屏幕
        screenshot = self.adb.screenshot()
        
        # 检测矿石
        ores = self.detector.detect(screenshot)
        
        if ores:
            # 找到最近的指定类型矿石
            target = None
            for ore in ores:
                if ore['type'] == ore_type:
                    target = ore
                    break
            
            if target:
                logger.info(f"✨ 发现 {ore_type}，置信度：{target['confidence']:.2f}")
                # 骑宠冲撞采集
                success = self.mount_rush.rush_to_ore(target['center'])
                if success:
                    self.scheduler.record_collection(ore_type, 1)
                time.sleep(1.0 / self.scheduler.speed_factor)  # 应用速度波动
            else:
                logger.warning(f"⚠️  未找到 {ore_type}，继续下一个点")
        else:
            logger.warning("⚠️  未检测到矿石，可能已刷新或未识别")


def main():
    parser = argparse.ArgumentParser(description='洛克王国自动采集器')
    parser.add_argument('--config', default='config/settings.yaml', help='配置文件路径')
    parser.add_argument('--map', default=None, help='采集地图 (覆盖配置)')
    parser.add_argument('--loops', type=int, default=None, help='循环次数 (覆盖配置)')
    parser.add_argument('--device', default=None, help='设备 ID')
    
    args = parser.parse_args()
    
    farmer = AutoFarmer(args.config)
    
    if args.map:
        farmer.config['route']['map'] = args.map
    if args.loops:
        farmer.config['route']['loop_count'] = args.loops
    if args.device:
        farmer.config['device']['emulator_id'] = args.device
    
    farmer.start()


if __name__ == '__main__':
    main()
