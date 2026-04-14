"""
任务调度器
"""

import time
import random
from datetime import datetime, timedelta
from loguru import logger


class TaskScheduler:
    """任务调度器"""
    
    def __init__(self, config: dict):
        self.config = config
        self.start_time = None
        self.last_break_time = None
        self.loop_count = 0
        self.collection_stats = {
            '金矿': 0,
            '铜矿': 0,
            '铁矿': 0,
            '冰晶锥矿': 0,
            '魔法石': 0,
            '草药': 0
        }
    
    def start(self):
        """开始调度"""
        self.start_time = datetime.now()
        self.last_break_time = self.start_time
        logger.info(f"⏰ 调度器启动：{self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    def should_break(self) -> bool:
        """检查是否应该休息"""
        break_interval = self.config['safety']['break_interval']
        
        if self.last_break_time is None:
            return False
        
        elapsed = (datetime.now() - self.last_break_time).total_seconds()
        return elapsed >= break_interval
    
    def take_break(self):
        """执行休息"""
        break_interval = self.config['safety']['break_interval']
        logger.info(f"😴 休息时间 {break_interval} 秒...")
        time.sleep(break_interval)
        self.last_break_time = datetime.now()
    
    def should_stop(self) -> bool:
        """检查是否应该停止"""
        max_runtime = self.config['safety']['max_runtime']
        
        if self.start_time is None:
            return False
        
        elapsed = (datetime.now() - self.start_time).total_seconds()
        return elapsed >= max_runtime
    
    def add_random_delay(self):
        """添加随机延迟（防检测）"""
        if not self.config['safety']['anti_detect']:
            return
        
        min_delay, max_delay = self.config['safety']['random_delay']
        delay = random.uniform(min_delay, max_delay)
        time.sleep(delay)
    
    def record_collection(self, ore_type: str, count: int = 1):
        """记录采集"""
        if ore_type in self.collection_stats:
            self.collection_stats[ore_type] += count
        self.loop_count += 1
    
    def get_runtime(self) -> float:
        """获取运行时长（秒）"""
        if self.start_time is None:
            return 0
        return (datetime.now() - self.start_time).total_seconds()
    
    def get_stats(self) -> dict:
        """获取统计信息"""
        return {
            'runtime_seconds': self.get_runtime(),
            'runtime_formatted': self._format_time(self.get_runtime()),
            'loop_count': self.loop_count,
            'collections': self.collection_stats,
            'total_collected': sum(self.collection_stats.values())
        }
    
    def _format_time(self, seconds: float) -> str:
        """格式化时间"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    
    def print_summary(self):
        """打印统计摘要"""
        stats = self.get_stats()
        
        logger.info("=" * 50)
        logger.info("📊 采集统计摘要")
        logger.info("=" * 50)
        logger.info(f"⏱️  运行时长：{stats['runtime_formatted']}")
        logger.info(f"🔄 循环次数：{stats['loop_count']}")
        logger.info(f"📦 总采集数：{stats['total_collected']}")
        
        for ore_type, count in stats['collections'].items():
            if count > 0:
                logger.info(f"   • {ore_type}: {count}")
        
        logger.info("=" * 50)
