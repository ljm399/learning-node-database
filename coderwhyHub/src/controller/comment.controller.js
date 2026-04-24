const { create, reply } = require("../server/comment.server");
const verifyExisted = require("../utils/verifyIsExisted");

class commentController {
  async create(ctx) {
    const { content, moment_id } = ctx.request.body;
    const { id } = ctx.user;
    // console.log(content,moment_id,id);

    // 判断moment_id是否在moment表中存在
    const existed = await verifyExisted(ctx, moment_id, "moment");
    if (!existed) return;

    const result = await create(content, moment_id, id);

    ctx.body = {
      code: 200,
      message: "评论成功",
      data: result,
    };
  }

  async reply(ctx) {
    const { content, moment_id, comment_id } = ctx.request.body;
    const { id } = ctx.user;
    // console.log(content, moment_id, id, comment_id);

    const existedM = await verifyExisted(ctx, moment_id, "moment");
    const existedC = await verifyExisted(ctx, comment_id, "comment");
    // console.log(existedC,existedM,'ex');
    if (!existedM || !existedC) return;

    const result = await reply(content, moment_id, id, comment_id);

    ctx.body = {
      code: 200,
      message: "回复成功",
      data: result,
    };
  }
}
module.exports = new commentController();
