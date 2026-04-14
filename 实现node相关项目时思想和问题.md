# 首先知道你的问题是什么



## console.log安装什么配置可clg

你这个需求本质就是 **代码片段（Snippet）自动补全**，在 Visual Studio Code 里有三种常见做法，从简单到进阶我给你说清楚👇

------

### ✅ 方法一：安装插件

直接装这个插件：

👉 **ES7+ React/Redux Snippets**

### 效果：

输入：

```
clg
```

自动补全：

```js
console.log();
```

还支持：

- `clo` → `console.log(object)`
- `clt` → `console.table()`

📌 优点：
✔ 开箱即用
✔ 不用自己配置
✔ 前端开发常用

------

### ✅ 方法二：自己写 Snippet（更灵活）（代码块）

如果你不想装插件，可以自己配👇

### 步骤：

1. 打开 VSCode
2. 按：

```
Ctrl + Shift + P
```

1. 输入：

```
snippets
```

1. 选择：

```
Preferences: Configure User Snippets
```

1. 选择：

```
javascript.json
```

------

### ✍️ 添加下面代码：

```json
{
  "console log": {
    "prefix": "clg",
    "body": [
      "console.log($1);"
    ],
    "description": "Log output to console"
  }
}
```

------

### 效果：

输入：

```
clg
```

按 `Tab` → 自动变：

```js
console.log();
```

------

### ✅ 方法三：更骚一点（带变量）

你还可以搞高级点👇

```json
"console log variable": {
  "prefix": "clg",
  "body": [
    "console.log('$1:', $1);"
  ]
}
```

👉 输入：

```
clg user
```

👉 变成：

```js
console.log('user:', user);
```

------

愿意，我可以帮你配一套**前端高频Snippet合集（Vue / JS / 小程序）**，直接让你开发效率起飞。