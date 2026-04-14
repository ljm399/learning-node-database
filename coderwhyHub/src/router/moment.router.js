const koaRouter = require("koa-router");
const { verifyAuth } = require("../middleware/login.middleware");
const { createMoment, getMomentList } = require("../controller/moment.controller");
const momentRouter = new koaRouter({ prefix: "/moment" });
momentRouter.post("/", verifyAuth, createMoment);
momentRouter.get("/", getMomentList)
module.exports = {
  momentRouter,
};
