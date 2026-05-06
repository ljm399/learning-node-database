const koaRouter = require("koa-router");
const menuController = require("../controller/menu.controller");

const menuRouter = new koaRouter({ prefix: "/menu" });

// 增
menuRouter.post("/", menuController.create);

// 查
menuRouter.get("/", menuController.wholeMenu);

module.exports = {
  menuRouter,
};
