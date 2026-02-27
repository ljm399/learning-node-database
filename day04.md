# 一。koa的其他用法

### 1.1. 静态资源服务器

Koa 本身只负责“中间件机制 + request/response 封装”，不内置静态资源托管；通常通过第三方中间件实现。

关键点：

- **[中间件选择]** 常用 `koa-static`（也有人用 `koa-mount` + `koa-static` 做路径挂载）
- **[目录定位]** 静态目录建议用 `path.join(__dirname, 'public')`，避免相对路径在不同启动目录下出问题
- **[缓存与协商]** 静态资源一般会自动处理 `ETag/Last-Modified`（取决于中间件配置），生产环境常配合 Nginx/CDN

示例：最小静态服务器（保存为 `app.js`）

```javascript
const Koa = require("koa");
const path = require("path");
const serve = require("koa-static");

const app = new Koa();

// 1) 托管静态目录
app.use(serve(path.join(__dirname, "public")));

// 2) 其它接口仍然可以继续写
app.use(async (ctx) => {
  if (ctx.path === "/ping") {
    ctx.type = "application/json";
    ctx.body = { ok: true, msg: "pong" };
    return;
  }
});

app.listen(3000);
```

补充：

- **[路由优先级]** 静态中间件放在路由前/后，会影响“同路径时谁先生效”（通常静态放前面）
- **[安全]** 不要把项目根目录直接暴露为静态目录，避免泄漏源码/配置

### 1.2.返回响应的信息

Koa 的响应主要通过 `ctx`（context）来设置。你可以把它理解为：

- `ctx.request` 封装了请求
- `ctx.response` 封装了响应
- `ctx` 本身提供了很多“代理属性/方法”，让你写起来更简洁

关键点：

- **[响应体]** `ctx.body = ...`（字符串/对象/Buffer/Stream 都可以）
- **[状态码]** `ctx.status = 200`（或 `ctx.statusCode` 不推荐）
- **[响应头]** `ctx.set('Header-Name', 'value')`
- **[类型]** `ctx.type = 'json'` 或 `ctx.type = 'application/json'`

示例：返回 JSON / 文件流

```javascript
const fs = require("fs");
const Koa = require("koa");

const app = new Koa();

app.use(async (ctx) => {
  if (ctx.path === "/json") {
    ctx.status = 200;
    ctx.type = "application/json";
    ctx.body = { ok: true, data: [1, 2, 3] };
    return;
  }

  if (ctx.path === "/download") {
    ctx.set("Content-Disposition", 'attachment; filename="a.txt"');
    ctx.type = "text/plain";
    ctx.body = fs.createReadStream("./a.txt");
    return;
  }
});
```

补充：

- **[对象会自动 JSON 化吗]** Koa 在很多场景会自动处理（取决于你是否安装了相关中间件/是否手动设置 type），为了可控，建议显式设置 `ctx.type`
- **[不要重复写入]** 同一次请求里多次赋值 `ctx.body`，后面的会覆盖前面的

### 1.3. 错误处理的方案

Koa 的错误处理通常做“集中式”：在最外层放一个 `try/catch` 中间件，捕获下游中间件抛出的异常，并统一返回响应.

关键点：

- **[同步/异步统一捕获]** 由于 Koa 推荐 `async/await`，`try/catch` 可以捕获 `await` 里的异常
- **[统一错误结构]** 建议返回统一的 `{ code, message }`，便于前端处理
- **[日志与上报]** 记录 `err.stack`，并通过 `app.on('error', ...)` 做兜底

示例：最外层错误处理中间件

```javascript
const Koa = require("koa");
const app = new Koa();

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.type = "application/json";
    ctx.body = {
      code: ctx.status,
      message: err.message || "Internal Server Error",
    };

    // 交给统一错误事件处理（日志/监控）
    ctx.app.emit("error", err, ctx);
  }
});

app.on("error", (err, ctx) => {
  // 这里通常做日志、监控上报等
  // console.error(err);
});

app.use(async (ctx) => {
  if (ctx.path === "/boom") throw new Error("something bad");
  ctx.body = "ok";
});

app.listen(3000);
```

补充：

- **[404 不是异常]** 404 通常是“路由未命中”，并不会自动 throw，需要你自己写兜底中间件
- **[不要吞掉错误]** 捕获后如果不记录日志，排查会很痛苦

# 二。koa和express的区别

### 2.1.架构上的区别

从“框架定位”上看：

- Express 更偏“全家桶”：路由、视图、静态、常用能力都很齐
- Koa 更偏“内核”：只提供更干净的中间件模型，其它能力靠中间件生态组合

关键点：

- **[上下文对象]**
  - Express：`req/res`（Node 原生 request/response 的增强）
  - Koa：`ctx`（把 request/response 聚合起来，提供大量代理属性）
- **[中间件模型]**
  - Express：线性执行，依赖 `next()`，更像“从上到下”
  - Koa：`async/await` + onion 模型，天然支持“前置/后置”逻辑
- **[核心体积]**
  - Koa 核心更小，很多能力需要自己选中间件

补充：Express 5 也在逐步增强对 Promise/async 的支持，但主流项目里 Express 4 仍然很常见。

### 2.2.执行异步代码区别

最明显的区别是：Koa 从一开始就以 Promise/`async/await` 为核心设计，而 Express 传统上以回调 + `next(err)` 为主。

关键点：

- **[错误传递]**
  - Express：异步错误需要 `next(err)` 或者借助封装（否则可能无法被错误处理中间件捕获）
  - Koa：`throw` + 外层 `try/catch` 就能统一捕获（只要 `await next()`）
- **[后置逻辑]**
  - Express：写“响应后”的逻辑不直观
  - Koa：可以很自然地在 `await next()` 之后写“后置”逻辑

示例：Koa 中间件的前置/后置

```javascript
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set("X-Response-Time", `${ms}ms`);
});
```

### 2.3.koa的洋葱模型

洋葱模型就是：请求进入时按中间件注册顺序“从外到内”执行；当下游 `await next()` 返回后，再按相反顺序“从内到外”执行。

关键点：

- **[为什么重要]** 很适合做日志、鉴权、耗时统计、事务、异常捕获等横切逻辑
- **[await next 必须写]** 不写 `await next()` 就不会进入“下一层”，也不会有回来的“后置逻辑”

示例：观察执行顺序

```javascript
app.use(async (ctx, next) => {
  console.log("A -> in");
  await next();
  console.log("A -> out");
});

app.use(async (ctx, next) => {
  console.log("B -> in");
  await next();
  console.log("B -> out");
});

app.use(async (ctx) => {
  console.log("C");
  ctx.body = "ok";
});

// 输出顺序：A in -> B in -> C -> B out -> A out
```

# 三。koa和express的源码分析

### 3.1.express的源码分析

学习源码时建议先抓“主链路”：`express()` 创建 app -> `app.listen` -> 收到请求 -> `app.handle(req,res)` -> 路由与中间件栈匹配 -> 执行。

关键点（理解层面即可）：

- **[应用对象]** `express()` 返回一个函数（也是一个对象），核心是把请求交给内部的 router
- **[中间件栈]** 通过 `app.use(...)` 维护一组 layer（层）
- **[路由匹配]** 请求进来后按注册顺序遍历栈，匹配路径/方法后依次执行

补充：Express 的“线性中间件”并不是不能做后置逻辑，而是写法通常不如 Koa 直观。

### 3.2.koa的源码分析

Koa 源码同样建议只看主链路：new `Koa()` -> `app.use` 收集中间件 -> `app.listen` 创建 http server -> 请求到来 -> 创建 `ctx` -> `compose` 把中间件串起来执行。

关键点：

- **[compose]** 把多个中间件组合成一个函数，并用 Promise 驱动洋葱模型
- **[context 创建]** 每个请求都会创建独立的 `ctx`（包含 request/response 的封装）
- **[respond]** 最后把 `ctx.body` 等信息“刷”到 Node 原生 `res` 上

补充：Koa 源码相对 Express 更“短小精悍”，很适合用来理解中间件机制。

# 四。MySql数据库学习

### 4.1.为什么需要使用数据库

当数据需要“长期保存、可查询、可并发访问、可事务保证”时，单纯用文件（`fs`）会越来越难维护，这时就需要数据库。

关键点：

- **[持久化]** 进程重启数据仍然存在
- **[结构化与约束]** 表结构、类型、约束（唯一/非空/外键）减少脏数据
- **[高效查询]** 索引 + 查询优化，适合复杂筛选/排序/聚合
- **[并发控制]** 多用户同时读写，靠锁/事务保证一致性
- **[事务]** 一组操作要么都成功要么都失败（ACID）

### 4.2.介绍常见的数据库和MySql

数据库大体可以分两类：关系型（SQL）与非关系型（NoSQL）。

关键点：

- **[关系型数据库]** MySQL、PostgreSQL、Oracle、SQL Server
  - 特点：表结构、SQL、事务强
- **[NoSQL]** MongoDB（文档）、Redis（键值）、ElasticSearch（搜索）
  - 特点：更灵活的模型/更易水平扩展（但事务/关联能力各不相同）
- **[MySQL 适用场景]** 业务系统、后台管理、订单/用户等需要强一致性的场景

补充：MySQL 是最常用的关系型数据库之一，配合 InnoDB 引擎可支持事务与行级锁。

### 4.3.MySql数据的下载和安装

关键点（Windows 常见）：

- **[版本]** 选择 MySQL Community Server（学习够用）
- **[端口]** 默认 `3306`
- **[账号]** 默认管理员用户 `root`（开发环境常用）
- **[字符集]** 建议使用 `utf8mb4`（完整支持 emoji 等字符）

补充：安装完成后，建议立刻能在命令行执行 `mysql --version`，否则通常是环境变量没配好。

### 4.4.MySql的环境变量和连接

- 配置环境变量
- 命令行连接
  - 操作
- GUI工具连接

补充：环境变量一般是把 MySQL 的 `bin` 目录加入 PATH，例如（示例路径）`C:\Program Files\MySQL\MySQL Server 8.0\bin`。

命令行连接常用：

```bash
mysql -u root -p
```

连接后常用命令：

- **[查看数据库]** `SHOW DATABASES;`
- **[选择数据库]** `USE xxx;`
- **[查看当前库]** `SELECT DATABASE();`

GUI 工具（任选其一）：

- **[MySQL Workbench]** 官方工具
- **[Navicat]** 常用（付费）
- **[DataGrip]** JetBrains 全家桶

补充：Node.js 里连接 MySQL 一般用 `mysql2`（支持 Promise）。

```javascript
const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "你的密码",
    database: "music_db",
  });

  const [rows] = await conn.execute("SELECT 1 + 1 AS result");
  console.log(rows);
  await conn.end();
}

main();
```

### 4.5.SQ语句的介绍和分类

- DDL
- DML
- DQL
- DCL

SQL（Structured Query Language）用于对关系型数据库进行“定义/增删改查/权限控制”。

关键点：

- **[DDL]** Data Definition Language：定义结构（库/表/字段）
  - 例：`CREATE/DROP/ALTER`
- **[DML]** Data Manipulation Language：操作数据（写）
  - 例：`INSERT/UPDATE/DELETE`
- **[DQL]** Data Query Language：查询数据（读）
  - 例：`SELECT ... WHERE ... ORDER BY ...`
- **[DCL]** Data Control Language：权限控制
  - 例：`GRANT/REVOKE`

补充：很多资料里也会把事务控制（`COMMIT/ROLLBACK`）单独称为 TCL（Transaction Control Language）。

### 4.6.DDL语句-数据库操作

DDL（数据库级别）常用就是：查看/选择/创建/删除数据库。

关键点：

- **[分号]** SQL 语句建议都以 `;` 结尾
- **[大小写]** 关键字通常不区分大小写（但表名/库名在不同系统上可能有差异）
- **[IF EXISTS/IF NOT EXISTS]** 用于避免重复创建或删除时报错

```sql
-- 对数据库进行操作;
-- 1.查看当前所有的数据库
SHOW DATABASES;

-- 2.使用某一个数据库
USE music_db;


-- 3.查看目前哪一个数据是选中（正在使用的数据）
SELECT DATABASE();


-- 4.创建一个新的数据库
-- CREATE DATABASE test_demo;
CREATE DATABASE IF NOT EXISTS test_demo;


-- 5.删除某一个数据库
DROP DATABASE IF EXISTS text_demo;

-- 6.修改数据库（了解，自己演练）
```

补充：改数据库（重命名等）在生产环境需要非常谨慎，常见做法是“新建 -> 迁移数据 -> 切换连接 -> 下线旧库”。
