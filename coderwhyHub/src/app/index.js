const koa = require("koa");
// const { useRouter } = require("../router/user.router");
// const { loginRouter } = require("../router/login.router");
const koaBodyparser = require('koa-bodyparser');
const koaStatic = require("koa-static");
const path = require("path");
const { hyAutoGetRouter } = require("../router");
const { roleRouter } = require("../cms/router/role.router");
const { menuRouter } = require("../cms/router/menu.router");
const { oppoRouter } = require("../cms/router/oppo.router");
const { redwoodRouter } = require("../cms/router/redwood.router");
// 定义app
const app = new koa();

// 后端解决跨域
app.use(async (ctx, next) => {
  // 1) 获取浏览器发来的 Origin（跨域请求来源）
  const requestOrigin = ctx.get("Origin");
  // console.log(requestOrigin,'我是requestOrigin');
  // 2) 设置允许跨域的来源
  // - 如果有 Origin：回显该 Origin（常用做法，便于后续支持 cookie）
  // - 如果没有 Origin：说明可能是同源/非浏览器请求，兜底允许所有
  if (requestOrigin) {
    ctx.set("Access-Control-Allow-Origin", requestOrigin);
    // 3) 告诉缓存：该响应会因 Origin 不同而不同，避免 CDN/代理缓存串数据
    ctx.set("Vary", "Origin");
  } else {
    ctx.set("Access-Control-Allow-Origin", "*");
  }

  // 4) 允许跨域请求使用哪些 HTTP 方法
  ctx.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  // 5) 允许跨域请求携带哪些请求头
  // - 优先使用浏览器预检请求带的 Access-Control-Request-Headers
  // - 否则兜底允许常用的 Content-Type / Authorization
  ctx.set(
    "Access-Control-Allow-Headers",
    ctx.get("Access-Control-Request-Headers") || "Content-Type, Authorization"
  );

  // 6) 处理预检请求（preflight）
  // - 浏览器在跨域且“非简单请求”时会先发 OPTIONS
  // - 这里直接返回 204，表示允许并结束请求
  if (ctx.method === "OPTIONS") {
    ctx.status = 204;
    return;
  }

  // 7) 继续执行后面的中间件/路由
  await next();
});
app.use(koaBodyparser());

// 静态资源托管：static 目录不带前缀
// 例如：static/pic1.png -> http://localhost:8000/pic1.png
const staticPath = path.resolve(__dirname, "../../static-webp");
app.use(
  koaStatic(staticPath, {
    maxAge: 24 * 60 * 60 * 1000,
    immutable: true,
    defer: false,
  })
);

// 重复代码，写个自动化覆盖
hyAutoGetRouter(app)

// 角色
app.use(roleRouter.routes());
app.use(roleRouter.allowedMethods());

// 菜单
app.use(menuRouter.routes());
app.use(menuRouter.allowedMethods());

// oppo
app.use(oppoRouter.routes());
app.use(oppoRouter.allowedMethods());

// redwood
app.use(redwoodRouter.routes());
app.use(redwoodRouter.allowedMethods());

// 导出
module.exports = app