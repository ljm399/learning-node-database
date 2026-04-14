// 导入app
const app = require("./app");
const { SERVER_PORT } = require("./config/server");

// 启动时 require('./utils/handle-error')，确保监听器被注册，否则non-error thrown
require("./utils/handle-error");

// 启动app
app.listen(SERVER_PORT, () => {
  console.log("koa服务器开启成功");
});
