const koaRouter = require("koa-router");
const { create } = require("../controller/label.controller");
const labelRouter = new koaRouter({ prefix: "/label" });
labelRouter.post('/', create)
module.exports = {
  labelRouter
}