const connection = require("../../app/database");
const menuService = require("./menu.service");

class RoleService {
  async create(role) {
    const statement = "INSERT INTO role SET ?;";
    const [result] = await connection.query(statement, [role]);
    return result;
  }

  async list(offset = 0, size = 10) {
    const statement = "SELECT * FROM role LIMIT ?, ?;";
    const [result] = await connection.query(statement, [Number(offset), Number(size)]);
    return result;
  }

  async assignMenu(roleId, menuIds) {
    const deleteStatement = "DELETE FROM role_menu WHERE roleId = ?;";
    // console.log('tesst');
    await connection.query(deleteStatement, [roleId]);

    const insertStatement =
      "INSERT INTO role_menu (roleId, menuId) VALUES (?, ?);";
    for (const menuId of menuIds) {
      // console.log(menuId,'me');
      await connection.query(insertStatement, [roleId, menuId]);
    }
  }

  async getRoleMenu(roleId) {
    const getMenuIdsStatement = `
      SELECT
        rm.roleId,
        JSON_ARRAYAGG(rm.menuId) menuIds
      FROM role_menu rm
      WHERE rm.roleId = ?
      GROUP BY rm.roleId;
    `;

    const [roleMenuIds] = await connection.query(getMenuIdsStatement, [roleId]);
    if (!roleMenuIds.length) return [];

    const menuIds = roleMenuIds[0].menuIds;
    const wholeMenu = await menuService.wholeMenu();

    function filterMenu(menu) {
      const newMenu = [];
      for (const item of menu) {
        if (item.children) {
          item.children = filterMenu(item.children);
        }
        if (menuIds.includes(item.id)) {
          newMenu.push(item);
        }
      }
      return newMenu;
    }

    return filterMenu(wholeMenu);
  }
}

module.exports = new RoleService();
