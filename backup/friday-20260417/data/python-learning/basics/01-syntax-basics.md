# Python 基础 - 语法入门

**学习时间**: 2026-03-08 16:00  
**阶段**: 1-1 Python 语法基础

---

## 📚 核心知识点

### 1. Python 简介

**特点**:
- 简洁易读的语法
- 动态类型语言
- 解释型语言
- 丰富的标准库和第三方库

**适用场景**:
- Web 后端开发
- 数据分析
- 人工智能
- 自动化脚本

---

### 2. 基础语法

#### 变量与数据类型

```python
# 变量定义（无需声明类型）
name = "Python"
version = 3.11
is_awesome = True

# 基本数据类型
# - str: 字符串
# - int: 整数
# - float: 浮点数
# - bool: 布尔值
# - None: 空值

# 类型查看
print(type(name))    # <class 'str'>
print(type(version)) # <class 'float'>
```

#### 字符串操作

```python
# 字符串定义
text = "Hello, Python!"

# 常用操作
len(text)           # 长度：14
text.lower()        # 小写："hello, python!"
text.upper()        # 大写："HELLO, PYTHON!"
text.replace("Python", "World")  # 替换
text.split(",")     # 分割：["Hello", " Python!"]
f"Version: {version}"  # f-string 格式化
```

#### 数字运算

```python
# 基本运算
a = 10 + 5    # 加法：15
b = 10 - 5    # 减法：5
c = 10 * 5    # 乘法：50
d = 10 / 3    # 除法：3.333...
e = 10 // 3   # 整除：3
f = 10 % 3    # 取余：1
g = 2 ** 3    # 幂运算：8
```

---

### 3. 控制结构

#### 条件语句

```python
# if-elif-else
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "D"

print(f"成绩等级：{grade}")
```

#### 循环语句

```python
# for 循环
for i in range(5):  # 0 到 4
    print(i)

# 遍历列表
fruits = ["apple", "banana", "orange"]
for fruit in fruits:
    print(fruit)

# while 循环
count = 0
while count < 5:
    print(count)
    count += 1
```

---

### 4. 函数定义

```python
# 基本函数
def greet(name):
    """打招呼函数"""
    return f"Hello, {name}!"

# 调用函数
message = greet("Python")
print(message)  # Hello, Python!

# 带默认参数
def power(base, exp=2):
    return base ** exp

print(power(3))     # 9 (3^2)
print(power(3, 3))  # 27 (3^3)

# 可变参数
def sum_all(*args):
    return sum(args)

print(sum_all(1, 2, 3, 4))  # 10
```

---

### 5. 模块导入

```python
# 导入整个模块
import math
print(math.sqrt(16))  # 4.0

# 导入特定函数
from datetime import datetime
print(datetime.now())

# 导入并重命名
import numpy as np
```

---

## 💡 最佳实践

1. **命名规范**: 使用小写字母和下划线（snake_case）
   ```python
   user_name = "John"  # ✅ 好
   UserName = "John"   # ❌ 不好
   ```

2. **代码注释**: 使用文档字符串说明函数用途
   ```python
   def calculate_area(radius):
       """计算圆的面积"""
       return math.pi * radius ** 2
   ```

3. **代码缩进**: 使用 4 个空格（不是 tab）

4. **空行**: 函数之间空一行，类之间空两行

---

## 🎯 练习任务

### 任务 1: 计算器
编写一个简单的计算器函数，支持加减乘除。

### 任务 2: 字符串处理
编写函数，统计字符串中每个字符出现的次数。

### 任务 3: 数字游戏
编写猜数字游戏（1-100），提示用户猜大了还是猜小了。

---

## 📝 学习笔记

**今日学习**:
- [ ] Python 基础语法
- [ ] 变量与数据类型
- [ ] 控制结构
- [ ] 函数定义

**遇到的问题**:
- 

**解决方案**:
- 

**明日计划**:
- 数据结构（列表、字典、集合）

---

_学习时间：2026-03-08 16:00_
_下一步：数据结构学习_
