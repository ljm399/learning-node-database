const connection = require("../app/database");
class momentServer{
  async insertMoment(content, id) {
    const statement = "INSERT INTO moment(content, user_id) VALUES (?, ?)";
    const [result] = await connection.execute(statement, [content, id]); 
    return result
  }

  async getMomentList(offset = 0, size = 10) {
    const statement = `
      SELECT
        m.id AS id,
        m.content AS content,
        m.createAt AS createAt,
        m.updateAt AS updateAt,
        JSON_OBJECT(
          'id', u.id,
          'name', u.name,
          'createAt', u.createAt,
          'updateAt', u.updateAt
        ) AS user
      FROM moment m
      LEFT JOIN user u ON u.id = m.user_id
      LIMIT ?, ?;
    `
    const [result] = await connection.execute(statement, [offset, size]); 
    return result
  }
}
module.exports = new momentServer()