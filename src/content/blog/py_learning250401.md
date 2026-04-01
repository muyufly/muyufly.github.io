---
title: "Python Learning Day1"
description: "学习基础语法和python的字典，语法糖的使用方法"
pubDate: "2026-04-01"
image: /image/pylearningCover.png
categories:
  - tech
tags:
  - Coding
  - Study
  - Python
---

# Python learning Day 1
## leetcode3
```
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int: #python类中的函数的第一个参数必须是self
        char_map = {} #初始化一个dict，{char : index}
        start = 0  #初始化指针
        max_len = 0 #初始化长度
        for end,char in enumerate(s): 
        #py通常用for...in...直接遍历;enumerate()可同时提取索引和值(形如[index,char])
            if char in char_map and char_map[char] >= start: #重复值判断
                start = char_map[char] + 1 #后移指针,操作细节，直接跳跃到该index
            char_map[char] = end #写入dict
            max_len = max(max_len,end - start + 1) #计算并写入最大长度
        return max_len

```
**总结**
* 该题应该使用查字典的方式完成，一边写入，一边查询

## leetcode206

```
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev = None #初始化prev指针，head 之前是 None
        curr = head  #初始化curr指针，从head开始处理
        while curr: #当curr不为None时
            prev , curr.next , curr = curr ,prev, curr.next
            #重点
            #将curr.next指向prev,即curr -> prev
            #将curr指针一移到curr.next的位置
            #将prev的指针移动到curr的位置
            #整体效果相当于一节一节地处理
        return prev

```

**总结**
* python能够进行多组数据的互换，运行时会自动生成一份快照，然后对多个变量赋值。
  语法：```x,y,z = y, z, x```
  效果：x == y, y == z, z===x

* 算法原理，将head前的节点作为None,依次调整之后每一个节点的指向，即将curr.next变成prev（curr指向prev）;将curr后移变成curr.next的位置，prev后移为curr的位置。直到处理完链表，即指向None。