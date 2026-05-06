const koaRouter = require("koa-router");
const { verifyAuth } = require("../middleware/login.middleware");
const {
  createMoment,
  getMomentList,
  getMomentDetail,
  addLabels,
  updateMoment,
  remove,
} = require("../controller/moment.controller");
const verifyPermissions = require("../middleware/verifyPermissions.middleware");
const { verifyLabelExists } = require("../middleware/verifyLabelExists.middleware");
const momentRouter = new koaRouter({ prefix: "/moment" });

// 增
momentRouter.post("/", verifyAuth, createMoment);

// 删
momentRouter.delete("/:momentid", verifyAuth, verifyPermissions, remove);

// 改
momentRouter.patch("/:momentid", verifyAuth, verifyPermissions, updateMoment);

// 查
momentRouter.get("/", getMomentList);
momentRouter.get("/:momentid", getMomentDetail);

// 为动态添加标签
momentRouter.post("/:momentid/labels", verifyAuth, verifyPermissions, verifyLabelExists, addLabels);

module.exports = {
  momentRouter,
};
