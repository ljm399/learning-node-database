const roleService = require("../server/role.service");

class RoleController {
  // 增
  async create(ctx) {
    const role = ctx.request.body;
    const result = await roleService.create(role);
    ctx.body = {
      code: 200,
      message: "创建角色成功",
      data: result,
    };
  }

  // 查
  async list(ctx) {
    // 1. 获取角色基本信息
    const { offset = 0, size = 10 } = ctx.query;
    const result = await roleService.list(Number(offset), Number(size));

    // 2. 获取菜单信息
    for (const role of result) {
      const menu = await roleService.getRoleMenu(role.id);
      role.menu = menu;
    }

    ctx.body = {
      code: 0,
      message: "获取角色列表~",
      data: result,
    };
  }

  async assignMenu(ctx) {
    // 1. 获取参数
    const roleId = ctx.params.roleId;
    const menuIds = ctx.request.body.menuIds;
    console.log(ctx.params,'ctx.params');
    

    // 2. 分配权限
    await roleService.assignMenu(roleId, menuIds);

    // 3. 返回结果
    ctx.body = {
      code: 0,
      message: "分配权限成功~",
    };
  }
}

module.exports = new RoleController();
