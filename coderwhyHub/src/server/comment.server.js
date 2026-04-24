const connection = require("../app/database");
class commentServer{
  async create(content, momentid, id) {
    const statement = "INSERT INTO `comment` (content, moment_id, user_id) VALUES (?, ?, ?);"
    const result = await connection.execute(statement, [content, momentid, id])
    // console.log(result,'res')
    return result[0]
  }

  async reply(content, momentid, id, commentid) {
    const statement = "INSERT INTO `comment` (content, moment_id, user_id, comment_id) VALUES (?, ?, ?, ?);"
    const result = await connection.execute(statement, [content, momentid, id, commentid])
    return result[0]
  }

}
module.exports = new commentServer()