const koaRouter = require("koa-router");
const { verifyAuth } = require("../middleware/login.middleware");
const { avatarUpload } = require("../middleware/file.middleware");
const { avatarHandler } = require("../controller/file.controller");

const fileRouter = new koaRouter({ prefix: "/upload" });

fileRouter.post("/avatar", verifyAuth, avatarUpload, avatarHandler);

module.exports = {
  fileRouter,
};
