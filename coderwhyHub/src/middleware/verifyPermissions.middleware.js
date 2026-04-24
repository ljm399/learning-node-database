const { OPERATION_IS_NOT_ALLOWED } = require("../config/constant-errors");
const permissionServer = require("../server/permission.server");
const verifyPermissions = async (ctx, next) => {
  // 修改用户的id
  // params:{momentid:'1'}
  // const { momentid } = ctx.params;
  const keyName = Object.keys(ctx.params)[0]
  const resourceId = ctx.params[keyName]
  const pureName = keyName.replace('id','')  

  // 登录用户id
  const { id } = ctx.user;

  const isPermission = await permissionServer.verifyPermisson(resourceId, id, pureName);
  if (!isPermission) return ctx.app.emit("error", OPERATION_IS_NOT_ALLOWED, ctx);
  await next();
};
module.exports = verifyPermissions;
