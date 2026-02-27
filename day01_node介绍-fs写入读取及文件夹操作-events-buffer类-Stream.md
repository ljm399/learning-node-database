# node 和 java 是想通的

# 当天看过的视频要是当天未做笔记，则重看视频

# 一。服务器开发的流程

## 补充：整体流程（从 0 到 1）

服务器开发通常围绕“**网络监听 -> 路由分发 -> 业务处理 -> 数据持久化 -> 响应**”展开：

- **[需求与接口定义]**

  - 明确 URL、方法（GET/POST…）、请求参数、返回结构、状态码。

- **[选择技术栈]**

  - 原生 `http` 适合理解底层；`express/koa` 适合快速开发。

- **[实现路由与控制器]**

  - 路由负责匹配 URL/方法；控制器负责业务逻辑。

- **[数据读写]**

  - 本地文件：`fs`；数据库：MySQL/Mongo/Redis 等。

- **[错误与日志]**

  - 统一错误处理、记录访问日志/错误日志。

- **[部署与运维]**

  - PM2/容器、环境变量、反向代理、监控告警。

### 1.1.Node 开发服务器

Node 的核心能力之一就是通过内置模块（如 `http`）直接创建 Web Server。

关键点：

- **[单线程 + 事件循环]**
  - JS 执行是单线程，但 I/O 是异步非阻塞的。
- **[请求-响应模型]**
  - 每次请求都会触发回调，拿到 `req/res` 进行处理.

示例：最小可用的 HTTP 服务器（保存为 `server.js` 运行 `node server.js`）

```js
const http = require("http");

const server = http.createServer((req, res) => {
  // 统一设置响应头，避免中文乱码
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.url === "/ping" && req.method === "GET") {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, msg: "pong" }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, msg: "not found" }));
});

server.listen(3000, "127.0.0.1", () => {
  console.log("server listening on http://127.0.0.1:3000"); // => server listening on http://127.0.0.1:3000
});
```

### 1.2. Node 和浏览器区别

Node 与浏览器都能执行 JavaScript，但运行环境和 API 差异非常大：

- **[全局对象不同]**
  - 浏览器：`window/document/location`.
  - Node：`global/process/Buffer`.
- **[API 不同]**
  - 浏览器偏 DOM/BOM.
  - Node 偏系统能力（文件/网络/进程/加密）.
- **[模块系统不同]**
  - Node 默认 CommonJS：`require/module.exports`（也支持 ESM）.
  - 浏览器现代构建工具/ESM：`import/export`.
- **[安全模型不同]**
  - 浏览器受同源策略等限制.
  - Node 直接访问文件系统/网络，权限更大也更危险.

### 1.3.Node 的架构设计

一个常见的 Node 后端项目分层（越往下越通用）：

- **[Router 层]**
  - 匹配 URL/方法，把请求交给 Controller.
- **[Controller 层]**
  - 参数校验、组装业务输入输出.
- **[Service 层]**
  - 业务逻辑聚合，便于复用与测试.
- **[DAO/Repository 层]**
  - 数据访问（数据库/文件/缓存）.
- **[Middleware/Utils]**
  - 认证鉴权、日志、限流、异常处理、通用工具.

补充：架构设计的关键是“**分离关注点**”，避免把所有逻辑都写在路由回调里.

# 二。fs 模块的使用

#### 流：即字节像水滴一样一滴一滴传过去，而不是一下子传过去

### 2.1.fs 读取文件

`fs` 是 Node 的文件系统模块.

常见读取方式：

- **[一次性读取]** `fs.readFile`：小文件简单方便.
- **[流式读取]** `fs.createReadStream`：大文件更省内存（在 Stream 章节会再讲）.

示例：读取文本文件（保存为 `read.js`）

```js
const fs = require("fs");

// 同步读取
const res1 = fs.readFileSync('./abc.txt', {encoding: 'utf8'})
console.log(res1)
console.log('后续代码') // 会在文件读取完成后执行

// 异步读取及回调函数
fs.readFile("./data.txt", { encoding: "utf-8" }, (err, content) => {
  if (err) {
    console.error("readFile error:", err);
    return;
  }
  console.log("content:", content); // => content: <文件内容>
});


// API使用：通过fs.promises.readFile()方法返回Promise对象
// 链式调用：使用.then()处理成功结果，.catch()处理错误
// 避免回调地狱：相比回调函数方式代码结构更清晰
fs.promises.readFile('./abc.txt', {encoding: 'utf-8'})
  .then(res => {
    console.log("获取到结果：", res)
  })
  .catch(err => {
    console.log("发生了错误：", err)
  })

```

#### 补充：如果不传 `encoding`，拿到的是 `Buffer`.



### 文件描述符的概念

- 操作系统机制：在常见操作系统上，内核为每个进程维护一张当前打开文件和资源的表格，每个打开的文件分配一个称为文件描述符的数字标识符。
- 系统层操作：所有文件系统操作都使用这些文件描述符来标识和跟踪特定文件，Windows系统使用类似但不同的机制。
- Node.js抽象：Node.js抽象了操作系统差异，为所有打开的文件分配数字型文件描述符，开发者无需关心底层系统差异。

#### 使用

- API选择：使用fs.open()方法打开文件，该方法不直接操作文件内容，仅建立文件连接。

- 回调参数：回调函数接收两个参数：(err, fd)，其中fd是数字类型的文件描述符。

- 错误处理：若文件不存在或无法访问，err参数将包含错误信息，需先进行错误判断。

  ```js
  const fs = require('fs');
  
  fs.open('./text.txt',(err,fd)=>{
    if(err) {
      confirm('文件打开失败',err);
    }
  
    // 获取文件描述符
    console.log(fd)
    // 读取文件内容
    fs.fstat(fd,(err,stats)=>{   ---》 fstat = file status
      if(err) return
      console.log(stats)
  
      // 记得手动关闭文件
      fs.close(fd,(err)=>{
        if(err) return
        console.log('文件关闭成功')
  
      })
    })
  
  })
  ```

- 描述符写入：可通过fs.writeFile(fd)使用文件描述符进行写入操作，与路径写入功能相同但更底层。
- 高级API：常规开发中更推荐使用fs.writeFile(path)等高级API（即下面的fs写入文件），它们内部会自动处理描述符的打开和关闭。



### 2.2.fs 写入文件

写入方式常见两种：

- **[覆盖写入]** `fs.writeFile(path, data)`：默认覆盖原文件，异步写入文件内容
- **[追加写入]** `fs.appendFile(path, data)` 或 `fs.writeFile` 配合 `{ flag: 'a' }`.

示例：覆盖写入与追加写入（保存为 `write.js`）

```js
const fs = require("fs");

fs.writeFile("./log.txt", "first line\n", { encoding: "utf-8" }, (err) => {
  if (err) return console.error(err);

  fs.appendFile("./log.txt", "second line\n", { encoding: "utf-8" }, (err2) => {
    if (err2) return console.error(err2);
    console.log("write ok"); // 没错误就会执行这里
  }); // 不推荐

  // 或 `fs.writeFile` + `{ flag: 'a' }`.
  fs.writeFile(
    // 这里就是要嵌套于另一个fs.writeFile中
    "./log.txt",
    "second line\n",
    { encoding: "utf-8", flag: "a" }, // 关键：flag: 'a' 表示 append
    (err2) => {
      if (err2) return console.error(err2);
      console.log("write ok");
    }
  );
});
```

补充：大量写入时优先用 `createWriteStream`，避免频繁系统调用

#### flag的其他值

- w：默认值，打开文件写入（不存在则创建），会覆盖原有内容

- w+：可读可写（不存在则创建）
- r：只读（读取默认值）
- r+：可读可写（不存在则抛出异常）
- a：追加写入（不存在则创建），内容添加到文件末尾
- a+：可读可追加（不存在则创建



### 2.3.fs 文件夹操作

常见目录操作：

- **[创建目录]** `fs.mkdir(path, { recursive: true })`
- { recursive: true }作用：要是下面案例中 a 或 a/b 这个目录不存在会自动补充，而不是报错
- **[读取目录]** `fs.readdir(path)`
- **[删除目录]** `fs.rm(path, { recursive: true, force: true })`（新版本 Node）



##### 文件夹操作

- 创建文件夹: 使用fs.mkdir()或fs.mkdirSync()方法创建新文件夹。
- 读取目录内容: 使用fs.readdir()方法可以获取文件夹内容，设置withFileTypes: true可以获取更详细的信息。
- 递归读取: 可以通过判断isDirectory()来递归读取子文件夹内容。
- 文件重命名: 使用fs.rename()方法可以重命名文件或文件夹。
- 示例代码:

```js
function readDirectory(dir) {
    fs.readdir(dir, {withFileTypes: true}, (err, files) => {
        files.forEach(item => {
            if(item.isDirectory()) {
                readDirectory(`${dir}/${item.name}`);
            } else {
                console.log(item.name);
            }
        });
    });
}
readDirectory('./why');
// 重命名示例
fs.rename('../why', '../coder', err => {
    console.log(err);
});
```



#####  创建文件夹

- 方法选择：提供同步(mkdirSync)和异步(mkdir)两种创建方式
- 基本语法：fs.mkdir(path[, options], callback)，其中path为文件夹路径
- 执行结果：成功创建返回null，失败返回错误对象
- 注意事项：需要确保执行用户对目标目录有写入权限

###### 2）读取目录内容

- 方法说明：使用fs.readdir读取文件夹内容
- 递归读取：可配合withFileTypes: true选项递归读取嵌套目录

#####  目录操作API

- 完整方法集
  - mkdir/mkdirSync：创建目录
  - readdir/readdirSync：读取目录
  - rmdir/rmdirSync：删除目录
- 选项参数
  - recursive：是否递归创建父目录（默认false）
  - mode：设置目录权限（八进制数）
- 错误处理：当目录已存在且recursive=false时会报错

#####  文件夹重命名

- 异步方法：使用fs.rename(oldPath, newPath, callback)进行异步重命名操作，推荐使用异步方式避免阻塞
- 参数说明
  - oldPath：原文件/文件夹路径（如'./why'）
  - newPath：新文件/文件夹路径（如'./copy'）
  - callback：回调函数接收错误参数err，成功时err为null
- 同步版本：存在同步方法fs.renameSync()但不推荐使用



- path.resolve(__dirname, "tmp"),解释

```
/project/src/app.js
console.log(__dirname);
// 输出：/project/src
```







# 三。events 模块

### 3.1.events 基本使用

- new EventEmitter()
- on
- off
- emit

`events` 的 `EventEmitter` 用来实现“发布-订阅”（观察者）模式：

- **[订阅]** `on(event, listener)`
- **[取消订阅]** `off(event, listener)`（旧版也常见 `removeListener`）
- **[发布]** `emit(event, ...args)`

示例：基本用法（保存为 `event-basic.js`）

```js
const EventEmitter = require("events");

const bus = new EventEmitter();

function onMsg(payload) {
  console.log("msg:", payload); // => msg: { text: "hello" }
}

bus.on("message", onMsg);
bus.emit("message", { text: "hello" });

bus.off("message", onMsg);
bus.emit("message", { text: "will not print" });
```

补充：EventEmitter 是很多 Node 内置对象的基类思想（如流 stream 也会发事件）.



### 3.2.events 其他方法

- eventNames

  - `eventNames()`，返回当前已注册的事件名数组.

    ```javascript
    const EventEmitter = require('events');
    const emitter = new EventEmitter();
    
    emitter.on('data', () => {});
    emitter.on('end', () => {});
    emitter.once('close', () => {});
    
    console.log(emitter.eventNames());
    输出：
    [ 'data', 'end', 'close' ]
    👉 每个事件名只出现一次
    👉 不管你这个事件上注册了多少个监听器
    ```

    

- getMaxListeners(20)

  - 设置最多监听即有 emit 是 20 个

- listeners()

  - 获取某个事件“当前已经注册的监听函数列表”

    ```javascript
    const EventEmitter = require('events');
    const emitter = new EventEmitter();
    
    function fn1() {}
    function fn2() {}
    
    emitter.on('data', fn1);
    emitter.on('data', fn2);
    
    const list = emitter.listeners('data');
    
    console.log(list)//[ [Function: fn1], [Function: fn2] ]
    emitter.listeners('data').length;//看当前注册了多少监听器
    
    ```

    | 方法             | 返回什么                       |
    | ---------------- | ------------------------------ |
    | `eventNames()`   | 有监听器的 **事件名列表**      |
    | `listeners('x')` | 事件 `x` 上的 **监听函数数组** |

- once
- prependListener

  ```javascript
  const EventEmitter = require("events");
  const emitter = new EventEmitter();
  
  emitter.on("event", () => {
    console.log("A");
  });
  emitter.on("event", () => {
    console.log("B");
  });
  emitter.prependListener("event", () => {
    console.log("FIRST"); // => FIRST（最先执行）
  });
  emitter.emit("event");
  ```

- removeAllListeners



示例：`once` 与监听器数量（保存为 `event-advanced.js`）

```js
const EventEmitter = require("events");

const ev = new EventEmitter();
ev.setMaxListeners(20);

ev.once("onlyOnce", () => {
  console.log("onlyOnce triggered"); // => onlyOnce triggered
});

ev.emit("onlyOnce");
ev.emit("onlyOnce"); // 不会再次触发

console.log("events:", ev.eventNames()); // => events: ["onlyOnce"]（示例）
console.log("max:", ev.getMaxListeners()); // => max: 20
```



# 四。Buffer 类使用

### 4.1.二进制的知识

- 二进制回顾
- 字节概念：1byte = 8bit/1kb/1M/1G
- 处理二进制的内容使用 Buffer

补充：为什么 Node 需要 Buffer？

- JS 字符串是“字符序列”，适合文本
- 网络传输/文件/图片/音视频更接近“字节序列”，需要 `Buffer` 承载.
- Node 的很多 I/O API（`fs`、`net`、`http`）底层都会产出或消费 `Buffer`.

示例：查看字符与字节（UTF-8 下中英文占用不同字节数）



```js
const s1 = "abc";
const s2 = "中文";
console.log(Buffer.byteLength(s1, "utf8")); // 3
console.log(Buffer.byteLength(s2, "utf8")); // 6（通常每个中文 3 字节）
```



### 4.2.Buffer 和字符串之间转换

核心 API：

- **[字符串 -> Buffer]** `Buffer.from(str, encoding)`
- **[Buffer -> 字符串]** `buf.toString(encoding, start?, end?)`

示例：互转（保存为 `buffer-string.js`）

```js
const buf = Buffer.from("hello中文", "utf8");
console.log(buf); // <Buffer 6c,8a>  6c这些都是由二进制转为16进制，因为二进制太长了

console.log(buf.toString("utf8")); // => hello中文
console.log(buf.toString("utf8", 0, 5)); // => hello（示例）
```



### 4.3.Buffer 的其他创建方式

- Buffer.alloc(10)

补充常见创建方式：

- **[Buffer.alloc]** 分配并用 0 填充，安全但稍慢.
- **[Buffer.allocUnsafe]** 只分配不清零，快但可能包含旧内存数据（需要你自己覆盖）.

示例：填充与写入（保存为 `buffer-create.js`）

```js
const b1 = Buffer.alloc(10);
b1.write("hi");
console.log(b1); // => <Buffer 68 69 00 00 00 00 00 00 00 00>（示例）
console.log(b1.toString("utf8")); // => hi\u0000\u0000...（后面是填充的 0）

const b2 = Buffer.allocUnsafe(10);
b2.fill(0); // 生产代码里如果用 allocUnsafe，建议立即覆盖
console.log(b2); // => <Buffer 00 00 00 00 00 00 00 00 00 00>（示例）
```



### 4.4.Buffer 源码创建过程

- 默认给8\*1024 字节大小的空间

  - 作用：Node 为了减少频繁向系统申请内存，内部对小 Buffer 有“内存池（pool）”机制.

  - 所以很多小 Buffer 分配可能来自同一块预分配内存（常见默认 8KB）.

  - 当内容大于内部设置的8kb，则通常会单独分配.


- 结论：大量小 Buffer 创建更快，但也要注意生命周期与内存占用.





# 五。Stream 的使用

### 5.1.Stream 的概念理解

Stream（流）用于“边读边处理/边写”，典型应用是大文件、网络传输.

- **[核心优势]**
  - **省内存**：不会一次性把整个文件读进来.
  - **可组合**：通过 `pipe` 把多个流连接起来.
- **[常见类型]**
  
  - Readable（可读流）
  - Writable（可写流）
  - Duplex（双工）
  - Transform（转换）
  
  

示例：对比 `readFile` 与流式读取的直观差异：

- `readFile`：一次性拿到全部内容.
- Stream：分多次触发 `data` 事件（chunk）.



### 5.2.可读流的使用 Readable

示例：读取大文件并统计字节数（保存为 `readable.js`）

```js
const fs = require("fs");

const rs = fs.createReadStream("./big.dat");
const readStream = fs.createReadStream('./aaa.txt', {
  start: 8,
  end: 22,
  highWaterMark: 3
})
start：从指定位置开始读取（字节位置）
end：读取到指定位置结束（包含该位置字节）
highWaterMark：每次读取的字节数，默认64KB


readStream.on('open', (fd) => {
  console.log('通过流将文件打开~', fd)
})
触发时机：文件被流成功打开时触发
回调参数：接收文件描述符fd，可用于获取文件信息
执行顺序：总是先于data事件触发


readStream.on('end', () => {
  console.log('已经读取到end位置')
  readStream.close()// 手动关闭，下面的close不用
})（推荐用下面的close）
触发时机：读取到指定的end位置或文件末尾时触发
特点：即使不指定end参数，读取到文件末尾也会触发


readStream.on('close', () => {
  console.log('文件被关闭')
})（推荐用）
触发时机：文件读取结束且被自动关闭时触发
自动关闭：不需要手动调用close方法
```



- 其他案例

  ```js
  readStream.on('data', (data) => {
    console.log(data.toString())
    readStream.pause() // 暂停读取
    setTimeout(() => {
      readStream.resume() // 2秒后恢复读取
    }, 2000)
  })
  ```

  



### 5.3.可写流的使用 Writable

示例：写入文件并监听完成（保存为 `writable.js`）

```js
const fs = require("fs");

const ws = fs.createWriteStream("./out.txt", { encoding: "utf-8" });

ws.write("line1\n");
ws.write("line2\n");
ws.end("done\n");

ws.on("finish", () => {
  console.log("write finished"); // => write finished
});

ws.on("error", (err) => {
  console.error("write stream error:", err);
});
```



##### 1. 可写流基本使用 ﻿

- 与传统写入区别：传统使用fs.writeFile()是一次性写入所有内容，而可写流允许分批次写入大文件
- 适用场景：特别适合处理视频流、音频流等大文件（几百兆级别）的写入操作

###### 2）创建文件的可写流 ﻿

- 基本语法：const writeStream = fs.createWriteStream(path[, options])
- 参数说明
  - path：要写入的文件路径（如'./ccc.txt'）
  - options：可选配置对象，包含：
    - flags：文件操作标志（默认'w'，追加写入用'a'或'a+'）
    - encoding：字符编码（默认'utf-8'）
    - start：指定写入起始位置（字节偏移量）

###### 3）写入流方法 ﻿

- write方法
  - 语法：writeStream.write(chunk[, encoding][, callback])
  - 特点：可多次调用，每次写入指定内容
  - 回调参数：err表示写入是否成功（null表示成功）
- end方法
  - 语法：writeStream.end([chunk][, encoding][, callback])
  - 功能：执行两步操作：1)写入最后内容 2)关闭文件
  - 注意：调用end后不能再调用write方法
- 例题:写入流使用 
  - 典型用法：

```
writeStream.write('coderwhy')
writeStream.write('aaaa')
writeStream.write('bbbb', (err) => {
  console.log("写入完成：", err)
})
writeStream.end('哈哈哈哈')
```

###### 4）可写流的参数 

- flags参数
  - 'w'：默认值，覆盖写入
  - 'a'/'a+'：追加写入（a+可读可写）
  - 'r+'：可读可写，不截断文件
- start参数
  - 指定写入起始位置（字节偏移）
  - 注意：在追加模式(a/a+)下start可能无效
- 例题:可写流写入 
  - 参数配置示例：

```
const writer = fs.createWriteStream("./foo.txt", {
  flags: "a+",
  start: 8
})
```

###### 5）open事件的监听 ﻿

- 事件触发：文件被打开时触发
- 回调参数：fd（文件描述符）
- 典型用法：

```
writeStream.on('open', (fd) => {
  console.log('文件被打开', fd)
})
```

###### 6）close的监听

- 注意事项
  - 必须手动调用close()或end()才会触发
  - 不会自动关闭（与可读流不同）
- 相关事件
  - finish：写入完成事件（对应可读流的end事件）
  - close：文件关闭事件
- 典型用法：

```
writeStream.on('close', () => {
  console.log('文件被关闭~')
})
writeStream.on('finish', () => {
  console.log("文件写入结束")
})
```



### 5.4.pipe 可读可写流连接一起

`pipe` 用于把可读流的数据自动流向可写流，并处理背压

优势：相比手动监听数据事件并写入，使用管道方法代码更简洁高效。

示例：

案例1：复制文件（保存为 `pipe.js`）

```js
const fs = require("fs");
fs.createReadStream("./big.dat")
  .pipe(fs.createWriteStream("./big-copy.dat"))
  .on("finish", () => {
    console.log("copy done"); // => copy done
  });
```

##### 案例2：文件的拷贝流操作 （对案例1的补充）

- 方式一：一次性读写

  - 缺点：不适合大文件操作，无法精准控制读写过程

    ```
    fs.readFile(".foo.txt",(err,data)=>{
    	fs.writeFile("./foo1.txt",data,(err)=> { -- 一定要写第三个参数及回调函数，否则报错
    		clg(err) 
    	})
    })
    ```

- 方式二：流式读写

  ```js
  const reader = fs.createReadStream("./foo.txt")
  const write = fs.createReadStream("./bar.txt")
  reader.on("data",(data)=> {
  	write.write(data,(err)=>{
  		clg(err)
  	})
  })
  ```

  

- 方式三：管道方法

  - 优势：代码最简洁，自动处理数据流动和关闭操作

  - 适用场景：适合大文件操作和需要高效数据传输的场景

    ```jsx
    const reader = fs.createReadStream("./foo.txt")
    const write = fs.createReadStream("./bar.txt")
    reader.pipe(write)
    ```

- 典型应用：文件复制、网络数据传输、数据转换处理等场景

- 注意事项：管道建立后会自动处理数据流动，无需手动监听数据事件
