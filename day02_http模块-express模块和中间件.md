# 一。http 模块

### 1.1.http 创建服务器

`http` 是 Node 内置模块，用来创建 HTTP Server。

核心流程：

- **[创建服务]** `http.createServer((req, res) => {})`
- **[监听端口]** `server.listen(port, host, cb)`
- **[根据 req 处理并用 res 返回]**

示例：最小路由分发（保存为 `01-http-server.js`）

```js
const http = require("http");
const { URL } = require("url");

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (url.pathname === "/home" && req.method === "GET") {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        page: "home",
        query: Object.fromEntries(url.searchParams),
      })
    );
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ msg: "not found" })); // => {"msg":"not found"}
});

server.listen(3000, "127.0.0.1", () => {
  console.log("http://127.0.0.1:3000"); // => http://127.0.0.1:3000
});
```

### 1.2.http 的其他细节

- http.createServer 本质 new Server
- server.listen(port, host, callback)

补充理解：

- **[`createServer` 的返回值]**
  - 返回的是一个 `Server` 实例（继承自 `EventEmitter`），内部会发出 `request` 事件。
- **[`listen` 的参数]**
  - `port`：端口。
  - `host`：绑定的网卡地址（开发常用 `127.0.0.1` 或省略表示所有网卡）。
  - `callback`：监听成功后回调。

示例：监听 `request` / `close` 事件（保存为 `02-server-events.js`）

```js
const http = require("http");

const server = http.createServer();

server.on("request", (req, res) => {
  res.end("ok");
});

server.on("close", () => {
  console.log("server closed"); // => server closed
});

server.listen(3000, () => console.log("listening")); // => listening
```

### 1.3.额外知识补充

- 浏览器 =》 postman
- npm install nodemon -g
  - node monitor

补充说明：

- **[Postman]**
  - 方便测试 GET/POST/PUT/DELETE、Header、Body、上传文件等。
- **[nodemon]**
  - 监听文件变化自动重启 Node 进程。
  - 全局安装后可以：`nodemon app.js`（替代 `node app.js`）。

### 1.4.request 对象

- request.url
  - 判断不同 url
- request.method
  - 判断不同的请求方式
- request 的 headers

补充：`req`（IncomingMessage）常用字段

- **[`req.url`]** 只包含路径与查询参数（不含协议与域名）。
- **[`req.method`]** 如 `GET/POST/...`.
- **[`req.headers`]** 请求头对象（key 通常是小写）。

示例：打印关键信息（保存为 `03-request.js`）

```js
const http = require("http");

http
  .createServer((req, res) => {
    console.log("method:", req.method); // => method: GET（示例）
    console.log("url:", req.url); // => url: /ping（示例）
    console.log("content-type:", req.headers["content-type"]); // => content-type: application/json（示例）

    res.end("ok");
  })
  .listen(3000);
```

### 1.5.request 携带参数

- queryString
- body=》请求体
  - req.on("data",data=>{})

常见参数来源：

- **[QueryString]** `/products?page=1&pageSize=10`
- **[Body]**
  - `application/json`
  - `application/x-www-form-urlencoded`
  - `multipart/form-data`（文件上传）

示例：解析 query 与 JSON body（保存为 `04-parse-params.js`）

```js
const http = require("http");
const { URL } = require("url");

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams);

    if (req.method === "POST" && url.pathname === "/login") {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        let json;
        try {
          json = JSON.parse(body || "{}");
        } catch {
          res.statusCode = 400;
          res.end("invalid json");
          return;
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ query, body: json }));
      });
      return;
    }

    res.end("ok");
  })
  .listen(3000);
```

补充：`data` 可能触发多次，所以要累加，最后在 `end` 里统一处理。

### 1.6.Response 响应对象

- 写出响应数据
  - res.write()
  - res.end()
- 响应的状态码
  - res.statusCode = 201
  - res.writeHead(401)
- 响应的 headers
  - res.etHeader("Contend-Type","application/json:charst=utf8")

补充：`res`（ServerResponse）常用能力

- **[状态码]**
  - `res.statusCode = 201`
  - `res.writeHead(401, headers)` 一次性写入状态码与 headers
- **[响应头]**
  - 正确方法是 `res.setHeader(name, value)`
  - 常用 `Content-Type: application/json; charset=utf-8`
- **[响应体]**
  - `res.write` 可以写多次
  - `res.end` 结束响应（可传最后一段数据）

示例：返回 JSON + 自定义状态码（保存为 `05-response.js`）

```js
const http = require("http");

http
  .createServer((req, res) => {
    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ created: true }));
  })
  .listen(3000);
```

### 1.7.axios 在 node 中本质

- http 模块发送网络请求
- http.get
- http.request()
  - end

补充理解：

- 浏览器里 axios 底层基于 XHR / fetch.
- Node 里 axios 底层基于 `http/https`（或更高层封装库）。

示例：Node 使用 `http.get` 发起 GET（保存为 `06-http-client.js`）

```js
const http = require("http");

http
  .get("http://127.0.0.1:3000/ping", (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log("status:", res.statusCode); // => status: 200（示例）
      console.log("body:", data); // => body: <响应体字符串>
    });
  })
  .on("error", (err) => {
    console.error("request error:", err);
  });
```

示例：使用 `http.request` 自定义 method/headers（保存为 `07-http-request.js`）

```js
const http = require("http");

const req = http.request(
  {
    hostname: "127.0.0.1",
    port: 3000,
    path: "/login",
    method: "POST",
    headers: { "Content-Type": "application/json" },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => console.log(data)); // => {"query":...,"body":...}（示例，实际是字符串）
  }
);

req.end(JSON.stringify({ username: "admin", password: "123" }));
```

### 1.8.http 模块文件上传

- 获取 data,对 data 进行截取，拿到数据存储到文件中
- 浏览器中 axios 文件上传的操作

补充：原生 `http` 处理文件上传，核心难点是解析 `multipart/form-data`.

- 请求头里会有：`Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryxxx`
- 请求体是按 boundary 分段的：每段有自己的 headers（字段名、文件名、类型）+ 二进制内容。

在生产项目里通常会用成熟库来做解析（如在 express/koa 里用 `multer`），原生手写解析容易踩坑（编码、边界截断、内存占用等）。

下面示例只演示“把上传请求体完整写入文件”的思路（不做 multipart 真正解析），用来理解数据流向：

```js
const http = require("http");
const fs = require("fs");

http
  .createServer((req, res) => {
    if (req.method === "POST" && req.url === "/upload") {
      const ws = fs.createWriteStream("./raw-upload.bin");
      req.pipe(ws);
      ws.on("finish", () => {
        res.end("upload received (raw)");
      });
      ws.on("error", () => {
        res.statusCode = 500;
        res.end("write error");
      });
      return;
    }

    res.end("ok");
  })
  .listen(3000);
```

# 二。 express 框架

### 2.1.express 概览介绍

Express 是基于 Node `http` 的 Web 框架，帮你解决：

- **[路由]** URL/方法匹配更方便。
- **[中间件]** 把认证、日志、解析 body 等能力模块化。
- **[更友好的 API]** `res.json()`、`res.status()` 等.

本质上：Express 还是启动了一个 `http` server，只是帮你把 request/response 处理流程组织起来。

### 2.2.express 基本使用

示例：最小 express 服务（保存为 `express-basic.js`）

```js
const express = require("express");

const app = express();

app.get("/ping", (req, res) => {
  res.json({ ok: true, msg: "pong" });
});

app.listen(3000, () => {
  console.log("express listening on http://127.0.0.1:3000"); // => express listening on http://127.0.0.1:3000
});
```

补充：`app.get/post/put/delete` 等方法，本质就是“注册路由 + 回调”。

### 2.3.express 中间件

- get（"/home",中间件）
- use（中间件）
- 中间件：------》 解释：可以放一个回调函数，这个回调函数可以调用任何值，可以对res、req处理，可以next
  - （req,res,next）

补充理解：中间件就是一个函数 `(req, res, next) => {}`.

- **[next]**
  - 调用 `next()` 才会进入下一个中间件/路由.
  - 不调用且不结束响应（`res.end/res.send/res.json`），请求会“卡住”.
- **[use 与 路由方法的差异]**
  - `app.use(mw)`：匹配所有方法（GET/POST…），默认前缀匹配.
  - `app.get('/path', mw)`：只匹配 GET + 路径.

示例：全局中间件 + 路由中间件 + 错误处理中间件（保存为 `express-middleware.js`）

```js
const express = require("express");

const app = express();

app.use((req, res, next) => {
  console.log("time:", Date.now(), "path:", req.path); // => time: <时间戳> path: /home（示例）
  next();
});

app.get("/home", (req, res, next) => {
  if (!req.query.token) {
    next(new Error("missing token"));
    return;
  }
  res.json({ page: "home" });
});

// 错误处理中间件：4 个参数，必须放在最后
app.use((err, req, res, next) => {
  res.status(400).json({ ok: false, message: err.message });
});

app.listen(3000);
```

补充：body 解析在 express 里通常用内置：

```js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```
