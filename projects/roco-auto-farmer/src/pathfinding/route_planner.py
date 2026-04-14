"""
智能路线规划器
"""

import json
import math
from pathlib import Path
from typing import List, Dict, Set
from dataclasses import dataclass, asdict
from loguru import logger


@dataclass
class Waypoint:
    """航点"""
    x: float  # 归一化坐标 0-1
    y: float
    action: str  # 'move', 'collect', 'teleport'
    ore_type: str = None
    note: str = ""


class RoutePlanner:
    """智能路线规划器"""
    
    def __init__(self, map_name: str):
        self.map_name = map_name
        self.waypoints = self._load_route(map_name)
        self.collected = set()  # 已采集的矿石类型
    
    def _load_route(self, map_name: str) -> List[Waypoint]:
        """加载预设路线"""
        route_file = Path(f'config/routes/{map_name}.json')
        
        if not route_file.exists():
            logger.warning(f"⚠️  路线文件不存在：{route_file}")
            return []
        
        with open(route_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        waypoints = [Waypoint(**wp) for wp in data['waypoints']]
        logger.info(f"📍 加载路线：{data['name']} ({len(waypoints)} 个航点)")
        
        return waypoints
    
    def get_optimal_route(self, collected: Set[str] = None) -> List[Waypoint]:
        """
        获取最优采集路线
        
        参数:
            collected: 已采集的矿石类型集合
        
        返回:
            优化后的航点列表
        """
        if collected:
            self.collected = collected
        
        # 过滤已采集点
        if self.collected:
            remaining = [
                wp for wp in self.waypoints 
                if wp.action != 'collect' or wp.ore_type not in self.collected
            ]
        else:
            remaining = self.waypoints.copy()
        
        if not remaining:
            logger.info("✅ 所有采集点已完成，重置路线")
            self.collected = set()
            return self.waypoints
        
        # 使用最近邻算法优化路线
        optimized = self._nearest_neighbor(remaining)
        
        logger.debug(f"🗺️  优化路线：{len(optimized)} 个航点")
        return optimized
    
    def _nearest_neighbor(self, waypoints: List[Waypoint]) -> List[Waypoint]:
        """
        最近邻算法优化路线
        
        从传送点开始，每次选择最近的未访问航点
        """
        if not waypoints:
            return []
        
        # 找到传送点作为起点
        start_wp = None
        for wp in waypoints:
            if wp.action == 'teleport':
                start_wp = wp
                break
        
        if not start_wp:
            start_wp = waypoints[0]
        
        route = [start_wp]
        unvisited = [wp for wp in waypoints if wp != start_wp]
        
        while unvisited:
            last = route[-1]
            # 找到最近的航点
            nearest = min(
                unvisited,
                key=lambda wp: self._distance(last, wp)
            )
            route.append(nearest)
            unvisited.remove(nearest)
        
        return route
    
    def _distance(self, wp1: Waypoint, wp2: Waypoint) -> float:
        """计算航点间欧氏距离"""
        return math.sqrt(
            (wp1.x - wp2.x)**2 + **(wp1.y - wp2.y)2
        )
    
    def add_waypoint(self, x: float, y: float, action: str, **kwargs):
        """添加新航点"""
        wp = Waypoint(x=x, y=y, action=action, **kwargs)
        self.waypoints.append(wp)
        logger.debug(f"➕ 添加航点：{action} @ ({x}, {y})")
    
    def save_route(self, output_path: str = None):
        """保存路线"""
        if not output_path:
            output_path = f'config/routes/{self.map_name}.json'
        
        data = {
            'name': self.map_name,
            'waypoints': [asdict(wp) for wp in self.waypoints]
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"💾 路线已保存：{output_path}")
    
    def get_stats(self) -> dict:
        """获取路线统计信息"""
        stats = {
            'total_waypoints': len(self.waypoints),
            'collect_points': sum(1 for wp in self.waypoints if wp.action == 'collect'),
            'teleport_points': sum(1 for wp in self.waypoints if wp.action == 'teleport'),
            'ore_types': list(set(wp.ore_type for wp in self.waypoints if wp.ore_type)),
            'collected': list(self.collected),
            'remaining': len(self.waypoints) - sum(
                1 for wp in self.waypoints 
                if wp.ore_type in self.collected
            )
        }
        return stats
