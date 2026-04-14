"""
状态机管理
"""

from enum import Enum
from typing import Callable, Dict
from loguru import logger


class State(Enum):
    """状态枚举"""
    IDLE = "idle"
    MOVING = "moving"
    DETECTING = "detecting"
    COLLECTING = "collecting"
    RETURNING = "returning"
    ERROR = "error"
    PAUSED = "paused"


class StateMachine:
    """状态机"""
    
    def __init__(self):
        self.current_state = State.IDLE
        self.transitions: Dict[State, Dict[str, State]] = {}
        self.callbacks: Dict[State, Callable] = {}
        
        self._setup_transitions()
    
    def _setup_transitions(self):
        """设置状态转换"""
        self.transitions = {
            State.IDLE: {
                'start': State.MOVING,
                'pause': State.PAUSED
            },
            State.MOVING: {
                'arrive': State.DETECTING,
                'error': State.ERROR,
                'pause': State.PAUSED
            },
            State.DETECTING: {
                'found': State.COLLECTING,
                'not_found': State.MOVING,
                'error': State.ERROR,
                'pause': State.PAUSED
            },
            State.COLLECTING: {
                'done': State.MOVING,
                'error': State.ERROR,
                'pause': State.PAUSED
            },
            State.ERROR: {
                'retry': State.MOVING,
                'reset': State.IDLE
            },
            State.PAUSED: {
                'resume': State.MOVING,
                'stop': State.IDLE
            }
        }
    
    def transition(self, event: str) -> bool:
        """
        执行状态转换
        
        参数:
            event: 触发事件
        
        返回:
            bool: 是否成功转换
        """
        if self.current_state not in self.transitions:
            logger.warning(f"⚠️  状态 {self.current_state} 无定义转换")
            return False
        
        next_state = self.transitions[self.current_state].get(event)
        
        if not next_state:
            logger.debug(f"ℹ️  状态 {self.current_state} 无事件 {event} 的转换")
            return False
        
        old_state = self.current_state
        self.current_state = next_state
        
        logger.debug(f"🔄 状态转换：{old_state.value} --[{event}]--> {next_state.value}")
        
        # 执行回调
        if next_state in self.callbacks:
            try:
                self.callbacks[next_state]()
            except Exception as e:
                logger.error(f"❌ 状态回调失败：{e}")
        
        return True
    
    def on_enter(self, state: State, callback: Callable):
        """注册状态进入回调"""
        self.callbacks[state] = callback
    
    def is_state(self, state: State) -> bool:
        """检查当前状态"""
        return self.current_state == state
    
    def is_active(self) -> bool:
        """检查是否处于活跃状态"""
        return self.current_state not in [State.IDLE, State.ERROR, State.PAUSED]
    
    def reset(self):
        """重置状态机"""
        self.current_state = State.IDLE
        logger.info("🔄 状态机已重置")
    
    def get_state(self) -> str:
        """获取当前状态"""
        return self.current_state.value
