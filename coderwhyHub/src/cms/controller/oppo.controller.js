const oppoService = require("../server/oppo.service");

class OppoController {
  async info(ctx) {
    const data = await oppoService.getHomeInfo();
    ctx.body = {
      code: 200,
      message: "ok",
      data,
    };
  }
}

module.exports = new OppoController();
