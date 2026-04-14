const UserService = require("../server/user.server");
class UserController {
  async createUser(ctx) {
    const user = ctx.request.body;

    // const { name, password } = user || {};
    // if (!name || !password) {
    //   // ctx.status = 400;
    //   ctx.body = {
    //     message: "请输入用户名和密码",
    //     data: null,
    //   };
    //   return;
    // }

    // // 判断用户名是否存在
    // const isHasName = await UserService.query(user);
    // if (isHasName.length) {
    //   // ctx.status
    //   ctx.body = {
    //     massage: "用户名已存在",
    //     data: isHasName,
    //   };
    //   return;
    // }

    // 将user储存到数据库
    const result = await UserService.createUser(user);

    ctx.body = {
      message: "创建用户成功",
      data: result,
    };
  }
}

module.exports = new UserController();
