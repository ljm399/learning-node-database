const redwoodService = require("../server/redwood.service");

class RedwoodController {
  async info(ctx) {
    const data = await redwoodService.getInfo();
    ctx.body = {
      code: 200,
      message: "ok",
      data,
    };
  }

  async banner(ctx) {
    const data = await redwoodService.getBanners();
    ctx.body = {
      code: 200,
      message: "ok",
      data,
    };
  }

  async categories(ctx) {
    const data = await redwoodService.getCategories();
    ctx.body = {
      code: 200,
      message: "ok",
      data,
    };
  }
}

module.exports = new RedwoodController();
