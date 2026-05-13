const koaRouter = require("koa-router");
const oppoController = require("../controller/oppo.controller");

const oppoRouter = new koaRouter({ prefix: "/oppo" });

oppoRouter.get("/info", oppoController.info);

module.exports = {
  oppoRouter,
};
