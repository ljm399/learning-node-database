const momentServer = require("../server/moment.server");
class momentController {
  // 增
  async createMoment(ctx) {
    // 1.获取用户传递的数据
    const { content } = ctx.request.body;

    // 2.获取用户id
    const { id } = ctx.user;

    // console.log(content, id, "contetid");

    // 插入到数据库中
    const result = await momentServer.insertMoment(content, id);

    // 返回数据
    ctx.body = { code: 200, message: "插入数据成功", data: result };
  }

  // 删
  async remove(ctx) {
    // 获取要修改的用户id
    const { momentid } = ctx.params;
    // console.log(detailId,'deta');

    // 数据库的操作
    const result = await momentServer.removeMoment(momentid);

    // 返回结果
    ctx.body = {
      code: 200,
      message: "删除成功",
      data: result,
    };
  }

  // 改
  async updateMoment(ctx) {
    // 获取要修改的用户id
    const { momentid } = ctx.params;
    // console.log(detailId,'deta');

    // 获取修改内容
    const { content } = ctx.request.body;

    // 数据库的操作
    const result = await momentServer.updateMoment(momentid, content);

    // 返回结果
    ctx.body = {
      code: 200,
      data: result,
    };
  }

  // 查
  async getMomentList(ctx) {
    // 获取偏移量offset和size
    const { offset, size } = ctx.query;

    // 数据库的操作
    const result = await momentServer.getMomentList(offset, size);

    // 返回结果
    ctx.body = {
      code: 200,
      data: result,
    };
  }
  async getMomentDetail(ctx) {
    const detailId = ctx.params.momentid;
    // console.log(detailId,'deta');

    // 数据库的操作
    const result = await momentServer.getMomentDetail(detailId);

    // 作用：数据库可能将语句转为string返回，这里解析为对象再返回提高阅读性
    const data = result[0];
    if (data && typeof data.user === "string")
      data.user = JSON.parse(data.user);
    if (data && typeof data.comment === "string")
      data.comment = JSON.parse(data.comment);

    // 返回结果
    ctx.body = {
      code: 200,
      data,
    };
  }
}
module.exports = new momentController();
