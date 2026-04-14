"""
ADB 设备控制器
"""

import subprocess
import numpy as np
from PIL import Image
import io
from loguru import logger


class ADBController:
    """ADB 设备控制器"""
    
    def __init__(self, device_id: str = None):
        self.device_id = device_id
        self.resolution = (1920, 1080)
        self._connect()
    
    def _run(self, command: str) -> str:
        """执行 ADB 命令"""
        if self.device_id:
            command = f"adb -s {self.device_id} {command}"
        else:
            command = f"adb {command}"
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.stdout
        except subprocess.TimeoutExpired:
            logger.error(f"ADB 命令超时：{command}")
            return ""
        except Exception as e:
            logger.error(f"ADB 命令失败：{e}")
            return ""
    
    def _connect(self):
        """连接设备"""
        logger.info("🔌 连接 ADB 设备...")
        
        # 检查设备
        devices = self._run("devices")
        if "device" not in devices:
            logger.warning("⚠️  未检测到 ADB 设备，请确保模拟器/设备已连接")
            return
        
        # 获取分辨率
        res_output = self._run("shell wm size")
        if "Physical size" in res_output:
            res_str = res_output.split(":")[-1].strip()
            w, h = map(int, res_str.split("x"))
            self.resolution = (w, h)
            logger.info(f"📱 设备分辨率：{w}x{h}")
    
    def tap(self, x: int, y: int):
        """点击屏幕"""
        self._run(f"shell input tap {x} {y}")
        logger.debug(f"👆 点击 ({x}, {y})")
    
    def swipe(self, start: tuple, end: tuple, duration: int = 300):
        """滑动屏幕"""
        x1, y1 = start
        x2, y2 = end
        self._run(f"shell input swipe {x1} {y1} {x2} {y2} {duration}")
        logger.debug(f"👆 滑动 ({x1},{y1}) -> ({x2},{y2}) {duration}ms")
    
    def long_press(self, x: int, y: int, duration: int = 1000):
        """长按"""
        self._run(f"shell input swipe {x} {y} {x} {y} {duration}")
        logger.debug(f"👆 长按 ({x}, {y}) {duration}ms")
    
    def text(self, text: str):
        """输入文本"""
        # 转义特殊字符
        text = text.replace(" ", "%s").replace("'", "")
        self._run(f"shell input text '{text}'")
    
    def key(self, keycode: int):
        """按键"""
        self._run(f"shell input keyevent {keycode}")
    
    def screenshot(self, save_path: str = None) -> np.ndarray:
        """截取屏幕，返回 numpy 数组"""
        import tempfile
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            # 截取并拉取
            self._run(f"shell screencap -p /sdcard/screenshot.png")
            self._run(f"pull /sdcard/screenshot.png {tmp_path}")
            
            # 读取图片
            img = Image.open(tmp_path)
            arr = np.array(img)
            
            # 保存（如果需要）
            if save_path:
                img.save(save_path)
            
            return arr
        finally:
            # 清理临时文件
            import os
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    def get_resolution(self) -> tuple:
        """获取屏幕分辨率"""
        return self.resolution
    
    def install(self, apk_path: str):
        """安装 APK"""
        logger.info(f"📦 安装 APK: {apk_path}")
        self._run(f"install -r {apk_path}")
    
    def is_connected(self) -> bool:
        """检查设备是否连接"""
        devices = self._run("devices")
        return self.device_id in devices or "device" in devices
