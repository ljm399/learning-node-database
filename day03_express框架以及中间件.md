# 一。express 框架

### 1.1. 中间件的深入理解

- 普通的中间件
- 路径匹配的中间件
- 路径和方法匹配的中间件
- 注册多个中间件
  - app.get("/abc",中间件 1，中间件 2)
- 匹配规则
  - 发送请求，匹配到第一个符合规则的中间件，执行这个中间件
  - 只有调用 next 才会执行下面的中间件
- 中间件的练习
  - 匹配正确的中间件

补充：中间件的执行模型（从请求进入到响应结束）

- Express 会维护一个“中间件/路由栈”。
- 每个中间件决定：
  - **[结束响应]**（`res.end/res.send/res.json`），流程终止。
  - **[调用 next]**，把控制权交给下一个匹配项.
  - **[抛错/next(err)]**，跳转到错误处理中间件.

几种常见注册方式：

- **[普通中间件]** `app.use((req,res,next)=>{})`：匹配所有方法、默认前缀匹配.
- **[路径匹配]** `app.use('/users', mw)`：只要以 `/users` 开头都会进入.
- **[路径 + 方法匹配]** `app.get('/users', mw)`：只匹配 GET + `/users`.
- **[同一路由多个中间件]** `app.get('/abc', mw1, mw2, handler)`：按顺序执行.

示例：观察匹配与 next 的效果（保存为 `express-mw-flow.js`）

```js
const express = require("express");

const app = express();

app.use((req, res, next) => {
  console.log("mw1", req.method, req.path); // => mw1 GET /users（示例）
  next();
});

app.use("/users", (req, res, next) => {
  console.log("mw2 /users"); // => mw2 /users
  next();
});

app.get(
  "/users",
  (req, res, next) => {
    console.log("mw3 GET /users"); // => mw3 GET /users
    next();
  },
  (req, res) => {
    res.json({ ok: true });
  }
);

app.listen(3000);
```

### 1.2. 中间件的应用案例

- body 手动解析
- express.json()
- express.urlencoded(extended:true)
  - 作用：解析表单 `application/x-www-form-urlencoded`.

- 日志记录中间件：
  - morgan =》 express 官方提供/ 单独安装
- 文件上传的中间件
  - multer
    - 但文件夹
    - 自定义名称
    - 多文件上传
    - 解析 formdata

补充：常见中间件“解决什么问题”

- **[body 解析]**
  - `express.json()`：解析 `application/json`.
  - `express.urlencoded({ extended: true })`：解析表单 `application/x-www-form-urlencoded`.
- **[日志]**
  - `morgan` 负责记录访问日志（方法、路径、耗时、状态码等）.
- **[上传]**
  - `multer` 用于解析 `multipart/form-data`,把文件保存到磁盘或内存，并把结果挂到 `req.file/req.files`.

示例：启用内置 body 解析 + 记录基本日志（保存为 `express-body-log.js`）

```js
const express = require("express");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(req.method, req.path); // => POST /login（示例）
  next();
});

app.post("/login", (req, res) => {
  res.json({ body: req.body });
});

app.listen(3000);
```

示例：multer 单文件上传（需要安装 `multer`）（保存为 `express-upload.js`）

```js
const express = require("express");
const multer = require("multer");
const path = require("path");

const app = express();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.resolve(__dirname, "uploads"));// 保存文件的位置
  },
  filename(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // 文件的名称
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("avatar"), (req, res) => { -- 单个文件上传
  res.json({ file: req.file });
});

app.post("/upload", upload.array("avatar"), (req, res) => { -- 多个文件上传
  res.json({ file: req.file });
});

app.listen(3000);
```

### 1.3.客户端传递的参数

- 五种参数的解析

补充：Express 常见 5 种参数来源

- **[params]** 路径参数：`/users/:id` -> `req.params.id`
- **[query]** 查询参数：`/users?page=1` -> `req.query.page`
- **[body]** 请求体：`req.body`（需要 body 解析中间件）
- **[headers]** 请求头：`req.headers` / `req.get('Header-Name')`
- **[cookies]** 需要 cookie 解析（如 `cookie-parser`）后才方便使用：`req.cookies`

示例：params + query + body + header（保存为 `express-params.js`）

```js
const express = require("express");

const app = express();
app.use(express.json());

app.post("/users/:id", (req, res) => {
  res.json({
    params: req.params,
    query: req.query,
    body: req.body,
    token: req.get("authorization"),
  });
});

app.listen(3000);
```

### 1.4.服务器相应数据方式

- end
- json 方法
- status 方法：状态码

补充：Express 响应方式对比

- **[`res.end`]** 更偏底层（和原生 `http` 接近）.
- **[`res.send`]** 智能返回字符串/Buffer/对象.
- **[`res.json`]** 返回 JSON，并自动设置 `Content-Type`.
- **[`res.status(code)`]** 链式设置状态码：`res.status(201).json(...)`.

示例：不同响应方式（保存为 `express-response.js`）

```js
const express = require("express");

const app = express();

app.get("/a", (req, res) => {
  res.end("plain");
});

app.get("/b", (req, res) => {
  res.send("hello");
});

app.get("/c", (req, res) => {
  res.status(201).json({ created: true });
});

app.listen(3000);
```

### 1.5.express 的路由使用

- express.Router()

补充：Router 的价值

- 把不同业务模块拆到不同文件（`userRouter/productRouter`）.
- 支持给一组路由统一加前缀和中间件.

示例：Router 拆分（概念示例）

```js
const express = require("express");

const app = express();

const userRouter = express.Router();
userRouter.get("/", (req, res) => res.json([{ id: 1 }]));
userRouter.get("/:id", (req, res) => res.json({ id: req.params.id }));

app.use("/users", userRouter);

app.listen(3000);
```

### 1.6.express 静态资源服务器

补充：`express.static`

- 用于把某个目录映射为静态资源目录（HTML/CSS/JS/图片等）.
- 常用于：
  - 提供前端打包产物（`dist`）
  - 提供图片、上传文件访问
  - 直接浏览器输入 http：// localhost：9000/ + 文件名称 就可以直接访问

示例：把 `public` 目录作为静态资源（保存为 `express-static.js`）

```js
const express = require("express");
const path = require("path");

const app = express();

app.use("/static", express.static(path.resolve(__dirname, "public")));

app.listen(3000);
```

### 1.7.express 中错误处理方案

补充：Express 错误处理常见做法

- **[同步错误]**
  - 在路由里 `throw new Error()` 或 `next(err)`，会进入错误处理中间件.
- **[异步错误]**
  - 回调/Promise 内要用 `next(err)` 或 `try/catch` 包裹.
- **[错误处理中间件签名]**
  - `(err, req, res, next) => {}`，并且要放在所有路由之后.

示例：统一错误返回（保存为 `express-error.js`）

```js
const express = require("express");

const app = express();

app.get("/fail", (req, res, next) => {
  next(new Error("something wrong"));
});

app.use((err, req, res, next) => {
  res.status(500).json({ ok: false, message: err.message });
});

app.listen(3000);
```

# 二。Koa 框架 -- 又称洋葱模型

### 2.1.koa 的基本使用

Koa 是更轻量的 Node Web 框架，特点：

- **[核心很小]** 只提供中间件机制，不内置路由（需要手动安装 `@koa/router`）.
- **[洋葱模型]** 中间件可以在 `await next()` 前后做“进入/退出”逻辑.
  - 弥补了express只能处理同步请求，不能处理异步请求的缺陷


示例：最小 Koa 服务（保存为 `koa-basic.js`）

```js
const Koa = require("koa");

const app = new Koa();

app.use((ctx) => {
  ctx.body = { ok: true };
});

app.listen(3000);
```

### 2.2.koa 中间件 ctx 参数

补充：`ctx`（context）是 Koa 封装后的上下文对象，常用属性：

- **[请求]**
  - `ctx.request`（koa内部内置的） / `ctx.req`（原生）
  - `ctx.method` / `ctx.path` / `ctx.query` / `ctx.headers`
- **[响应]**
  - `ctx.response`（koa专有的） / `ctx.res`（原生）
  - `ctx.status` / `ctx.body` / `ctx.set()`

示例：洋葱模型日志 --- 请求耗时多少

```js
const Koa = require("koa");

const app = new Koa();

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const cost = Date.now() - start;
  console.log(ctx.method, ctx.path, cost + "ms");
});

app.use((ctx) => {
  ctx.body = { msg: "hello" };
});

app.listen(3000);
```

### 2.3.手动区分路径和方法

补充：Koa 核心不提供路由时，你可以手动判断：

```js
const Koa = require("koa");

const app = new Koa();

app.use((ctx) => {
  if (ctx.method === "GET" && ctx.path === "/ping") {
    ctx.body = { ok: true };
    return;
  }
  ctx.status = 404;
  ctx.body = { msg: "not found" };
});

app.listen(3000);
```

缺点：路由复杂后会难维护，所以一般使用 `@koa/router`.

### 2.4.创建 koa 的路由@koa/router

`@koa/router` 是 Koa 生态里最常用的路由库.

示例：路由与前缀（需要安装 `@koa/router`）（保存为 `koa-router.js`）

```js
const Koa = require("koa");
const Router = require("@koa/router");

const app = new Koa();
const router = new Router({ prefix: "/users" }); --》 /users就是前缀

router.get("/", (ctx) => {
  ctx.body = [{ id: 1 }];
});

router.get("/:id", (ctx) => {
  ctx.body = { id: ctx.params.id };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);
```

### 2.5.koa 中五种数据解析方法

补充：Koa 常见 5 种参数来源（与 Express 类似）

- **[params]** `ctx.params`（需要路由库支持，如 `@koa/router`）
- **[query]** `ctx.query`
- **[body]** 需要 body 解析中间件（如 `koa-bodyparser`）
- **[headers]** `ctx.headers` / `ctx.get(name)`
- **[cookies]** `ctx.cookies.get(name)` / `ctx.cookies.set(name, value)`

示例：解析 JSON body（需要安装 `koa-bodyparser`）（保存为 `koa-body.js`）

```js
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");

const app = new Koa();

app.use(bodyParser());

app.use((ctx) => {
  ctx.body = { body: ctx.request.body };
});

app.listen(3000);
```

### 2.6.koa 文件上传的处理

- multer @koa/multer

补充：Koa 上传通常使用 `@koa/multer`（和 Express 版本的 multer 思想一致）.

示例：单文件上传（需要安装 `@koa/multer`）（保存为 `koa-upload.js`）

```js
const Koa = require("koa");
const Router = require("@koa/router");
const multer = require("@koa/multer");
const path = require("path");

const app = new Koa();
const router = new Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.resolve(__dirname, "uploads"));  ---》 path.resolve(__dirname, "uploads")可以改为'./uploads'
  },
  filename(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);   ---> file.originalname就是文件后缀，不加编辑器则打不开，也可以自己手动加后缀,jpg和png图片编码格式相同，所以加那个都可以显示
  },
});

const upload = multer({ storage });

// 单个图片
router.post("/upload", upload.single("avatar"), (ctx) => {
  ctx.body = { file: ctx.request.file };
});

// 多个图片、
router.post('/photos', upload.array('photos'), (ctx,next) => {
    ctx.body = '文件上传成功'
})

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);
```
