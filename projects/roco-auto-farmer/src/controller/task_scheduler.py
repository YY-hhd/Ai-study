"""
任务调度器 - 增强防检测版
"""

import time
import random
from datetime import datetime, timedelta
from loguru import logger


class TaskScheduler:
    """任务调度器 - 支持智能防检测"""
    
    def __init__(self, config: dict):
        self.config = config
        self.safety_config = config.get('safety', {})
        
        self.start_time = None
        self.last_break_time = None
        self.last_action_time = None
        self.loop_count = 0
        self.action_count = 0
        self.pause_count = 0
        
        self.collection_stats = {
            '金矿': 0,
            '铜矿': 0,
            '铁矿': 0,
            '冰晶锥矿': 0,
            '魔法石': 0,
            '草药': 0
        }
        
        # 速度波动因子
        self.speed_factor = 1.0
        if self.safety_config.get('speed_variation', {}).get('enabled', False):
            self._refresh_speed_factor()
    
    def start(self):
        """开始调度"""
        self.start_time = datetime.now()
        self.last_break_time = self.start_time
        self.last_action_time = self.start_time
        logger.info(f"⏰ 调度器启动：{self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 显示防检测设置
        self._print_safety_settings()
    
    def _print_safety_settings(self):
        """打印防检测设置"""
        if not self.safety_config.get('anti_detect', False):
            logger.warning("⚠️  防检测模式未开启")
            return
        
        logger.info("🛡️  防检测模式已启用:")
        
        # 随机延迟
        rd = self.safety_config.get('random_delay', {})
        if isinstance(rd, dict):
            logger.info(f"   • 随机延迟：{rd.get('min', 0.5)}-{rd.get('max', 2.0)}秒")
        else:
            logger.info(f"   • 随机延迟：{rd[0]}-{rd[1]}秒")
        
        # 定时休息
        break_interval = self.safety_config.get('break_interval', 300)
        break_duration = self.safety_config.get('break_duration', 60)
        logger.info(f"   • 定时休息：每{break_interval//60}分钟休息{break_duration}秒")
        
        # 随机暂停
        rp = self.safety_config.get('random_pause', {})
        if rp.get('enabled', False):
            prob = rp.get('probability', 0.1) * 100
            dur = rp.get('duration', [3, 10])
            logger.info(f"   • 随机暂停：{prob}%概率，{dur[0]}-{dur[1]}秒")
        
        # 速度波动
        sv = self.safety_config.get('speed_variation', {})
        if sv.get('enabled', False):
            var = sv.get('variation', 0.2) * 100
            logger.info(f"   • 速度波动：±{var}%")
    
    def _refresh_speed_factor(self):
        """刷新速度波动因子"""
        sv = self.safety_config.get('speed_variation', {})
        base = sv.get('base_speed', 1.0)
        variation = sv.get('variation', 0.2)
        self.speed_factor = base + random.uniform(-variation, variation)
    
    def apply_random_delay(self, action_name: str = "操作"):
        """
        应用随机延迟
        
        参数:
            action_name: 操作名称（用于日志）
        """
        if not self.safety_config.get('anti_detect', False):
            return
        
        rd = self.safety_config.get('random_delay', {})
        
        # 支持旧格式 [min, max] 和新格式 {min, max}
        if isinstance(rd, dict):
            min_delay = rd.get('min', 0.5)
            max_delay = rd.get('max', 2.0)
        else:
            min_delay, max_delay = rd[0], rd[1]
        
        # 应用速度波动
        base_delay = random.uniform(min_delay, max_delay)
        actual_delay = base_delay / self.speed_factor
        
        # 刷新速度因子
        if random.random() < 0.3:  # 30% 概率刷新
            self._refresh_speed_factor()
        
        time.sleep(actual_delay)
        self.action_count += 1
        self.last_action_time = datetime.now()
        
        logger.debug(f"⏱️  {action_name} 后延迟 {actual_delay:.2f}秒 (速度因子：{self.speed_factor:.2f})")
    
    def apply_random_pause(self):
        """
        应用随机暂停（模拟用户查看/操作）
        """
        if not self.safety_config.get('anti_detect', False):
            return
        
        rp = self.safety_config.get('random_pause', {})
        if not rp.get('enabled', False):
            return
        
        # 检查是否触发
        probability = rp.get('probability', 0.1)
        if random.random() >= probability:
            return
        
        # 执行暂停
        duration = random.uniform(*rp.get('duration', [3, 10]))
        logger.info(f"👀 模拟用户查看，暂停 {duration:.1f}秒...")
        time.sleep(duration)
        self.pause_count += 1
    
    def should_break(self) -> bool:
        """检查是否应该休息"""
        break_interval = self.safety_config.get('break_interval', 300)
        
        if self.last_break_time is None:
            return False
        
        elapsed = (datetime.now() - self.last_break_time).total_seconds()
        return elapsed >= break_interval
    
    def take_break(self):
        """执行定时休息"""
        break_duration = self.safety_config.get('break_duration', 60)
        
        if self.safety_config.get('break_reminder', False):
            logger.info("=" * 50)
            logger.info("😴 定时休息时间到！")
            logger.info(f"⏰ 休息 {break_duration} 秒，活动一下身体~")
            logger.info("=" * 50)
        else:
            logger.info(f"😴 休息 {break_duration} 秒...")
        
        time.sleep(break_duration)
        self.last_break_time = datetime.now()
    
    def should_stop(self) -> bool:
        """检查是否应该停止"""
        max_runtime = self.safety_config.get('max_runtime', 7200)
        
        if self.start_time is None:
            return False
        
        elapsed = (datetime.now() - self.start_time).total_seconds()
        
        if elapsed >= max_runtime:
            logger.info(f"⏰ 已达到最大运行时长 {max_runtime//60} 分钟")
            return True
        
        # 检查每小时循环次数限制
        max_loops = self.safety_config.get('max_loops_per_hour', 12)
        hours_elapsed = elapsed / 3600
        if hours_elapsed > 0 and self.loop_count / hours_elapsed > max_loops:
            logger.warning(f"⚠️  每小时循环次数过多 ({self.loop_count}/{max_loops})，建议停止")
        
        return False
    
    def record_loop(self):
        """记录一轮采集"""
        self.loop_count += 1
    
    def record_collection(self, ore_type: str, count: int = 1):
        """记录采集"""
        if ore_type in self.collection_stats:
            self.collection_stats[ore_type] += count
    
    def get_runtime(self) -> float:
        """获取运行时长（秒）"""
        if self.start_time is None:
            return 0
        return (datetime.now() - self.start_time).total_seconds()
    
    def get_stats(self) -> dict:
        """获取统计信息"""
        runtime = self.get_runtime()
        hours = runtime / 3600
        
        return {
            'runtime_seconds': runtime,
            'runtime_formatted': self._format_time(runtime),
            'loop_count': self.loop_count,
            'loops_per_hour': self.loop_count / hours if hours > 0 else 0,
            'action_count': self.action_count,
            'pause_count': self.pause_count,
            'collections': self.collection_stats,
            'total_collected': sum(self.collection_stats.values()),
            'avg_speed_factor': self.speed_factor
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
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("📊 采集统计摘要")
        logger.info("=" * 60)
        logger.info(f"⏱️  运行时长：{stats['runtime_formatted']}")
        logger.info(f"🔄 循环次数：{stats['loop_count']} ({stats['loops_per_hour']:.1f} 轮/小时)")
        logger.info(f"🎮 操作次数：{stats['action_count']}")
        logger.info(f"⏸️  随机暂停：{stats['pause_count']} 次")
        logger.info(f"📦 总采集数：{stats['total_collected']}")
        
        if stats['total_collected'] > 0:
            logger.info("")
            logger.info("📈 采集详情:")
            for ore_type, count in stats['collections'].items():
                if count > 0:
                    percentage = (count / stats['total_collected']) * 100
                    logger.info(f"   • {ore_type}: {count} ({percentage:.1f}%)")
        
        logger.info("=" * 60)
