const app = require("../app");
const {
  NAME_ALREADY_EXISTS,
  NAME_OR_PW_IS_NULL,
  NAME_DOES_NOT_EXIST,
  INCORRECT_PASSWORD,
  UNAUTHORIZED,
  OPERATION_IS_NOT_ALLOWED,
  TARGET_IS_NOT_EXIST,
} = require("../config/constant-errors");
app.on("error", (error, ctx) => {
  let message = "";
  let code = 0;
  switch (error) {
    case NAME_OR_PW_IS_NULL:
      ctx.body = {
        code: -1001,
        message: "请输入用户名和密码",
        data: null,
      };
      break;
    case NAME_ALREADY_EXISTS:
      ctx.body = {
        code: -1002,
        message: "用户名已存在",
        data: null,
      };
      break;
    case NAME_DOES_NOT_EXIST:
      ctx.body = {
        code: -1003,
        message: "用户名不存在",
        data: null,
      };
      break;
    case INCORRECT_PASSWORD:
      ctx.body = {
        code: -1004,
        message: "密码不正确",
        data: null,
      };
      break;
    case UNAUTHORIZED:
      ctx.body = {
        code: -1005,
        message: "没有权限访问",
        data: null,
      };
      break;
    case OPERATION_IS_NOT_ALLOWED:
      ctx.body = {
        code: -1006,
        message: "没有权限执行这个操作",
        data: null,
      };
      break;
    case TARGET_IS_NOT_EXIST:
      ctx.body = {
        code: -1006,
        message: `${ctx.tableName}相关元素不存在`,
        data: null,
      };
      break;
  }
});
