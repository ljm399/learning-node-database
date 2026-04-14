const {
  NAME_OR_PW_IS_NULL,
  NAME_DOES_NOT_EXIST,
  INCORRECT_PASSWORD,
  UNAUTHORIZED,
} = require("../config/constant-errors");
const userServer = require("../server/user.server");
const jwt = require("jsonwebtoken");
const { privateKey, publicKey } = require("../config/index");

const verfiyLogin = async (ctx, next) => {
  // console.log(ctx.user,'ctx.user') // undefined ctx.user
  // console.log(ctx.request.body,'ctx.body') // { name: 'mjlcode', password: '12345' }
  const { name, password } = ctx.request.body || {};

  // 1.判断有无输入账号和密码
  if (!name || !password) {
    return ctx.app.emit("error", NAME_OR_PW_IS_NULL, ctx);
  }

  // 2. 判断账号是否存在
  const NameIsExist = await userServer.query({ name });
  // console.log(NameIsExist, "name");
  if (!NameIsExist.length) {
    return ctx.app.emit("error", NAME_DOES_NOT_EXIST, ctx);
  }

  // 3. 判断密码是否正确
  const IsPwRight = await userServer.pwJudgment(name, password);
  if (!IsPwRight) {
    return ctx.app.emit("error", INCORRECT_PASSWORD, ctx);
  }

  // 4.拿到数据库查询到的值，给之后ctx.body传递出去
  ctx.user = NameIsExist[0];

  await next();
};

const verifyAuth = async (ctx, next) => {
  // 1.获取里面的token
  const authorization = ctx.get("authorization");
  if (!authorization) {
    return ctx.app.emit("error", UNAUTHORIZED, ctx);
  }
  const pureToken = authorization.replace(/^Bearer\s+/i, "");
  // 2.验证
  let payload;
  try {
    payload = jwt.verify(pureToken, publicKey, {
      algorithms: ["RS256"],
    });
  } catch (error) {
    return ctx.app.emit("error", UNAUTHORIZED, ctx);
  }

  ctx.user = payload;
  

  // 3.成功就执行下个中间件
  await next();
};

module.exports = {
  
  verfiyLogin,
  verifyAuth,
};
