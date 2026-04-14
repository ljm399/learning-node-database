const koa = require("koa");
// const { useRouter } = require("../router/user.router");
// const { loginRouter } = require("../router/login.router");
const koaBodyparser = require('koa-bodyparser');
const { hyAutoGetRouter } = require("../router");
// 定义app
const app = new koa();

// 使用中间件
app.use(koaBodyparser());

// 重复代码，写个自动化覆盖
// app.use(useRouter.routes());
// app.use(useRouter.allowedMethods());
// app.use(loginRouter.routes());
// app.use(loginRouter.allowedMethods());
hyAutoGetRouter(app)


// 导出
module.exports = app
 