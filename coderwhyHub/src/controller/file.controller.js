const fileServer = require("../server/file.server");
const userServer = require("../server/user.server");
const { SERVER_PORT, SERVER_HOST } = require("../config/server");

class FileController {
  async avatarHandler(ctx) {
    console.log(ctx.file, ctx.user, "sdfsd");
    const { filename, mimetype, size } = ctx.file;
    const { id } = ctx.user;
    const result = await fileServer.create(filename, mimetype, size, id);

    const avatarUrl = `${SERVER_HOST}:${SERVER_PORT}/user/${id}/avatar`;
    await userServer.updateUserAvatar(avatarUrl, id);

    ctx.body = {
      code: 200,
      message: "头像上传成功",
      data: {
        avatarUrl,
        result,
      },
    };
  }
}

module.exports = new FileController();

