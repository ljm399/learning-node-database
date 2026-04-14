const koaRouter = require("koa-router");
const userController = require("../controller/user.controller");
const useRouter = new koaRouter({ prefix: "/user" });
const { verfiyUser, handlePassword } = require("../middleware/user.middleware");
// useRouter.get("/", (ctx, next) => {
//   ctx.body = "koa服务器访问成功";
// });

useRouter.post('/', verfiyUser, handlePassword, userController.createUser)

module.exports = {
  useRouter
}