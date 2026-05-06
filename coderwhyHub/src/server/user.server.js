const connection = require("../app/database");
const { md5Password } = require("../utils/md5");
class UserService {
  async createUser(user) {
    const { name, password } = user;
    const statement = "INSERT INTO user(name, password) VALUES (?, ?)";
    const result = await connection.execute(statement, [name, password]);
    return result;
  }

  async query(user) {
    const { name } = user;
    const statement = "SELECT * FROM `user` WHERE name = ?;";
    const [values] = await connection.execute(statement, [name]);
    // console.log(values,'values')
    return values;
  }

  async pwJudgment(name, pw) {
    const password = md5Password(pw);
    const statement = "SELECT password FROM `user` WHERE name = ?;";
    const [values] = await connection.execute(statement, [name]);
    // console.log(values,'values')
    if (!values.length) return false;
    return values[0].password === password;
  }

  async updateUserAvatar(avatarUrl, id) {
    const statement = "UPDATE user SET avatar_url = ? WHERE id = ?;";
    const [result] = await connection.execute(statement, [avatarUrl, id]);
    return result;
  }
}

module.exports = new UserService();
