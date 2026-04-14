"""
矿石识别器 - 支持 YOLO + 模板匹配双模式
"""

import cv2
import numpy as np
from pathlib import Path
from loguru import logger


class OreDetector:
    """矿石识别器"""
    
    # 矿石类型映射
    ORE_CLASSES = {
        0: '金矿',
        1: '铜矿',
        2: '铁矿',
        3: '冰晶锥矿',
        4: '魔法石',
        5: '草药'
    }
    
    def __init__(self, model_path: str = None):
        self.yolo_model = None
        self.templates = {}
        
        # 尝试加载 YOLO 模型
        if model_path and Path(model_path).exists():
            try:
                from ultralytics import YOLO
                self.yolo_model = YOLO(model_path)
                logger.info(f"✅ YOLO 模型已加载：{model_path}")
            except Exception as e:
                logger.warning(f"⚠️  YOLO 模型加载失败：{e}，将使用模板匹配")
        else:
            logger.info("📝 未找到 YOLO 模型，使用模板匹配模式")
        
        # 加载模板
        self._load_templates()
    
    def _load_templates(self):
        """加载矿石模板"""
        template_dir = Path('src/vision/templates')
        
        if not template_dir.exists():
            logger.warning(f"⚠️  模板目录不存在：{template_dir}")
            return
        
        for ore_type in self.ORE_CLASSES.values():
            template_path = template_dir / f"{ore_type}.png"
            if template_path.exists():
                template = cv2.imread(str(template_path), cv2.IMREAD_GRAYSCALE)
                self.templates[ore_type] = template
                logger.debug(f"📷 加载模板：{ore_type}")
    
    def detect(self, screenshot: np.ndarray, confidence: float = 0.6) -> list:
        """
        检测屏幕中的矿石
        
        参数:
            screenshot: 屏幕截图 (numpy 数组)
            confidence: 置信度阈值
        
        返回:
            [{'type': str, 'confidence': float, 'bbox': array, 'center': tuple}, ...]
        """
        results = []
        
        # 优先使用 YOLO
        if self.yolo_model:
            results = self._detect_yolo(screenshot, confidence)
        
        # YOLO 无结果时使用模板匹配
        if not results:
            results = self._detect_template(screenshot, confidence)
        
        return results
    
    def _detect_yolo(self, screenshot: np.ndarray, confidence: float) -> list:
        """YOLO 检测"""
        try:
            results = self.yolo_model(screenshot, conf=confidence, verbose=False)
            
            detections = []
            for box in results[0].boxes:
                cls_id = int(box.cls)
                ore_type = self.ORE_CLASSES.get(cls_id, f'未知_{cls_id}')
                
                detections.append({
                    'type': ore_type,
                    'confidence': float(box.conf),
                    'bbox': box.xyxy[0].cpu().numpy(),
                    'center': self._get_center(box.xyxy[0])
                })
            
            logger.debug(f"🎯 YOLO 检测到 {len(detections)} 个矿石")
            return detections
            
        except Exception as e:
            logger.error(f"❌ YOLO 检测失败：{e}")
            return []
    
    def _detect_template(self, screenshot: np.ndarray, confidence: float) -> list:
        """模板匹配检测"""
        if not self.templates:
            return []
        
        gray = cv2.cvtColor(screenshot, cv2.COLOR_RGB2GRAY)
        detections = []
        
        for ore_type, template in self.templates.items():
            # 模板匹配
            result = cv2.matchTemplate(gray, template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(result)
            
            if max_val >= confidence:
                h, w = template.shape
                bbox = np.array([
                    max_loc[0],
                    max_loc[1],
                    max_loc[0] + w,
                    max_loc[1] + h
                ])
                
                detections.append({
                    'type': ore_type,
                    'confidence': float(max_val),
                    'bbox': bbox,
                    'center': (max_loc[0] + w/2, max_loc[1] + h/2)
                })
        
        logger.debug(f"🎯 模板匹配检测到 {len(detections)} 个矿石")
        return detections
    
    def _get_center(self, bbox) -> tuple:
        """计算边界框中心"""
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) / 2, (y1 + y2) / 2)
    
    def find_nearest(self, detections: list, position: tuple) -> dict:
        """找到最近的矿石"""
        if not detections:
            return None
        
        min_dist = float('inf')
        nearest = None
        
        for det in detections:
            cx, cy = det['center']
            dist = ((cx - position[0])**2 + (cy - position[1])**2)**0.5
            
            if dist < min_dist:
                min_dist = dist
                nearest = det
        
        return nearest
