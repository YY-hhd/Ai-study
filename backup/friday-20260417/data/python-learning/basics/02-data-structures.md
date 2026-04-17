# Python 数据结构

**学习时间**: 2026-03-08  
**阶段**: 1-2 数据结构（列表、字典、集合）

---

## 📚 核心知识点

### 1. 列表（List）

**特点**: 有序、可变、可重复

```python
# 创建列表
fruits = ["apple", "banana", "orange"]
numbers = [1, 2, 3, 4, 5]
mixed = [1, "hello", 3.14, True]

# 访问元素
print(fruits[0])     # "apple"
print(fruits[-1])    # "orange" (最后一个)
print(fruits[1:3])   # ["banana", "orange"] (切片)

# 修改列表
fruits.append("grape")      # 添加元素
fruits.insert(1, "pear")    # 插入元素
fruits.remove("banana")     # 删除元素
popped = fruits.pop()       # 弹出最后一个

# 列表操作
len(fruits)                 # 长度
fruits.sort()               # 排序
fruits.reverse()            # 反转
index = fruits.index("apple")  # 查找索引

# 列表推导式
squares = [x**2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

evens = [x for x in range(20) if x % 2 == 0]
# [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
```

---

### 2. 字典（Dictionary）

**特点**: 键值对、无序（Python 3.7+ 有序）、键唯一

```python
# 创建字典
user = {
    "name": "John",
    "age": 30,
    "city": "New York"
}

# 访问值
print(user["name"])        # "John"
print(user.get("age"))     # 30
print(user.get("email", "N/A"))  # "N/A" (默认值)

# 修改字典
user["age"] = 31           # 修改值
user["email"] = "john@example.com"  # 添加新键
del user["city"]           # 删除键

# 字典操作
keys = user.keys()         # 所有键
values = user.values()     # 所有值
items = user.items()       # 所有键值对

# 遍历字典
for key, value in user.items():
    print(f"{key}: {value}")

# 字典推导式
squares = {x: x**2 for x in range(5)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}
```

---

### 3. 元组（Tuple）

**特点**: 有序、不可变、可重复

```python
# 创建元组
coordinates = (10, 20)
colors = ("red", "green", "blue")
single = (5,)  # 单元素元组需要逗号

# 访问元素
print(coordinates[0])  # 10
print(colors[-1])      # "blue"

# 元组解包
x, y = coordinates
print(x, y)  # 10 20

# 不可变（会报错）
# coordinates[0] = 15  # ❌ TypeError
```

---

### 4. 集合（Set）

**特点**: 无序、不重复、可变

```python
# 创建集合
fruits = {"apple", "banana", "orange"}
numbers = set([1, 2, 3, 3, 4, 4, 5])  # {1, 2, 3, 4, 5}

# 集合操作
fruits.add("grape")         # 添加元素
fruits.remove("banana")     # 删除元素
fruits.discard("pear")      # 安全删除（不存在不报错）

# 集合运算
set1 = {1, 2, 3, 4}
set2 = {3, 4, 5, 6}

union = set1 | set2         # 并集：{1, 2, 3, 4, 5, 6}
intersection = set1 & set2  # 交集：{3, 4}
difference = set1 - set2    # 差集：{1, 2}
```

---

## 🔄 数据结构对比

| 类型 | 有序 | 可变 | 重复 | 语法 |
|:---|:---:|:---:|:---:|:---|
| **列表** | ✅ | ✅ | ✅ | `[]` |
| **字典** | ✅ (3.7+) | ✅ | 键唯一 | `{}` |
| **元组** | ✅ | ❌ | ✅ | `()` |
| **集合** | ❌ | ✅ | ❌ | `{}` |

---

## 💡 最佳实践

### 1. 选择合适的数据结构

```python
# 需要有序且可变 → 列表
users = ["Alice", "Bob", "Charlie"]

# 需要键值对映射 → 字典
user_info = {"name": "Alice", "age": 30}

# 需要不可变 → 元组
coordinates = (100, 200)

# 需要去重 → 集合
unique_ids = {1, 2, 3, 3, 4}  # {1, 2, 3, 4}
```

### 2. 列表推导式优于循环

```python
# ❌ 不推荐
squares = []
for i in range(10):
    squares.append(i**2)

# ✅ 推荐
squares = [i**2 for i in range(10)]
```

### 3. 使用 in 检查存在性

```python
# ✅ 高效（O(1)）
if "name" in user:
    print(user["name"])

# ❌ 低效
if "name" in user.keys():
    print(user["name"])
```

---

## 🎯 练习任务

### 任务 1: 列表操作
```python
# 创建一个包含 10 个数字的列表
# 1. 计算总和
# 2. 找出最大值和最小值
# 3. 反转列表
# 4. 排序列表
```

### 任务 2: 字典统计
```python
# 给定一段文本，统计每个单词出现的次数
text = "python is great python is awesome"
# 输出：{"python": 2, "is": 2, "great": 1, "awesome": 1}
```

### 任务 3: 集合去重
```python
# 给定一个列表，去除重复元素
numbers = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4]
# 输出：[1, 2, 3, 4]
```

---

## 📝 学习笔记

**今日学习**:
- [ ] 列表（List）
- [ ] 字典（Dictionary）
- [ ] 元组（Tuple）
- [ ] 集合（Set）

**关键理解**:
- 列表推导式是 Python 的特色
- 字典查找效率高（O(1)）
- 集合用于去重和集合运算

**遇到的问题**:
- 

**下一步**:
- 函数与模块

---

_学习时间：2026-03-08_
_下一步：函数与模块学习_
