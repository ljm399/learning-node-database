const { create } = require("../server/label.server")

class labelController{
  async create(ctx){
    const { name } = ctx.request.body

    const result = await create(name)

    ctx.body = {
      code: 200,
      message: '创建标签成功',
      result: result[0]
    }
  }
}
module.exports = new labelController()