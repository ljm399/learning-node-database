const {NAME_ALREADY_EXISTS, NAME_OR_PW_IS_NULL } = require("../config/constant-errors");
const { md5Password } = require('../utils/md5')

const UserService = require("../server/user.server");
  async function verfiyUser(ctx, next) {
  const user = ctx.request.body;
  const { name, password } = user || {};
  if (!name || !password) {
    // ctx.status = 400;
    // ctx.body = {
    //   message: "请输入用户名和密码",
    //   data: null,
    // };
    return ctx.app.emit("error", NAME_OR_PW_IS_NULL, ctx);
  }

  // 判断用户名是否存在
  const isHasName = await UserService.query(user);
  if (isHasName.length) {
    // ctx.status
    return ctx.app.emit("error", NAME_ALREADY_EXISTS, ctx);
  }
  await next();
}

async function handlePassword(ctx, next) {
  const user = ctx.request.body;
  const { password } = user || {};  
  ctx.request.body.password = md5Password(password)
  await next()
}

module.exports = {
  verfiyUser,
  handlePassword
};
