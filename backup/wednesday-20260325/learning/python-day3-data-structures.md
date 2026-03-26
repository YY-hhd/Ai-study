# Python Day 3 - 数据结构

**学习日期**: 2026-03-22  
**学习时段**: 21:28 - 23:30  
**前置知识**: Day 1 (基础语法) ✅ | Day 2 (控制流、函数) ✅

---

## 📚 今日学习内容

### 1. 列表 (List)
- 创建、索引、切片
- 常用方法：append, insert, extend, remove, pop, sort, reverse
- 列表推导式

### 2. 元组 (Tuple)
- 不可变序列
- 元组解包
- 与列表的区别

### 3. 字典 (Dictionary)
- 键值对映射
- setdefault vs get vs 直接赋值
- 字典推导式
- 遍历方法 (keys, values, items)

### 4. 集合 (Set)
- 无序不重复
- 集合运算 (并集、交集、差集)
- 去重应用

---

## 💻 练习完成

### 练习 1: 列表操作 ✅
```python
num = []
for i in range(1, 11):
    num.append(i)
oushu = [n for n in num if n % 2 == 0]
sq = [s ** 2 for s in oushu]
# 结果：num=[1..10], oushu=[2,4,6,8,10], sq=[4,16,36,64,100]
```
**评分**: 5/5 ⭐⭐⭐⭐⭐

---

### 练习 2: 字典应用 (字符统计) ✅
```python
text = "hello world"
tongji = {}
for word in [text[i] for i in range(0, len(text))]:
    tongji.setdefault(word, text.count(word))
# 结果：{'h': 1, 'e': 1, 'l': 3, 'o': 2, ' ': 1, 'w': 1, 'r': 1, 'd': 1}
```
**优化建议**: 用 `tongji[char] = tongji.get(char, 0) + 1` 更清晰高效  
**评分**: 4/5 ⭐⭐⭐⭐

---

### 练习 3: 集合去重 ✅
```python
numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
unq = []
for number in numbers:
    if unq.count(number) == 0:
        unq.append(number)
# 结果：[3, 1, 4, 5, 9, 2, 6]
```
**评分**: 5/5 ⭐⭐⭐⭐⭐

---

### 练习 4: 综合应用 (学生成绩管理) ✅
```python
students = {
    "Alice": {"age": 20, "scores": [85, 90, 78]},
    "Bob": {"age": 21, "scores": [92, 88, 95]},
    "Charlie": {"age": 19, "scores": [70, 75, 80]}
}

# 计算平均分
avg_dict = {}
for name, info in students.items():
    avg = sum(info["scores"]) / len(info["scores"])
    avg_dict[name] = avg

# 找最高分
best_student = max(avg_dict, key=avg_dict.get)
# 结果：Bob (91.67)
```
**评分**: 5/5 ⭐⭐⭐⭐⭐

---

## 🎯 关键知识点

### 1. setdefault 核心区别
> **口诀**: "有就不动，没有才设"

```python
# 键存在 → 不覆盖
person = {"email": "alice@example.com"}
person.setdefault("email", "default@example.com")
# 结果：保持 "alice@example.com"

# 键不存在 → 添加默认值
person.setdefault("age", 18)
# 结果：添加 {"age": 18}
```

### 2. 数据结构选择
| 场景 | 推荐 |
|:---|:---|
| 有序、可变、允许重复 | 列表 |
| 有序、不可变 | 元组 |
| 键值对、快速查找 | 字典 |
| 去重、集合运算 | 集合 |

### 3. 高效写法
```python
# 求和
total = sum(scores)  # 优于循环累加

# 找最大值
best = max(data, key=data.get)  # 优于手动遍历

# 去重保序
unq = list(dict.fromkeys(numbers))  # Python 3.7+
```

---

## 📊 掌握程度

| 知识点 | 掌握度 | 备注 |
|:---|:---:|:---|
| 列表操作 | ⭐⭐⭐⭐⭐ | 推导式熟练 |
| 字典操作 | ⭐⭐⭐⭐ | setdefault 理解深入 |
| 集合去重 | ⭐⭐⭐⭐⭐ | 逻辑清晰 |
| 综合应用 | ⭐⭐⭐⭐⭐ | 能处理嵌套结构 |

**总体评分**: 19/20 - 优秀！🎉

---

## 🔧 改进点

1. **统计次数**: 用 `get(char, 0) + 1` 代替 `count()` (O(n) vs O(n²))
2. **求和操作**: 用 `sum()` 简化循环
3. **找最值**: 用 `max/min` + `key` 参数简化逻辑

---

## 📝 下一步

- [ ] 复习 Day 1-3 知识点
- [ ] 准备 Day 4: 文件操作、异常处理
- [ ] 实践项目：自动化脚本 (Day 5)

---

**记录时间**: 2026-03-22 23:30  
**下次学习**: Day 4 (文件操作、异常处理)
