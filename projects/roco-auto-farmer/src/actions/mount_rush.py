"""
骑宠冲撞采集器
"""

import time
import random
from loguru import logger
from src.device.adb_controller import ADBController


class MountRush:
    """骑宠冲撞采集器"""
    
    # 骑宠配置 (技能位置、冲撞速度)
    MOUNT_CONFIG = {
        '罗隐': {'skill_pos': (800, 600), 'speed': 1.0, 'unlock_level': 10},
        '魔力猫': {'skill_pos': (800, 600), 'speed': 1.0, 'unlock_level': 1},
        '雪巨人': {'skill_pos': (800, 600), 'speed': 1.2, 'unlock_level': 25},
        '月牙雪熊': {'skill_pos': (800, 600), 'speed': 1.2, 'unlock_level': 25}
    }
    
    def __init__(self, adb: ADBController, resolution: tuple = (1920, 1080)):
        self.adb = adb
        self.resolution = resolution
        self.width, self.height = resolution
        
        # UI 位置配置 (基于 1920x1080 归一化)
        self.ui_positions = {
            'mount_button': (0.47, 0.85),  # 骑宠按钮
            'rush_skill': (0.42, 0.65),    # 冲撞技能
            'jump_button': (0.73, 0.85),   # 跳跃按钮
            'joystick_center': (0.26, 0.85) # 摇杆中心
        }
    
    def rush_to_ore(self, ore_center: tuple, mount_name: str = '罗隐') -> bool:
        """
        骑宠冲撞矿石
        
        参数:
            ore_center: 矿石中心坐标 (x, y)
            mount_name: 骑宠名称
        
        返回:
            bool: 是否成功
        """
        logger.debug(f"⚔️  使用 {mount_name} 冲撞矿石 {ore_center}")
        
        try:
            # 1. 召唤骑宠
            self._summon_mount(mount_name)
            time.sleep(0.5)
            
            # 2. 激活冲撞技能
            self._activate_rush_skill()
            time.sleep(0.3)
            
            # 3. 朝向矿石方向滑动
            self._rush_direction(ore_center)
            
            # 4. 等待冲撞完成
            time.sleep(1.5)
            
            # 5. 取消僵直 (核心技巧！)
            self._cancel_lag()
            
            logger.debug("✅ 冲撞采集完成")
            return True
            
        except Exception as e:
            logger.error(f"❌ 冲撞失败：{e}")
            return False
    
    def _summon_mount(self, mount_name: str):
        """召唤骑宠"""
        x, y = self._normalize_pos(self.ui_positions['mount_button'])
        self.adb.tap(x, y)
        logger.debug(f"🐎 召唤骑宠：{mount_name}")
    
    def _activate_rush_skill(self):
        """激活冲撞技能"""
        x, y = self._normalize_pos(self.ui_positions['rush_skill'])
        self.adb.tap(x, y)
        logger.debug("💥 激活冲撞技能")
    
    def _rush_direction(self, target: tuple):
        """朝向目标方向冲撞"""
        screen_center = (self.width / 2, self.height / 2)
        
        # 计算方向向量
        dx = target[0] - screen_center[0]
        dy = target[1] - screen_center[1]
        
        # 归一化并缩放到合适长度
        dist = (dx**2 + dy**2)**0.5
        if dist > 0:
            scale = min(300 / dist, 1.0)  # 最大滑动 300 像素
            end_x = screen_center[0] + dx * scale
            end_y = screen_center[1] + dy * scale
            
            # 从摇杆位置滑动
            start_x, start_y = self._normalize_pos(self.ui_positions['joystick_center'])
            self.adb.swipe(
                (start_x, start_y),
                (end_x, end_y),
                duration=200
            )
    
    def _cancel_lag(self):
        """
        取消冲撞后摇僵直 - 核心技巧
        
        操作顺序:
        1. 轻推摇杆 (任意方向微偏)
        2. 双击跳跃
        """
        # 摇杆位置
        joy_x, joy_y = self._normalize_pos(self.ui_positions['joystick_center'])
        
        # 1. 轻推摇杆 (向右微偏 20 像素)
        self.adb.swipe((joy_x, joy_y), (joy_x + 20, joy_y), duration=100)
        time.sleep(0.05)
        
        # 2. 双击跳跃
        jump_x, jump_y = self._normalize_pos(self.ui_positions['jump_button'])
        self.adb.tap(jump_x, jump_y)
        time.sleep(0.1)
        self.adb.tap(jump_x, jump_y)
        
        logger.debug("✨ 取消僵直完成")
    
    def _normalize_pos(self, pos: tuple) -> tuple:
        """将归一化坐标转换为实际像素"""
        norm_x, norm_y = pos
        return (int(norm_x * self.width), int(norm_y * self.height))
    
    def pickup(self, position: tuple = None):
        """
        拾取掉落物
        
        参数:
            position: 拾取位置 (不传则使用屏幕中心)
        """
        if position:
            self.adb.tap(position[0], position[1])
        else:
            # 屏幕中心拾取
            self.adb.tap(self.width // 2, self.height // 2)
        
        logger.debug("📦 拾取掉落物")
