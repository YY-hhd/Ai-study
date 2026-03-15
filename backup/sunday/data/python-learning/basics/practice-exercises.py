#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Python 基础练习代码
学习时间：2026-03-08
"""

# ==================== 练习 1: 计算器 ====================
def calculator(a, b, operator):
    """
    简单计算器
    支持 +, -, *, / 运算
    """
    if operator == '+':
        return a + b
    elif operator == '-':
        return a - b
    elif operator == '*':
        return a * b
    elif operator == '/':
        if b != 0:
            return a / b
        else:
            return "错误：除数不能为 0"
    else:
        return "错误：无效的运算符"

# 测试
print("=== 计算器测试 ===")
print(f"10 + 5 = {calculator(10, 5, '+')}")
print(f"10 - 5 = {calculator(10, 5, '-')}")
print(f"10 * 5 = {calculator(10, 5, '*')}")
print(f"10 / 3 = {calculator(10, 3, '/')}")
print(f"10 / 0 = {calculator(10, 0, '/')}")


# ==================== 练习 2: 字符串字符统计 ====================
def count_characters(text):
    """
    统计字符串中每个字符出现的次数
    返回字典
    """
    char_count = {}
    for char in text:
        if char in char_count:
            char_count[char] += 1
        else:
            char_count[char] = 1
    return char_count

# 测试
print("\n=== 字符统计测试 ===")
text = "hello python"
result = count_characters(text)
print(f"文本：'{text}'")
print(f"统计结果：{result}")


# ==================== 练习 3: 猜数字游戏 ====================
import random

def guess_number_game():
    """
    猜数字游戏（1-100）
    """
    target = random.randint(1, 100)
    attempts = 0
    
    print("\n=== 猜数字游戏 ===")
    print("我已经想好了一个 1-100 之间的数字")
    
    while True:
        try:
            guess = int(input("请输入你的猜测（1-100）："))
            attempts += 1
            
            if guess < target:
                print("猜小了！再试一次。")
            elif guess > target:
                print("猜大了！再试一次。")
            else:
                print(f"🎉 恭喜你！猜对了！数字是 {target}")
                print(f"你总共猜了 {attempts} 次")
                break
        except ValueError:
            print("请输入有效的数字！")


# ==================== 练习 4: 列表操作 ====================
def list_operations():
    """
    列表操作练习
    """
    print("\n=== 列表操作练习 ===")
    
    # 创建列表
    numbers = list(range(1, 11))
    print(f"原始列表：{numbers}")
    
    # 计算总和
    print(f"总和：{sum(numbers)}")
    
    # 最大值和最小值
    print(f"最大值：{max(numbers)}")
    print(f"最小值：{min(numbers)}")
    
    # 反转列表
    reversed_nums = numbers[::-1]
    print(f"反转后：{reversed_nums}")
    
    # 排序（降序）
    sorted_nums = sorted(numbers, reverse=True)
    print(f"降序排序：{sorted_nums}")


# ==================== 练习 5: 字典单词统计 ====================
def count_words(text):
    """
    统计文本中每个单词出现的次数
    """
    words = text.lower().split()
    word_count = {}
    
    for word in words:
        # 去除标点符号
        word = word.strip('.,!?;:"\'')
        if word:
            if word in word_count:
                word_count[word] += 1
            else:
                word_count[word] = 1
    
    return word_count

# 测试
print("\n=== 单词统计测试 ===")
text = "Python is great Python is awesome I love Python"
result = count_words(text)
print(f"文本：'{text}'")
print(f"统计结果：{result}")


# ==================== 练习 6: 集合去重 ====================
def remove_duplicates(numbers):
    """
    使用集合去除列表中的重复元素
    """
    return list(set(numbers))

# 测试
print("\n=== 集合去重测试 ===")
numbers = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5]
print(f"原始列表：{numbers}")
print(f"去重后：{remove_duplicates(numbers)}")


# ==================== 练习 7: 列表推导式练习 ====================
def list_comprehension_examples():
    """
    列表推导式示例
    """
    print("\n=== 列表推导式练习 ===")
    
    # 1. 生成平方数列表
    squares = [x**2 for x in range(1, 11)]
    print(f"1-10 的平方：{squares}")
    
    # 2. 过滤偶数
    evens = [x for x in range(1, 21) if x % 2 == 0]
    print(f"1-20 的偶数：{evens}")
    
    # 3. 嵌套列表推导式
    matrix = [[i*j for j in range(1, 4)] for i in range(1, 4)]
    print(f"乘法表：{matrix}")
    
    # 4. 字典推导式
    square_dict = {x: x**2 for x in range(1, 6)}
    print(f"平方字典：{square_dict}")


# ==================== 主程序 ====================
if __name__ == "__main__":
    print("=" * 50)
    print("Python 基础练习代码")
    print("学习时间：2026-03-08")
    print("=" * 50)
    
    # 运行所有练习
    list_operations()
    list_comprehension_examples()
    
    print("\n" + "=" * 50)
    print("练习完成！")
    print("=" * 50)
    
    # 可选：运行交互式游戏
    # guess_number_game()
