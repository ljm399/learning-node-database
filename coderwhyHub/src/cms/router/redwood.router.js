const koaRouter = require("koa-router");
const redwoodController = require("../controller/redwood.controller");

const redwoodRouter = new koaRouter({ prefix: "/redwood" });

redwoodRouter.get("/info", redwoodController.info);

redwoodRouter.get("/banner", redwoodController.banner);

redwoodRouter.get("/categories", redwoodController.categories);

module.exports = {
  redwoodRouter,
};
