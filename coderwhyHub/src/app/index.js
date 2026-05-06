const koa = require("koa");
// const { useRouter } = require("../router/user.router");
// const { loginRouter } = require("../router/login.router");
const koaBodyparser = require('koa-bodyparser');
const { hyAutoGetRouter } = require("../router");
const { roleRouter } = require("../cms/router/role.router");
const { menuRouter } = require("../cms/router/menu.router");
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

// 角色
app.use(roleRouter.routes());
app.use(roleRouter.allowedMethods());

// 菜单
app.use(menuRouter.routes());
app.use(menuRouter.allowedMethods());


// 导出
module.exports = app
 