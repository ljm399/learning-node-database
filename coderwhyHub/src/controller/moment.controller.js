const momentServer = require("../server/moment.server");
class momentController {
  async createMoment(ctx) {
    // 1.获取用户传递的数据
    const { content } = ctx.request.body;

    // 2.获取用户id
    const { id } = ctx.user;

    console.log(content, id, "contetid");

    // 插入到数据库中
    const result = await momentServer.insertMoment(content, id);

    // 返回数据
    ctx.body = { code: 200, message:'插入数据成功',data: result };
  }

  async getMomentList(ctx) {
    // 获取偏移量offset和size
    const { offset, size } = ctx.query

    // 数据库的操作
    const result = await momentServer.getMomentList(offset, size)

    // 返回结果
    ctx.body = {
      code: 200,
      data: result
    }
  }
}
module.exports = new momentController();
