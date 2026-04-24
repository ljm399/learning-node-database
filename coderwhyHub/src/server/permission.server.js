const connection = require("../app/database");
class permissionServer {
  async verifyPermisson(id, user_id, pureName) {
    const statement = `SELECT * FROM ${pureName} where id = ? and user_id = ?;`;
    const [result] = await connection.execute(statement, [
      id,
      user_id,
    ]);

    return result.length > 0;
  }
}
module.exports = new permissionServer();
