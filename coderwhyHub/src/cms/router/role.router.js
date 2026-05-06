const koaRouter = require("koa-router");
const roleController = require("../controller/role.controller");

const roleRouter = new koaRouter({ prefix: "/role" });

// 增
roleRouter.post("/", roleController.create);

// 查
roleRouter.get("/", roleController.list);

// 分配权限
roleRouter.post("/:roleId/menu", roleController.assignMenu);

module.exports = {
  roleRouter,
};
