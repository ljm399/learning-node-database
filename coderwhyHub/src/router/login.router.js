const koaRouter = require("koa-router");
const { verfiyLogin, verifyAuth } = require("../middleware/login.middleware");
const { sign, test } = require("../controller/login.controller");
const loginRouter = new koaRouter({ prefix: "/login" });
loginRouter.post('/', verfiyLogin, sign)
loginRouter.post('/test', verifyAuth, test)
module.exports = {
  loginRouter
}