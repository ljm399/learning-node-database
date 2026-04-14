const fs = require("fs");

function hyAutoGetRouter(app) {
  // 1. 获取当前目录所有文件
  const files = fs.readdirSync(__dirname);

  // 2. 获取路由文件
  for (const file of files) {
    if (file === "index.js") continue;
    if (!file.endsWith(".router.js")) continue;

    const router = require(`./${file}`);
    // console.log(routers,'routers');
    const pureRouter = Object.values(router)[0];// object.value获取都是个数组
    app.use(pureRouter.routes());
    app.use(pureRouter.allowedMethods());
    
  }
}

module.exports = {
  hyAutoGetRouter,
};
