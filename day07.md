# 一.node服务器cookie设置

Cookie 本质是浏览器在本地保存的一小段字符串数据，后续请求会自动把符合条件的 Cookie 带回服务器。服务端通过设置响应头 `Set-Cookie` 来让浏览器写入/更新 Cookie。

在 **Koa** 中，Cookie 常用来：

- **会话标识**：例如保存 `sessionId`/`tokenId`（注意安全）
- **偏好设置**：语言、主题等

## 1.1 Cookie 的关键字段

- **`name=value`**：cookie 的键值对
- **`maxAge`/`expires`**：过期时间（没有就属于会话 cookie，浏览器关闭就没了）
- **`httpOnly`**：JS 不能通过 `document.cookie` 读写（防止 XSS 直接偷 cookie）
- **`secure`**：只在 https 下发送
- **`sameSite`**：控制跨站请求是否携带 cookie（防 CSRF）
  - `Strict`：基本不跨站带
  - `Lax`：较常用的折中
  - `None`：允许跨站，但必须配合 `Secure`
- **`domain`/`path`**：控制哪些域/路径会携带

## 1.2 Koa 中设置和读取 Cookie

- koa内置了设置cookie的库

```js
const Koa = require('koa')
const Router = require('koa-router')

const app = new Koa()
const router = new Router()

router.get('/cookie/set', (ctx) => {
  ctx.cookies.set('theme', 'dark', { -- 设置cookie
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  })
  ctx.body = 'cookie set'
})

router.get('/cookie/get', (ctx) => {
  const theme = ctx.cookies.get('theme') -- 读取cookie
  if （theme === ‘dark’）{ -- 服务器浏览器判断有无对应cooke值
      ctx.body = '你想返回的数据'
  }
  ctx.body = { theme }
})

app.use(router.routes())
app.listen(3000)
```

## 1.3 常见坑

- **在前后端分离/跨域场景**：需要正确配置 `sameSite`、`secure`，以及前端请求带 `withCredentials`，服务器要开启允许凭证的 CORS。
- **Cookie 不适合放敏感信息**：即使加密也不建议把用户密码等放进去。



# 二.服务器session设置

## cookie的实现机制

1. 服务器设置cookie
2. 浏览器拿到并保存cookie
3. 在同一个作用域下访问服务器，自动携带cookie
4. 服务器验证浏览器返回的cookie



- session是基于cookie实现机制
  - 即为了让cookie的使用更加安全，比如通过把设置的值加密和加盐
    - 加盐就是在加密后进一步加密
    - 浏览器后台看到值是加密后的，而不是但用cookie导致对应的value 是明文

## 2.1 Session 解决了什么

- Cookie 本身容量小、且不适合存敏感信息
- Session 把敏感信息放服务器，客户端只保存一个随机的 sessionId

## 2.2 Koa 中使用 Session（koa-session 示例）

前提：安装依赖 `koa-session`。

登录凭证：cookie + sessionId

```js
const Koa = require('koa')
const Router = require('koa-router')
const session = require('koa-session')

const app = new Koa()

// 加盐：
app.keys = ['some secret']

// 注册session中间件
app.use(session({
  key: 'sid', --- 这个随便设置
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
}, app))

const router = new Router()

router.post('/login', (ctx) => {
    ----
  // 这里省略判断是否登录成功代码
    
  ctx.session.user = { id: 1, name: 'cm' }
  ctx.body = 'login ok'
})

router.get('/profile', (ctx) => {
  if (!ctx.session.user) { -- 
    ctx.status = 401
    ctx.body = 'unauthorized'
    return
  }
  ctx.body = ctx.session.user
})

router.post('/logout', (ctx) => {
  ctx.session = null
  ctx.body = 'logout ok'
})

app.use(router.routes())
app.listen(3000)
```



## 2.3. session+cookie作用（结合上面案例）

- 错误理解：作用：防止黑客拿到浏览器中的session以及session.id来获取对应网站中用户的隐私信息

#### `session` 和 `session.sig` 到底起什么作用？

以 `koa-session` 常见行为来说（默认 cookie key 类似 `koa:sess`、`koa:sess.sig`）：

- **`koa:sess`**：存放 session 的内容或 session 标识（取决于配置/实现）
- **`koa:sess.sig`**：对 `koa:sess` 做的**签名**（用 `app.keys` 来签）

这个签名的意义是：

- **防篡改（Integrity）**：防止客户端随便改 cookie 内容
- 校验的是 cookie 的签名

这里要区分两种“比较”：

#####  `app.keys` 确实会参与“校验”，但**校验的是 cookie 的签名**，不是校验业务数据对象（{ id: 1, name: 'cm' }）

在 `koa-session` 里，浏览器会带上类似：

- `koa:sess=...`（session 数据或 session 标识）
- `koa:sess.sig=...`（对 `koa:sess` 计算出的签名）

服务器收到请求后（**即**  只要你在 Koa 里 `app.use(session(...))` 注册了 session 中间件，session 中间件就会在你的路由处理之前执行。），中间件会做的是类似这种逻辑（抽象版）：

```js
const sess = cookie['koa:sess']
const sig = cookie['koa:sess.sig']

const expectedSig = sign(sess, app.keys) // 用 keys 计算“应该是什么签名”
if (sig !== expectedSig) {
  // cookie 被篡改 or keys 不对 -> 当作无效
}
```

所以它发生的“比较”是：

- **比较 `sig` 是否等于用 `app.keys` 算出来的 `expectedSig`**

这就是我说的“不是用来跟 `{ id: 1, name: 'cm' }` 做比较”的含义：  
`app.keys` 不会拿去跟你业务里的 `user` 对象比，它只用来保证 **cookie 本身没被改过**。



#### 你说的“session 的目的：防止黑客拿到 cookie 就登录”这句话要纠正一下

Session 主要解决的是：

- **不把用户敏感信息直接放在 cookie 里**（服务端存状态）

但它**并不能**自动防止“黑客拿到你的 session cookie 就冒充你”：

- 如果攻击者通过 XSS / 抓包 / 木马拿到了你的 `koa:sess`（以及可能一起拿到 `koa:sess.sig`）
- 那他发请求时带上这两个 cookie
- 服务端仍会认为他是你（这叫 **session hijacking 会话劫持**）

所以 session 的安全依赖这些配套措施：

- **HTTPS**（防中间人窃听）
- **`httpOnly`**（降低 XSS 直接读取 cookie 的风险）
- **`sameSite`**（降低 CSRF 风险）
- **登录后刷新 sessionId（session fixation 防护）**
- **必要时绑定 UA/IP/设备指纹（有取舍）**



### 简述2.3

- 登录成功，session和cookie保存客户端
- 某个操作，发送新请求，session库里面会判断session和session.sig是否符合之前所设的值，不是就重新登录





## 2.4 Session 的存储

默认内存存储只适合学习/单机。线上一般把 session 存在 **Redis** 等共享存储中：

- 服务器重启不丢
- 多实例共享



# 三。token

Token 是一种更偏向“**客户端持有凭证**”的认证方式。

- 客户端拿到 token 后，后续请求通过 `Authorization` 头携带
- 服务端通过签名/校验 token 来判断身份
- 通常服务端不需要为每个用户保存会话状态（更“无状态”）

## 3.1.Cookie与Session认证机制

典型流程：

- **首次登录**：客户端提交账号密码
- **服务器验证成功**：
  - Session 方案：服务器创建 session，响应 `Set-Cookie: sid=...`
  - Cookie 方案：服务器直接写 cookie（一般只放标识，不建议放敏感信息）
- **后续请求**：浏览器自动携带 cookie -> 服务器识别用户

要点：

- 浏览器“自动携带 cookie”既是优点（方便）也是风险点（CSRF）
- Session 依赖服务器状态



## 3.2.Session和cookie的缺陷

这里主要是对比：

- Session：服务器存状态、集群要共享、扩展成本高
- Cookie：天然会被浏览器自动带上，跨站安全风险更高

### 3.2.1.Cookie的三大缺陷

常见三类（复习时建议你能举例）：

1. **安全风险**：
   - XSS 可偷 cookie（所以要 `httpOnly`）
   - CSRF 会“自动带 cookie”，导致跨站请求冒充
2. **容量限制**：每个 cookie 大小、数量有限
3. **依赖浏览器机制**：跨域/跨站限制变多，需要 `sameSite` 等配置

### 3.2.2.分布式系统认证挑战

当你有多台服务器（多实例）时：

- Session 如果存在 A 机器内存里
- 下一次请求被负载均衡打到 B 机器
- B 机器拿不到 A 的 session -> 你会“掉登录”

解决方式：

- **session 共享存储**（Redis）
- 或使用 **Token/JWT** 这种相对无状态的方案

### 3.2.3.服务器集群负载均衡

负载均衡常见两种会影响会话：

- **粘性会话（sticky session）**：同一个用户尽量打到同一台机器，缓解 session 问题，但并不能彻底解决扩展性
- **无粘性（随机/轮询）**：更利于扩展，但要求会话状态可共享/可验证



## 3.3.Token验证原理

Token 验证的核心：

- 服务端签发 token（把用户信息/权限信息编码进去，或只放最小必要信息）
- 客户端保存 token（localStorage/内存/安全 cookie 等）
- 每次请求携带 token（通常 `Authorization: Bearer <token>`）
- 服务端校验 token 的合法性、有效期、签名

### 3.3.1.JWT组成结构

- 安装： npm i jsonwebtoken



JWT（JSON Web Token）常见长这样：

`xxxxx.yyyyy.zzzzz`

由三部分组成：

- **Header**：算法、类型（如 HS256、RS256）
- **Payload**：载荷（用户信息、过期时间等）
- **Signature**：签名（防篡改）

注意：

- JWT 的 payload **只是 base64url 编码，不是加密**，不要放密码等敏感信息



### 3.3.2.OpenSSL工具使用

OpenSSL 常用于生成 RSA 密钥对（用于 RS256）。常见流程：

- 先看有无安装
  - openssl version

1. 生成私钥 (在你想放私钥和公钥的目录下运行，下面一样)

```bash
openssl genrsa -out private.key 2048
```

2. 生成公钥

```bash
openssl rsa -in private.key -pubout -out public.key
```

- **private.key**：只用于签名，必须严格保密
- **public.key**：用于验证，可分发



#### 解析公钥私钥

```js
const fs = require("fs");
const path = require("path"); // 使用这个为了连接，因为使用相对路径会报错，运行时相对路径是相对src，而不是当前文件的
const privateKey = fs.readFileSync(
  path.join(__dirname, "keys/private.key"),  // __dirname是全局属性，表示绝对路径
  "utf8",
);
const publicKey = fs.readFileSync(
  path.join(__dirname, "keys/public.key"),
  "utf8",
);
module.exports = {
  privateKey,
  publicKey,
};

```



### 3.3.3.Token颁发流程验证流程

- **登录成功** -> 服务端生成 JWT：
  - payload 放 `userId`、`name`、`exp` 等
  - 使用密钥（或私钥）签名
- **客户端保存 JWT**（常见：前端内存/本地存储/安全 cookie）
- **后续请求**：`Authorization: Bearer <token>`
- **服务端中间件**：
  - 解析 token
  - 校验签名
  - 校验过期
  - 取出 payload 放到 `ctx.state.user`

#### Koa + jsonwebtoken 示例（签发 + 校验）

### 3.3.4.对称加密

对称加密的特点：

- 加密和解密用同一把密钥
- 速度快，适合大量数据

在 JWT 中，常见对称签名算法：**HS256**。

要点：

- 服务器必须保护好 `SECRET`

- SECRET 泄露等于 token 可以被伪造

  ```js
  const jwt = require('jsonwebtoken')
  class loginController {
    sign(ctx,next){
      // 1.获取name,password
      const user = ctx.request.body
      const secret = 'iamserect'
      // 1.jwt编译成token
      const token = jwt.sign(user,secret,{expiresIn:'2h'})
      // ??? 返回获取token
      // jwt解析拿到token
  
      // 返回token
      ctx.body = { code:200, data:{token}}
    }
  }
  ```

  



### 3.3.4.非对称加密方案 

非对称加密/签名特点：

- 私钥签名，公钥验证
- 私钥只在认证服务器保存，其他服务/网关只需要公钥就能验签

JWT 常见非对称算法：**RS256**。

适用场景：

- 多服务需要统一验签
- 希望把“签发 token 的能力”限制在少数服务

```js
const jwt = require('jsonwebtoken')
const { privateKey, publicKey } = require('../config/index')
class loginController {
  sign(ctx,next){
    // 1.获取name,password
    const user = ctx.request.body
    // 对称加密
    const token = jwt.sign(user, privateKey, {
      algorithm: "RS256"
    })
    ctx.body = { code:200, data:{token}}
  }
```







### 3.3.6.检验token 

- 对称加密

```js
function authGuard() {
  return async (ctx, next) => {
    const auth = ctx.get('authorization')
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) {
      ctx.status = 401
      ctx.body = 'missing token'
      return
    }
    try {
      const payload = jwt.verify(token, SECRET) -- 这里要是报错直接跳到catch，而不是执行下面代码
      ctx.state.user = payload
      await next()
    } catch (err) {
      ctx.status = 401
      ctx.body = 'invalid token'
    }
  }
}

router.get('/profile', authGuard(), (ctx) => {
  ctx.body = { user: ctx.state.user }
})
```



- 非对称加密

```js
const verifyAuth = async (ctx, next) => {
  // 1.获取里面的token
  const authorization = ctx.get("authorization");
  if (!authorization) {
    return ctx.app.emit("error", UNAUTHORIZED, ctx);
  }
  const pureToken = authorization.replace(/^Bearer\s+/i, "");
  // 2.验证
  let payload;
  try {
    payload = jwt.verify(pureToken, publicKey, {
      algorithms: ["RS256"],
    });
  } catch (error) {
    return ctx.app.emit("error", UNAUTHORIZED, ctx);
  }

  ctx.user = payload;

  // 3.成功就执行下个中间件
  await next();
};
```

#### 代码启发

#### 1.`ctx.get("authorization")` vs `ctx.headers.authorization` 哪个更对？

两个都可以拿到 `Authorization` 请求头，在 Koa 里都算“对”，区别是**风格和健壮性**：

##### 1) `ctx.get("authorization")`（我更推荐）
- **Koa 内置方法**，专门用来取 header
- 会自动做一些兼容处理（比如大小写）
- 如果没有这个 header，返回空字符串 `''`（你现在用 `if (!authorization)` 也能兜住）

```js
const authorization = ctx.get("authorization");
```

##### 2) `ctx.headers.authorization`（也可以）
- 直接从对象取值
- header 名在 Node/Koa 中通常会被转成小写，所以是 `authorization`
- 如果没有就得到 `undefined`

```js
const authorization = ctx.headers.authorization;
```



#### 2.jwt.verify怎么拿到判断结果，他返回的是string

- 通过try，catch
  - 当jwt.verfiy有报错提示，则catch捕获
- 看源码，判断返回的string 是什么



### 3.3.7. JWT算法选择

常见选择：

- **HS256**：简单、单体服务够用，但密钥泄露风险更集中
- **RS256**：更适合分布式/微服务，签发与验签解耦

选择建议（复习用）：

- 小项目：HS256
- 多服务/需要第三方验签：RS256



### 3.3.8.服务器安全加固

围绕 Token/JWT 的安全加固：

- **HTTPS**：避免 token 在传输中被窃听
- **Token 有效期**：不要无限期，合理 `exp`
- **刷新机制**：短 token + refresh token（进阶）
- **权限校验**：身份 != 权限，接口仍要校验角色/资源归属
- **黑名单/注销**：必要时支持 token 失效（例如把 jti 加入黑名单）
- **防重放**：结合时间戳/nonce/设备信息（进阶）





### 简述上面token内容

1. 登录成功返回token
2. 客户端请求携带token，服务器检验token是否合理
3. 检验路线
   1. 对称加密
      - 每个服务器都有个secret，服务器拿serect和token通过jwt里面的jwt.verify(token, SECRET)判断token是否合理
      - 同时每台服务器都可以颁发token
   2. 非对称加密
      - 每个服务器有对应的公钥，服务器拿公钥和token通过jwt里面的jwt.verify(token, 公钥)判断token是否合理
      - 这里只有在特定服务器才有私钥，其他没有私钥只有公钥的服务器只能判断token是否合理，而不能颁发token（jwt.sign(...)）



# 四。项目实战登录接口

### 账号密码判断问题

```
  // 1.判断有无输入账号和密码
  if (!name || !password) {  -- 这个是|| 而不是&&
    return ctx.app.emit("error", NAME_OR_PW_IS_NULL, ctx);
  }
```



### 后端控制台没有打印，但postman请求显示500错误

- 这个原因是因为没有await，导致错误报告可能不会发生 throw/reject，则Koa/Node 没机会把错误输出到终端
- 解决：
  1. 使用await
  2. trycatch



### 时刻想想你是不是在自圆其说

### 为什么controller里面是类，而middleware则是直接导出方法

- 当一段代码多个地方用到，则封装为中间件
  - 就是放在Middleware，因为里面是中间件（函数）
- 当多段代码（意思是放在多个函数里面）其多个函数被其他地方引用，则用类封装
  - 就是放在Controller里面，因为里面是类



### postman中快速获取token的脚本

- postman - script 

```
const res = pm.response.json()
pm.globals.set('token', res.data.token)
```

- authority中

  {{token}}



### 错误处理规范

#### Koa 统一错误处理中间件（示例）

- utils/handle-error.js



#### 约定错误码（示例）

- 参数错误：`-1001`
- 登录失败：`-1002`
- token 无效：`-1003`



### 自动化获取和注册路由

```js
const fs = require("fs");

function hyAutoGetRouter(app) {
  // 1. 获取当前目录所有文件
  const files = fs.readdirSync(__dirname);

  // 2. 获取路由文件
  for (const file of files) {
    if (file === "index.js") continue;
    if (!file.endsWith(".router.js")) continue;

    const router = require(`./${file}`);
    // console.log(routers,'routers');
    const pureRouter = Object.values(router)[0];// object.value获取都是个数组
    app.use(pureRouter.routes());
    app.use(pureRouter.allowedMethods());
    
  }
}

module.exports = {
  hyAutoGetRouter,
};

```



#### 1. 为什么 `require(\`./${file}\`)` 不用绝对路径也不报错？

因为在 **CommonJS 的 `require`** 里：

- 只要你写的是 `./xxx` 或 `../xxx`，它的相对路径**不是相对 `src`**，而是**相对“当前这个文件所在目录”**解析。
- 也就是说在 [src/router/index.js](cci:7://file:///d:/Desktop/JavaScript/16_node%E9%AB%98%E7%BA%A7/coderwhyHub/src/router/index.js:0:0-0:0) 里：

```js
require(`./${file}`)
```

所以它天然就能定位到正确文件，不需要你手动拼绝对路径。

---

##### 那为什么 [config/index.js](cci:7://file:///d:/Desktop/JavaScript/16_node%E9%AB%98%E7%BA%A7/coderwhyHub/src/config/index.js:0:0-0:0) 读 key 时要 `path.join(__dirname, ...)`？

因为这里不是 `require` 解析模块，而是 **fs 读文件**：

```js
fs.readFileSync("keys/private.key", "utf8")
```

`fs.readFileSync` 这种如果你传相对路径，它的相对基准是：

- **`process.cwd()`（你启动 node 时所在的工作目录）**，通常是项目根目录
- 而不是 [config/index.js](cci:7://file:///d:/Desktop/JavaScript/16_node%E9%AB%98%E7%BA%A7/coderwhyHub/src/config/index.js:0:0-0:0) 所在目录

所以如果你直接写相对路径，可能会变成去找：

- `项目根/keys/private.key`（不存在）
而你的 key 实际在：
- `src/config/keys/private.key`

用：

```js
path.join(__dirname, "keys/private.key")
```

才能保证不管你从哪里启动服务，它永远指向 **`src/config/keys/private.key`**。

---

##### 总结一句

- **`require('./x')`**：相对的是“当前文件目录”（模块解析规则帮你做了）
- **`fs.readFileSync('x')`**：相对的是“当前运行目录 `cwd`”（所以要用 `__dirname` 拼绝对路径更稳）

如果你想验证：在代码里 `console.log(process.cwd(), __dirname)`，你会看到它们通常不是同一个路径。



#### 2.Object.values(router)[0];这段代码目的

##### 需要的原因因为你导出方式不同

你的导出是

```js
module.exports = { loginRouter }
```

##### 则 `require(\`./${file}\`)` 拿到的通常不是“router 实例”，而是一个对象
所以 `require('./login.router.js')` 得到的是：

```js
{ loginRouter: <Router实例> }
```

这时你不能直接 `app.use(router.routes())`，因为 `router` 不是 Router 实例，而是一个对象。



##### 解决方式一：

你需要取出来再注册，例如：

```js
const pureRouter = Object.values(router)[0];// object.value获取都是个数组
app.use(pureRouter.routes());
app.use(pureRouter.allowedMethods());
```

##### 解决方式二：直接module.exports = loginRouter 



#### 3.当导入其他文件如    const routers = require(`./${file}`); 不是要放在顶层吗

##### 不一定要放在顶层

“导入（`require`/`import`）要放在顶层”更多是 **代码规范/可读性/静态分析** 的建议，不是 Node/Koa 运行时的硬性要求。

在 CommonJS（Node 的 `require`）里：

- **可以在函数里 `require`**，像你这个：

```js
const routers = require(`./${file}`);
```

完全合法，因为你要 **动态加载**（文件名是变量），这类场景顶层反而写不了。

---

##### 但是：放在函数里 `require` 会带来什么影响？

###### 1) 性能/执行次数
- `require` 第一次会加载并执行模块
- **后续会走缓存**（`require.cache`），不会重复执行模块代码
- 但每次循环还是会做一次“查缓存”操作（通常影响很小）

###### 2) 动态加载是必须的
你要遍历目录里所有 `*.router.js`，必须动态 `require`，所以放在循环里是合理的。

---

##### 什么时候必须顶层？

###### ESModule 的 `import`
如果你用的是：

```js
import x from './x.js'
```

那它 **必须顶层**（静态导入），不能写在 if/for/function 里。

但你现在用的是 **CommonJS `require`**，所以没这个限制。



### 执行  const result = await momentServer.insertMoment(content, id);postman是500

- 原因：MySQL 表/字段编码不支持中文，导致 `INSERT` 抛错 -> Koa 返回 500。

- 解决

  ```js
  ALTER TABLE `moment`
    CONVERT TO CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci;
  
  ALTER TABLE `moment`
    MODIFY `content` VARCHAR(1000)
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci
    NOT NULL;
  ```

  - 或者你创建表示可以设置 utf8mb4_general_ci和utf8mb4_general_ci

#### 怎么找到问题，为什么耗时怎么久

##### 因为你问题没抛出，导致你在找问题在哪

- 解决

  - 通过控制台返回的stack

    ```js
    Error: Incorrect string value: '\xE7\x88\xB1\xE6\x83\x85...' for column `coderhub`.`moment`.`content` at row 1
        at PromisePool.execute (D:\Desktop\JavaScript\16_node高级\coderwhyHub\node_modules\mysql2\lib\promise\pool.js:54:22)
        at momentServer.insertMoment (D:\Desktop\JavaScript\16_node高级\coderwhyHub\src\server\moment.server.js:5:37)
        at createMoment (D:\Desktop\JavaScript\16_node高级\coderwhyHub\src\controller\moment.controller.js:13:39)
    ```

    - 你从上到下，一一帮ai排除问题然后ai发现问题在 at momentServer.insertMoment这段代码



### 解构数组不同于解构对象

#### 解构数组，它之后把数组里面的元素依次赋值，而不是按名称赋值（这个解构对象特性）



### 获取动态列表(不需要验证)

数据库操作

```js
  async getMomentList(offset = 0, size = 10) {
    const statement = `
      SELECT
        m.id AS id,
        m.content AS content,
        m.createAt AS createAt,
        m.updateAt AS updateAt,
        JSON_OBJECT(
          'id', u.id,
          'name', u.name,
          'createAt', u.createAt,
          'updateAt', u.updateAt
        ) AS user
      FROM moment m
      LEFT JOIN user u ON u.id = m.user_id
      LIMIT ?, ?;
    `
    const [result] = await connection.execute(statement, [offset, size]); 
    return result
  }
}
```

