const koaRouter = require("koa-router");
const userController = require("../controller/user.controller");
const useRouter = new koaRouter({ prefix: "/user" });
const { verfiyUser, handlePassword } = require("../middleware/user.middleware");
const { testMiddleware } = require("../utils/testMiddleware");
// useRouter.get("/", (ctx, next) => {
//   ctx.body = "koa服务器访问成功";
// });

useRouter.post('/', verfiyUser, handlePassword, userController.createUser)

// 展示用户头像
useRouter.get('/:userId/avatar', userController.showAvatarImage)

module.exports = {
  useRouter
}