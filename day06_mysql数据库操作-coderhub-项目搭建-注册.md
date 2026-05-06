# 一。MySql数据库操作

### 1.1.将查询的结果转化为对象和数据类型

- JSON_OBJECT
- JSO_ARRAYAGG

很多时候我们希望接口直接返回“嵌套结构”（对象/数组），而不是在 Node 层再手动拼装，这时可以用 MySQL 的 JSON 函数把结果聚合成 JSON。

关键点：

- **[JSON_OBJECT]** 把多列拼成一个 JSON 对象
- **[JSON_ARRAYAGG]** 把多行聚合成一个 JSON 数组（你这里写的 `JSO_ARRAYAGG` 通常指它）
- **[JSON 类型 vs 字符串]** JSON 函数返回的是 JSON 值，但很多客户端会以字符串形式拿到；要看驱动是否自动解析
- **[NULL 处理]** 聚合时遇到 NULL 值的行为要注意（例如某些字段可能不存在）

示例：把一行转成对象

```sql
SELECT JSON_OBJECT(
  'id', id,
  'name', name,
  'email', email
) AS user
FROM user
WHERE id = 1;
```

示例：把多行转成数组（聚合）

```sql
SELECT JSON_ARRAYAGG(
  JSON_OBJECT('id', id, 'name', name)
) AS users
FROM user;
```

示例：一对多场景：用户 + 文章列表（子查询聚合）

```sql
SELECT u.id, u.name,
  (
    SELECT JSON_ARRAYAGG(JSON_OBJECT('id', m.id, 'title', m.title))
    FROM moment m
    WHERE m.user_id = u.id
  ) AS moments
FROM user u
WHERE u.id = 1;
```

补充：JSON 聚合能减少 Node 层数据拼接，但 SQL 会更复杂；复杂查询要注意性能（索引、避免 N+1 子查询等）.

### 1.2.mysql数据库驱动

- 基本使用
- 预处理语句
- 连接池
- promise处理方法

Node 连接 MySQL 常用 `mysql2`（比 `mysql` 更常用，也支持 Promise）。驱动主要解决：连接、执行 SQL、参数绑定、防注入、以及连接池复用。

关键点：

- **[基本使用]** `createConnection` 或 `createPool` + `execute/query`
- **[预处理语句]** 用 `?` 占位符做参数绑定，避免 SQL 注入
- **[连接池]** 高并发场景必备（复用连接，避免频繁建立/断开）
- **[Promise]** `mysql2/promise` 直接 `await`，代码更清爽

示例：Promise 方式基本用法（推荐）

```js
const mysql = require("mysql2/promise");

async function main() {
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "你的密码",
    database: "coderhub",
  });

  const [rows] = await connection.execute(
    "SELECT id, name FROM user WHERE id = ?",
    [1],
  );
  console.log(rows);

  await connection.end();
}

main();
```

示例：连接池（项目里更常用）

```js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "你的密码",
  database: "coderhub",
  connectionLimit: 10,
});

async function queryUser(id) {
  const [rows] = await pool.execute("SELECT id, name FROM user WHERE id = ?", [
    id,
  ]);
  return rows[0];
}
```

补充：

- **[query vs execute]** `execute` 会走预处理（参数绑定），更安全；`query` 更灵活但要注意拼接
- **[连接释放]** 用 pool 时不要手动 `end()` 每次连接；让连接池管理，应用退出时再统一关闭

# 二。项目实战 - coderhub

### 2.1.项目的介绍

coderhub 通常是一个“类社交/内容发布”的后端练习项目：

- 用户注册/登录
- 发布动态（moment）
- 评论、点赞、关注等扩展功能（视课程进度）

关键点（做项目时最需要建立的习惯）：

- **[接口设计]** 明确 URL、方法、参数、返回结构、错误码
- **[分层架构]** router/controller/service/dao（职责清晰）
- **[通用能力]** 鉴权、参数校验、统一错误处理、日志
- **[数据库设计]** 表结构、索引、外键/逻辑关系

补充：后端项目最重要的是“可维护性”，而不是把所有 SQL 都堆在路由里。

### 2.2.项目的搭建

1. npm init -y
2. src/main.js
3. 安装nodemon
   - npm install -g nodemon

- 通过koa创建app
  - 也可以通过http原生或者express，但推荐koa，因为TJ这个官网他主要维护koa

- 安装koa
  - npm i koa
  - npm install koa-router koa-bodyparser koa-static
    - 第一个解析路由
    - 第二个解析请求体
    - 第三个解析静态资源

- 将一些常量保持.env
  - npm i dotevt
  
  - dotenv.config()
  
  - {SERVER_PORT} = process.env
  
  - .env
  
    ```bash
    SERVER_PORT = 8000
    ```
  
    


项目初始化的目标是：跑起来一个最小 Koa 服务 + 能读取环境变量 + 有清晰目录结构。

关键点：

- **[Koa 入口]** `app = new Koa()` + `app.use(...)` + `app.listen(...)`
- **[环境变量]** 用 `dotenv` 读取 `.env`（例如端口、数据库账号密码、JWT 密钥）
- **[基础中间件]** body 解析（常用 `koa-bodyparser`）、错误处理、路由注册

示例：加载 `.env`

```js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

console.log(process.env.APP_PORT);
```

补充：

- **[.env 不要提交]** 真实项目里 `.env` 通常要加入 `.gitignore`，避免泄露密钥

### 2.3. 注册的接口

- 分层架构
  - router
  - controller
  - service
  
- 数据库封装
  - database.js
  - connection
  

#### database相关配置（位置放在app.js)

- npm i mysql2

```js
const mysql = require('mysql2')

// 1.创建连接池
const mysqlConnectPool = mysql.createPool({
  host:'localhost',
  port:'3306',
  user:'root',
  password:'',
  database:'coderhub',
  connectionLimit:5
})

// 2.获取连接池中的链接是否失败
mysqlConnectPool.getConnection((err, connection)=>{
  // 1.判断是否连接失败
  if(err) {
    console.log(err,'获取连接失败');
    return
  }

  // 2.获取connection，尝试和数据库建立连接
  connection.connect(err => {
    if(err) {
      console.log(err,'连接失败');
      return
    }
    console.log('连接成功');
  })
})

// 3.获取连接池中的连接对象（promise）
const connection = mysqlConnectPool.promise()
exports.module = connection
```

#### database具体操作示例

```js
const connection = require("../app/database");
class UserService {
  async createUser(user) {
    const { name, password } = user;

    const statement = "INSERT INTO user(name, password) VALUES (?, ?)";

    const result = await connection.execute(statement, [name, password]);
    return result;
  }
}
```

- 中间件verifyUser
  - 用户名和密码不能为空
  - 用户名是否已经存在
  - Middleware/
  - utils
    - handle-error.js
  - config
    - error.js

#### verifyUser里面的问题`const [values]` 为什么要带 `[]`

```js
let a = [1,2]
let [b,d,c] = a
b
1
d
2
```

你写：

```js
const [values] = await connection.execute(statement, [name]);
```

等价于：

```js
const result = await connection.execute(statement, [name]);
const values = result[0]; // rows
```

也就是用 **数组解构** 直接把第 0 项（`rows`）取出来



#### app.ctx.emit()问题

- app.on要先注册再监听

  - 方式(main.js里面导入注册器)

    ```js
    // 导入app
    const app = require("./app");
    const { SERVER_PORT } = require("./config/server");
    
    // 启动时 require('./utils/handle-error')，确保监听器被注册，否则non-error thrown
    require("./utils/handle-error");
    
    // 启动app
    app.listen(SERVER_PORT, () => {
      console.log("koa服务器开启成功");
    });
    ```

    



#### 密码加密储存

- 对密码进行加密存储中间件
  - 对密码进行md5加密，进行存储

    - crypto是node内置的库
    
    ```js
    const crypto = require("crypto");
    function md5Password(password) {
      const md5 = crypto.createHash("md5");
      const md5pwd = md5.update(password).digest("hex");
      return md5pwd;
    }
    module.exports = {
      md5Password,
    };
    ```

注册接口的核心流程：参数校验 -> 业务校验（用户名唯一）-> 密码加密 -> 入库 -> 返回结果。

关键点：

- **[router]** 只负责路由映射（例如 `POST /users`）
- **[controller]** 处理请求/响应（解析参数、调用 service、返回 body）
- **[service]** 业务逻辑编排（调用数据库层）
- **[database 封装]** 对外暴露 `connection/pool.execute`，避免在业务里重复连接代码

示例：路由层（示意）

```js
// router/user.router.js
const Router = require("koa-router");
const { create } = require("../controller/user.controller");
const { verifyUser, handlePassword } = require("../middleware/user.middleware");

const userRouter = new Router({ prefix: "/users" });
userRouter.post("/", verifyUser, handlePassword, create);

module.exports = userRouter;
```

示例：`verifyUser`（示意）

```js
async function verifyUser(ctx, next) {
  const { name, password } = ctx.request.body;
  if (!name || !password) {
    ctx.status = 400;
    ctx.body = { code: 400, message: "用户名或密码不能为空" };
    return;
  }
  // 这里通常会去数据库查是否存在
  await next();
}
```

补充：

- **[密码加密]** 课程里用 md5 主要为了练习流程；实际项目更推荐 `bcrypt`/`argon2` + salt
- **[统一错误]** 更推荐 `throw` + 统一错误处理中间件返回固定结构





### 2.4.登录的凭证

- http是无状态的协议
- cookie
  - 客户端设置cookie

登录凭证的目标是：用户登录成功后，后续请求能“证明自己是谁”。因为 HTTP 无状态，需要借助 Cookie/Session/Token。

关键点：

- **[Cookie]** 由服务端通过响应头 `Set-Cookie` 下发，浏览器后续自动携带
- **[Session]** 服务端存一份登录态（内存/Redis），Cookie 里存 session id
- **[Token(JWT)]** 服务端签发 token，客户端保存并在请求头携带（常见 `Authorization: Bearer xxx`）
- **[安全]** Cookie 场景下注意 `HttpOnly/SameSite/Secure` 等属性



### **[“客户端设置 cookie”]**（不重要因为公司都是服务器设置）

- 更准确说：浏览器最终保存 cookie，但**通常由服务端设置 Set-Cookie**；前端 JS 也能写 `document.cookie`，但 HttpOnly 的 cookie 不能用 JS 读写

- JS直接设置和获取cookie

```js
clg(document.cookie)
```

- 设置cookie，同时设置过期时间（默认秒钟）

```js
document.cookie = 'name=coderwhy;max-age=10';
```

- cookie的常见属性
  - 设置时间
    - expires（翻译到期）
    - max-age
  - 设置作用域（允许cookie发送给那些URL）
    - domain：指定那些主机可以接受cookie
      - 默认是origin
      - 若指定domain则包含子域名
    - Path：指定主机下那些路径可以接受cookie
      - Path=/docs,则下列地址都会匹配
        - /docs
        - /docs/web



