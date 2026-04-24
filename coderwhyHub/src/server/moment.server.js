const connection = require("../app/database");
class momentServer {
  // 增
  async insertMoment(content, id) {
    const statement = "INSERT INTO moment(content, user_id) VALUES (?, ?)";
    const [result] = await connection.execute(statement, [content, id]);
    return result;
  }

  // 删
  async removeMoment(id) {
    const statement = "DELETE FROM moment WHERE id = ?;";
    const [result] = await connection.execute(statement, [id]);
    return result;
  }

  // 改
  async updateMoment(id, content) {
    const statement = "UPDATE moment SET content = ? WHERE id = ?;";
    const [result] = await connection.execute(statement, [content, id]);
    return result;
  }

  // 查
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
        ) AS user,
        (SELECT COUNT(*) FROM comment WHERE comment.moment_id = m.id) commentCount
      FROM moment m
      LEFT JOIN user u ON u.id = m.user_id
      LIMIT ?, ?;
    `;
    const [result] = await connection.execute(statement, [offset, size]);
    return result;
  }
  async getMomentDetail(detailId) {
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
        ) AS user,
        (
          SELECT COALESCE(
            JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', cm.id,
                'content', cm.content,
                'user', JSON_OBJECT('id', uc.id, 'name', uc.name),
                'comment_id', cm.comment_id
              )
            ),
            JSON_ARRAY()
          )
          FROM comment cm
          LEFT JOIN user uc on uc.id = cm.user_id
          WHERE cm.moment_id = m.id
        ) AS comment
      FROM moment m
      LEFT JOIN user u ON u.id = m.user_id
      where m.id = ?
      GROUP BY m.id;
    `;
    const [result] = await connection.execute(statement, [detailId]);
    return result;
  }
}
module.exports = new momentServer();
