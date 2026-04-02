---
title: "Python Learning Day2"
description: "学习pythonic的字符串列表处理方法"
pubDate: "2026-04-02"
image: /image/pylearningCover.png
categories:
  - tech
tags:
  - Coding
  - Study
  - Python
---

# PythonLearning Day2

## LeetCode125

```class Solution:
class Solution:
    def isPalindrome(self, s: str) -> bool:
        clean_lst = [ch.lower() for ch in s if ch.isalnum()]
        reverse_lst = clean_lst[ : :-1]
        clean_s = "".join(clean_lst)
        revers_s = "".join(reverse_lst)
        if clean_s == revers_s:
            return True
        else:
            return False
        
```

 ### Pythonic方法总结：

* <str>.lower:转换所有alpha字符为小写
* <str>.isalnum/isalpha/isnum:判断字符类型是否为数字/字母，返回bool
* <list>[ :   :  ]
* <char>.join(<list>): 拼接列表内的字符串

***



## LeetCode189

``` class Solution:
class Solution:
    def rotate(self, nums: List[int], k: int) -> None:
        """
        Do not return anything, modify nums in-place instead.
        """
        n = len(nums)
        k = k % n
        nums[ : ] = nums[-k: ] + nums[ : -k]
        
```

### Pythonic方法总结：

* nums[ : ] : 直接表示整个列表
* nums[-k : ] : 分割并复制(-k,列表末尾]
* nums[ : -k] : 分割并复制(列表开头，-k]
* -k表示从后往前数第k个

***



## LeetCode49

```
from collections import defaultdict
class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        ans = defaultdict(list)
        for s in strs:
            key = tuple(sorted(s))
            ans[key].append(s)
        return list(ans.values())
```

### Pythonic方法总结:

* defaultdict():自动初始化字典，如果对应的索引没有复制则填入()内的类型如(list)则填入<index>: []
* tuple(元组化sorted(s)获得的字符串)使其可作为索引
* sorted():排序字符串，使拥有相同字母的单词有相同的索引
* ans[key].append(s):在dict对应的key下扩充对应的值，用于返回值

***



## LeetCode151

```
class Solution:
    def reverseWords(self, s: str) -> str:
        t = s.split()
        t[ : ] = t[  : :-1]
        return " ".join(t)
        
```

### Pythonic方法总结:

* <str>.split：将字符串删去空格并切分转化为列表

***



## LeetCode14

```
class Solution:
    def longestCommonPrefix(self, strs: List[str]) -> str:
        res = ""
        for trdlst in zip(*strs):
            if len(set(trdlst)) == 1 :
                res += trdlst[0]
            else: break
        return res
```

### Pythonic方法总结:

* *<list>  = 'list[0]','list[1]' ... 'list[n]'
* zip(<str1>,<str2>,...) = {[str1[0],str2[0],...] ,[str1[1],str2[1],...],...]}
* set()转为集合（去重）

### 算法思想

处理一个字符串组成的列表，先解包，将每一个字符串提取出来；接着用zip组合字符相同索引为新的列表，接着用set()去重，得到的列表再用len()判断长度，若为1，则证明所有字符串的该索引相同，将这个相同的字符加入res中。





 



​    

