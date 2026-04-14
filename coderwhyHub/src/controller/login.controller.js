const jwt = require('jsonwebtoken')
const { privateKey, publicKey } = require('../config/index')
class loginController {
  sign(ctx,next){
    // 1.获取用户信息
    const { id, name } = ctx.user

    // 对称加密
    // const secret = 'iamserect'
    // // 1.jwt编译成token
    // const token = jwt.sign(user,secret,{expiresIn:'2h'})
    // // 返回token
    // ctx.body = { code:200, data:{token}}

    // 对称加密
    const token = jwt.sign({ id, name }, privateKey, {
      expiresIn: 24 * 60 * 60,
      algorithm: "RS256"
    })
    ctx.body = { code:200, data:{ id, name, token}}
  }

  test(ctx,next) {
    // 由于下面验证代码每次请求都会用到，所以封装一个中间件
    // // 1.获取里面的token
    // const token = ctx.requestHeaders.get('authorization')
    // const pureToken = token.replace('Bearer','')
    // // 2.验证
    // const payload = jwt.verify(pureToken, publicKey, {
    //   algorithms: ["RS256"]
    // })
    // // 3.失败则报错
    // if(!payload) {
    //   return ctx.app.emit('error',NAME_DOES_NOT_EXIST,ctx)
    // }

    const payload = ctx.user
    // 验证成功返回数据，或者执行下个中间件
    ctx.body = {
      code: 200,
      payload,
      message: '身份验证通过'
    }

  }
}

module.exports = new loginController()