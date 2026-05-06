const menuService = require("../server/menu.service");

class MenuController {
  // 增
  async create(ctx) {
    const menu = ctx.request.body;
    const result = await menuService.create(menu);
    ctx.body = {
      code: 200,
      message: "创建菜单成功",
      data: result,
    };
  }

  // 查
  async wholeMenu(ctx) {
    const result = await menuService.wholeMenu();

    for (const item of result) {
      if (item && typeof item.children === "string") {
        item.children = JSON.parse(item.children);
      }
    }

    ctx.body = {
      code: 200,
      data: result,
    };
  }
}

module.exports = new MenuController();
