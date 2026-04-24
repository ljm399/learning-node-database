const connection = require("../app/database");
const { TARGET_IS_NOT_EXIST } = require("../config/constant-errors");

async function verifyExisted(ctx, id, tableName) {
  const statement = `SELECT id FROM ${tableName} WHERE ${tableName}.id = ?;`;
  const [result] = await connection.execute(statement, [id]);
  ctx.tableName = tableName
  if (!result.length) {
    ctx.app.emit("error", TARGET_IS_NOT_EXIST, ctx);
    return false;
  }
  return true;
}

module.exports = verifyExisted;
