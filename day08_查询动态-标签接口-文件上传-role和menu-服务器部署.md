# 数据操作报错，不会给后端提示

### 解决：自己把数据库语句拿到查询，看数据库下面报错提示怎么说

# 一.查询动态

### 1.1.动态列表展示评论的个数

```sql
SELECT
  m.id,
  m.content,
  m.createAt,
  (
    SELECT COUNT(*)
    FROM comment c
    WHERE c.moment_id = m.id
  ) AS commentCount
FROM moment m
ORDER BY m.createAt DESC;
```





### 需求: 判断某个表有无对应字段（动态的，可以判断多张表）

```js
const connection = require("../app/database");
const { TARGET_IS_NOT_EXIST } = require("../config/constant-errors");

async function verifyExisted(ctx, id, tableName) {
  const statement = `SELECT id FROM ${tableName} WHERE ${tableName}.id = ?;`;
  const [result] = await connection.execute(statement, [id]);
  ctx.tableName = tableName
  if (!result.length) {
    ctx.app.emit("error", TARGET_IS_NOT_EXIST, ctx);
    return false;
  }
  return true;
}

module.exports = verifyExisted;

那个中间件引入verifyExisted还要有if (!existed) return来终止程序否则只有ctx.body会被覆盖
```

#### 问题1：中间件或控制器中为什么需要ctx.body和 return一起出现才能终止程序

##### 为什么一定要有 `if (!existed) return;`

因为你现在的 [verifyExisted(...)](cci:1://file:///d:/Desktop/JavaScript/16_node%E9%AB%98%E7%BA%A7/coderwhyHub/src/utils/verifyIsExisted.js:3:0-11:1) 只是做了两件事：

- **emit 错误事件**：`ctx.app.emit('error', ...)` 让全局错误处理器去设置 `ctx.body`
- **返回一个布尔值**：告诉调用者“存在/不存在”

但它**不会自动阻止**你后面的代码继续执行。

##### 如果没有这一行，会发生什么
你 controller 代码是顺序执行的：

```js
await verifyExisted(ctx, moment_id, "moment");
const result = await create(content, moment_id, id);

ctx.body = { code: 200, ... }
```

即使 `moment_id` 不存在：

1. [verifyExisted](cci:1://file:///d:/Desktop/JavaScript/16_node%E9%AB%98%E7%BA%A7/coderwhyHub/src/utils/verifyIsExisted.js:3:0-11:1) 触发了 `app.on('error')`，此时 `ctx.body` 被设置成“相关元素不存在”
2. 代码继续往下走，仍然执行 [create(...)](cci:1://file:///d:/Desktop/JavaScript/16_node%E9%AB%98%E7%BA%A7/coderwhyHub/src/controller/comment.controller.js:3:2-18:3)（可能插入失败/也可能插入成功，取决于你数据库约束）
3. 最后又执行 `ctx.body = { code: 200, message: '评论成功' }`  
   结果就是 **把错误响应覆盖掉**，你客户端就看不到错误了

所以必须用：

```js
if (!existed) return;
```

来 **中断当前请求的后续业务逻辑**，避免：
- **继续插入**
- **覆盖错误响应**



#### 问题2：  if (!existedM || !existedC) return; 为什么是|| 而不是 &&

- 因为if只允许true才会执行return
- 而&&要两个都是true才执行，而||是只要一个
  - 你的需求就是只要有一个就执行



### 1.2.动态详情展示评论的列表

- 将数据转出数组/对象

目标：

- 动态详情接口 `/moment/:id` 返回动态本身
- 同时返回这个动态的评论列表 `comments: []`

#### 1.2.1 评论列表聚合成 JSON 数组（SQL 思路）

核心就是把多行 comment 聚合为一个 JSON 数组字段。

```sql
SELECT
	m.id AS id,
	m.content AS content,
	m.createAt AS createAt,
	m.updateAt AS updateAt,
	JSON_OBJECT(
		'id', u.id,
		'name', u.name,
		'createAt', u.createAt,
		'updateAt', u.updateAt
	) AS user,
	(JSON_ARRAYAGG(
		JSON_OBJECT('id',cm.id,'content',cm.content,
		'user',JSON_OBJECT('id',uc.id,'name',uc.name),
		'comment_id',cm.comment_id)
	)) AS comment
FROM moment m
LEFT JOIN user u ON u.id = m.user_id
LEFT JOIN comment cm ON cm.moment_id = m.id
LEFT JOIN user uc on uc.id = cm.user_id
where m.id = 6
GROUP BY m.id;
```

- 缺点： 当comment里面的值为空时，还是会返回comment：[id;null,content:null......]这个格式

- 解决

  ```sql
    SELECT
      m.id AS id,
      m.content AS content,
      m.createAt AS createAt,
      m.updateAt AS updateAt,
      JSON_OBJECT(
        'id', u.id,
        'name', u.name,
        'createAt', u.createAt,
        'updateAt', u.updateAt
      ) AS user,
      (
        SELECT COALESCE(
          JSON_ARRAYAGG(
          JSON_OBJECT(
              'id', cm.id,
              'content', cm.content,
              'user', JSON_OBJECT('id', uc.id, 'name', uc.name),
              'comment_id', cm.comment_id
            )
          ),
          JSON_ARRAY()
        )
        FROM comment cm
        LEFT JOIN user uc on uc.id = cm.user_id
        WHERE cm.moment_id = m.id
      ) AS comment
    FROM moment m
    LEFT JOIN user u ON u.id = m.user_id
    where m.id = ?
    GROUP BY m.id;
  ```

#### 问题1：为什么postman返回的的格式类似这样comment": "[{ \ "id\": \1, \"content\": \ \"好像要一份满意的爱妻\",\ 且没换行

- 原因：返回了string格式，而不是对象

  - 解决

  ```js
  const data = result[0];
  if (data && typeof data.user === "string")
    data.user = JSON.parse(data.user);
  if (data && typeof data.comment === "string")
    data.comment = JSON.parse(data.comment);
  
  // 返回结果
  ctx.body = {
    code: 200,
    data,
  };
  ```



#### 问题2：使用JSON_ARRAYAGG而不是JSON_ARRAY

## 为什么必须用 `JSON_ARRAYAGG`（而不是 `JSON_ARRAY`）

- **`JSON_ARRAY`**：只处理“当前行”，不会把多行合成一个数组  
- **`JSON_ARRAYAGG`**：专门用来在 `GROUP BY` 场景下把“多行”聚合成“一个 JSON 数组”，所以你必须用它



#### 问题3：为什么还使用SELECT COALESCE

- 解决当comment里面的值为空时，还是会返回comment：[id;null,content:null......]这个格式的问题

  #### 一、coalesce基本语法

  ```sql
  COALESCE(value1, value2, value3, ...)
  ```

  执行逻辑：

  👉 从左往右判断
  👉 遇到第一个 **不是 NULL 的值就返回**
  👉 如果全是 NULL → 返回 NULL

  ------

  #### 二、最简单例子

  ```sql
  SELECT COALESCE(NULL, NULL, 5, 10);
  ```

  结果：

  ```
  5
  ```

  因为：

  - 前两个是 NULL ❌
  - 第三个是 5 ✅ → 直接返回

  ------

  #### 三、最常见用法（处理空值）

  ##### 1️⃣ 给 NULL 设置默认值

  ```sql
  SELECT COALESCE(age, 0) FROM users;
  ```

  👉 含义：

  - 如果 age 是 NULL → 返回 0
  - 否则 → 返回原值

  ------

  ##### 2️⃣ 多字段兜底

  ```sql
  SELECT COALESCE(phone, email, '未提供') FROM users;
  ```

  👉 含义：

  - 有 phone → 用 phone
  - 没 phone → 用 email
  - 都没有 → 显示 “未提供”

  ------

  





# 二.标签接口

### 2.1.创建标签

标签（label/tag）通常用于：

- 给动态打上分类/话题
- 通过标签搜索动态

一般会有 `label` 表：

- `id`
- `name`（最好唯一）
- `createAt/updateAt`

#### 2.1.1 创建标签 SQL

```sql
INSERT INTO label (name) VALUES (?);
```

建议：给 `label.name` 加唯一索引，避免重复。



### 2.2.多对多关系处理

动态和标签通常是 **多对多**：

- 1 条动态可以有多个标签
- 1 个标签可以属于多条动态

所以需要一张“中间表/关系表”，例如：`moment_label`：

- `moment_id`
- `label_id`

并建议加联合唯一索引：`(moment_id, label_id)`，防止重复绑定。

#### 2.2.1 建表示例

```sql
CREATE TABLE IF NOT EXISTS moment_label (
  moment_id INT NOT NULL,
  label_id INT NOT NULL,
  -- 1. 修正命名规范 + 补全DEFAULT关键字
  create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- 2. 修正拼写错误 + 补全DEFAULT关键字
  update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- 联合主键（原写法正确，保留）
  PRIMARY KEY (moment_id, label_id),
  -- 外键约束（可选：去掉ON DELETE CASCADE，改为仅更新级联）
  FOREIGN KEY (moment_id) REFERENCES moment(id) ON UPDATE CASCADE,
  FOREIGN KEY (label_id) REFERENCES label(id) ON UPDATE CASCADE
);
```

复习要点：

- 多对多一定要有“关系表”
- 主键/唯一索引可以防止重复插入



#### 2.2.2 核心流程

1. **verifyAuth**：必须登录，拿到 `ctx.user`（或 `ctx.state.user`）
2. **verifyPermission**：当前登录用户必须拥有对该动态的操作权限（例如只能给自己的动态加标签）
3. **verifyLabelExists**：
   - label 已存在：拿到 labelId
   - label 不存在：先插入 label，再拿到 labelId
4. 最终步骤
   - 所有labels都在label表中
   - 可以动态和labels关系，添加到关系表中



#### middleware/verifyLabelExists.js

```js
// coderwhyHub/src/middleware/verifyLabelExists.middleware.js
const verifyLabelExists = async (ctx) => {
  const { momentId } = ctx.params;
  let body = ctx.request.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);// 必须要先解析否则没效果
    } catch (error) {
      body = {};
    }
  }

  const newLabels = []
  // labels: ['前端', 'Node', 'Koa']
  for (const name of labels) {
    const label = await labelService.getByName(name);
    const labelId = label
      ? label.id
      : (await labelService.create(name)).insertId; // insertId当插入时内部自动帮你sheng'c
    await momentService.addLabel(momentId, labelId);
    newLabels.push({name,labelId})
  }

  console.log(newLabels,'newLabels')
  ctx.body = { message: "ok" };
};

// moment.router.js
router.post("/:momentId/labels", verifyAuth, verifyPermission, verifyLabelExists)
```





### 2.3.为动态添加标签

```js
// coderwhyHub/src/router/moment.router.js
const koaRouter = require("koa-router")
const { verifyAuth } = require("../middleware/login.middleware")
const verifyPermissions = require("../middleware/verifyPermissions.middleware")
const verifyLabelExists = require("../middleware/verifyLabelExists.middleware")
const { addLabels } = require("../controller/moment.controller")

const momentRouter = new koaRouter({ prefix: "/moment" })

momentRouter.post(
  '/:momentid/labels',
  verifyAuth,
  verifyPermissions,
  verifyLabelExists,
  addLabels
)

module.exports = {
  momentRouter,
}
```

- controller/moment.controller.js

```js
// coderwhyHub/src/controller/moment.controller.js
const momentServer = require("../server/moment.server")
class MomentController {
  async addLabels(ctx) {
    const { momentid } = ctx.params
    const labels = ctx.labels || []

    // 1.遍历 ctx.labels
    for (const label of labels) {
      const labelId = label.id

      // 2.判断关系表 moment_label 是否已经存在
      const has = await momentServer.hasLabel(momentid, labelId)
      if (has) continue

      // 3.不存在则插入关系
      await momentServer.addLabel(momentid, labelId)
    }

    ctx.body = { code: 200, message: 'ok' }
  }
}
```

- service/moment.server.js

```js
// coderwhyHub/src/server/moment.server.js
const connection = require("../app/database")

class MomentService {
  async hasLabel(momentId, labelId) {
    const statement = `
      SELECT *
      FROM moment_label
      WHERE moment_id = ? AND label_id = ?;
    `
    const [result] = await connection.execute(statement, [momentId, labelId])
    return !!result.length
  }

  async addLabel(momentId, labelId) {
    const statement = `
      INSERT INTO moment_label (moment_id, label_id)
      VALUES (?, ?);
    `
    const [result] = await connection.execute(statement, [momentId, labelId])
    return result
  }
}

module.exports = new MomentService()
```







### 2.4.动态列表展示标签个数

moment.server.js

```sql
SELECT
  m.id id,
  m.content content,
  m.createAt createTime,
  m.updateAt updateTime,
  JSON_OBJECT(
    'id', u.id,
    'name', u.name,
    'createTime', u.createAt,
    'updateTime', u.updateAt
  ) user,
  (SELECT COUNT(*) FROM comment WHERE comment.moment_id = m.id) commentCount,
  (SELECT COUNT(*) FROM moment_label ml WHERE ml.moment_id = m.id) labelCount
FROM moment m
LEFT JOIN user u ON u.id = m.user_id
LIMIT 10 OFFSET 0;
```





### 2.5.动态详情展示标签列表

- 评论的数据使用子查询

目标：动态详情返回：

- `labels: []`（标签列表）
- `comments: []`（评论列表，仍可用子查询聚合）

#### 2.5.1.moment.server.js里面 

```sql
SELECT
  m.id id,
  m.content content,
  m.createAt createTime,
  m.updateAt updateTime,
  JSON_OBJECT(
    'id', u.id,
    'name', u.name,
    'createTime', u.createAt,
    'updateTime', u.updateAt
  ) user,
  (
    SELECT
      JSON_ARRAYAGG(JSON_OBJECT(
        'id', c.id,
        'content', c.content,
        'commentId', c.comment_id,
        'user', JSON_OBJECT('id', cu.id, 'name', cu.name)
      ))
    FROM comment c
    LEFT JOIN user cu ON c.user_id = cu.id
    WHERE c.moment_id = m.id
  ) comments,
  (
    JSON_ARRAYAGG(JSON_OBJECT(
      'id', l.id,
      'name', l.name
    ))
  ) labels
FROM moment m
LEFT JOIN user u ON u.id = m.user_id
LEFT JOIN moment_label ml ON ml.moment_id = m.id
LEFT JOIN label l ON ml.label_id = l.id
WHERE m.id = 2
GROUP BY m.id;

```

- 为什么对labels和comments**同时**使用left join会有问题（特征就是labels和comments两张表没有关系，还使用left join就会出现笛卡尔积，类比就是comments拼接到labels各个子项中即对labels遍历，然后comment再对label（无s）拼接）

  - 理由

    如果你把 `comment` 和 `moment_label/label` 都直接 `LEFT JOIN` 到主查询里，会出现：

    - 一条动态有 N 条评论、M 个标签时，JOIN 结果会变成 N*M 行（笛卡尔积）
  
- 解决办法1：上面的子查询

- 解决办法2：写两个查询再拼接

  ```js
  // 方案2：两次查询 + 代码拼接（示例伪代码）
  // 1) 查 moment 基本信息 + user
  // 2) 查 labels 列表
  // 3) 查 comments 列表
  // 4) 在 controller/service 里把三份结果合并成一个对象返回
  
  // moment:
  SELECT ... FROM moment m LEFT JOIN user u ... WHERE m.id = ?;
  
  // labels:
  SELECT l.id, l.name
  FROM moment_label ml
  LEFT JOIN label l ON ml.label_id = l.id
  WHERE ml.moment_id = ?;
  
  // comments:
  SELECT c.id, c.content, c.comment_id, cu.id userId, cu.name userName
  FROM comment c
  LEFT JOIN user cu ON c.user_id = cu.id
  WHERE c.moment_id = ?;
  ```

  





# 三.文件上传

### 安装：

### npm i multer

### npm i @koa/multer

文件上传一般要解决 3 件事：

1. 客户端把文件通过 `multipart/form-data` 发到服务器
2. 服务器保存文件到磁盘或对象存储（OSS）
3. 把文件的访问路径/文件名/类型保存到数据库（可选）

### 3.1.文件上传接口

Koa 常用方案：`koa-multer`（基于 multer）。

#### 3.1.1 单文件上传示例（avatar）

```js
// file.router.js
const Router = require("koa-router");
const { avatarHandler } = require("../controller/file.controller");
const { avatarUpload } = require("../middleware/file.middleware");
const { verifyAuth } = require("../middleware/login.middleware")

// coderwhyHub/src/router/file.router.js
const fileRouter = new Router({ prefix: "/upload" });

fileRouter.post("/avatar", verifyAuth, avatarUpload, avatarHandler);

module.exports = fileRouter;
```

- file.middleware.js(upload逻辑)

```js
const multer = require("@koa/multer");

const upload = multer({ dest: "uploads/" });
const avatarUpload = upload.single("avatar");

module.exports = {
  avatarUpload,
};
```

- file.controller.js

```js
// coderwhyHub/src/controller/file.controller.js
const avatarHandler = (ctx) => {
  // 文件信息在 ctx.file
  console.log("文件上次成功",ctx.request.file);
  ctx.body = {
    filename: ctx.file.filename,
    mimetype: ctx.file.mimetype,
    size: ctx.file.size,
  };
};

module.exports = {
  avatarHandler,
};
```

- gitignore

```
uploads/
```



### 上传postman

选择form-data -> key选择avatar，value是选择文件



### vscode看不了图片

#### 修改名称，后缀添加.png/.jpg



#### 3.1.2.保存上传图片的信息

- 完善file.controller.js

  ```js
  const fileService = require('../service/file.service')
  const avatarHandler = async (ctx) => {
    const { filename, mimetype, size } = ctx.file
    const { id } = ctx.user
    // 保存到数据库
    const result = await fileService.create(filename, mimetype, size, id)
  
    ctx.body = {
      code: 200,
      message: '文件上传成功',
      data: result,
    }
  }
  ```
  
- 数据库操作

  ```sql
  CREATE TABLE IF NOT EXISTS `avatar` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL UNIQUE,
    mimetype VARCHAR(30),
    size INT,
    user_id INT,
    createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updateAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
  );
  ```

- file.server.js()

  ```js
  const connection = require("../app/database")
  class FileService {
    async create(filename, mimetype, size, userId) {
      const statement = `
        INSERT INTO avatar (filename, mimetype, size, user_id)
        VALUES (?, ?, ?, ?);
      `
      const [result] = await connection.execute(statement, [
        filename,
        mimetype,
        size,
        userId,
      ])
      return result
    }
  }
  module.exports = new FileService()
  ```





### 3.2.展示图片接口

目标：根据文件名把图片返回给浏览器或postman。

- 展示的前提要让浏览器知道你是图片，怎么知道，则靠ctx.type = mimtype

#### 实现展示头像

- user.router.js

  ```js
  // coderwhyHub/src/router/user.router.js
  const koaRouter = require("koa-router")
  const userController = require("../controller/user.controller")

  const useRouter = new koaRouter({ prefix: "/user" })

  useRouter.get("/:userId/avatar", userController.showAvatarImage)

  module.exports = {
    useRouter,
  }
  ```

- user.controller.js

  ```js
  // coderwhyHub/src/controller/user.controller.js
  const fs = require("fs")
  const fileService = require("../server/file.server")
  const { UPLOAD_PATH } = require("../config/path")

  class UserController {
    async showAvatarImage(ctx, next) {
      // 1.获取用户的id
      const { userId } = ctx.params

      // 2.获取userId对应的头像信息
      const avatarInfo = await fileService.queryAvatarWithUserId(userId)

      // 3.读取头像所在的文件
      const { filename, mimetype } = avatarInfo
      ctx.type = mimetype
      ctx.body = fs.createReadStream(`${UPLOAD_PATH}/${filename}`)
    }
  }

  module.exports = new UserController()
  ```

- 数据库操作

  ```sql
  SELECT * FROM avatar WHERE user_id = ?;
  ```

- file.service.js

  ```js
  // coderwhyHub/src/server/file.server.js
  const connection = require("../app/database")

  class FileService {
    async queryAvatarWithUserId(userId) {
      const statement = "SELECT * FROM avatar WHERE user_id = ?;"
      const [result] = await connection.execute(statement, [userId])
      return result.pop()
    }
  }

  module.exports = new FileService()
  ```

- config/path.js 封装图片位置

  ```js
  const path = require("path")
  
  const UPLOAD_PATH = path.resolve(__dirname, "../../uploads")
  
  module.exports = {
    UPLOAD_PATH,
  }
  ```





### 3.3.将图片avatarURL保持user表中

目标：上传成功后，把头像的访问 URL 写回用户表

#### 1. user表增加相关字段，以及相关数据库操作

```sql
ALTER TABLE user ADD avatar_url VARCHAR(200);
UPDATE user SET avatar_url = ? WHERE id = ?;
```

#### 2.配置.env,放置SERVER_PORT

```env
SERVER_PORT=http://localhost:8000
```

#### 3.修改file.controller.js

```js
const fileService = require("../service/file.service")
const userService = require("../service/user.service")
const {SERVER_PORT} = requier("../config/xxx")

class FileController {
  async create(ctx, next) {
    const { filename, mimetype, size } = ctx.request.file
    const { id } = ctx.user

    // 1.将图片信息和id结合起来进行存储
    const result = await fileService.create(filename, mimetype, size, id)

    // 2.将头像的地址信息，保存到user表中
    const avatarUrl = `${SERVER_PORT}/users/avatar/${id}`
    const result2 = await userService.updateUserAvatar(avatarUrl, id)

    // 3.返回结果
    ctx.body = {
      code: 0,
      message: "头像上传成功，可以查看~",
      data: avatarUrl,
    }
  }
}

module.exports = new FileController() 
```

#### 4.user.server.js

```js
const connection = require("../app/database")
class UserService {
  async updateUserAvatar(avatarUrl, id) {
    const statement = "UPDATE user SET avatar_url = ? WHERE id = ?;"
    const [result] = await connection.execute(statement, [avatarUrl, id])
    return result
  }
}
module.exports = new UserService()
```



## 知识补充：insertId属性

- insertId当插入时内部自动帮你生成的



# 角色，菜单以及角色表

### 来自webpack配置那个视频的最后一个视频

- 讲解：因为使用广泛且有点难度

### 放置位置自己在上面的根目录创建cms

- 因为上面项目自己设置了自动注册所有router
- 先创文件夹
  - cms/router
  - cms/controller
  - cms/server（放数据库操作）
  - cms/middleware

### role

- role 建表

```sql
CREATE TABLE IF NOT EXISTS role (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(20) NOT NULL UNIQUE,
  intro VARCHAR(200),
  createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updateAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO role (name, intro) VALUES ('admin', '管理员');
```

- cms/server/role.service.js

```js
const connection = require("../../app/database");

class RoleService {
  async create(role) {
    const statement = "INSERT INTO role SET ?;"; // 便捷用法，直接对象传入，它内部帮你解构和赋值
    const [result] = await connection.query(statement, [role]);
    return result;
  }

  async list(offset = 0, size = 10) {
    const statement = "SELECT * FROM role LIMIT ?, ?;";
    const [result] = await connection.query(statement, [Number(offset), Number(size)]);//注意这里要转为数字，否则没效果
    return result;
  }
}

module.exports = new RoleService();
```

- cms/controller/role.controller.js

  ```js
  const roleService = require("../server/role.service");
  
  class RoleController {
    // 增
    async create(ctx) {
      const role = ctx.request.body;
      const result = await roleService.create(role);
      ctx.body = {
        code: 200,
        message: "创建角色成功",
        data: result,
      };
    }
  
    // 查
    async list(ctx) {
      const { offset, size } = ctx.query;
      const result = await roleService.list(offset, size);
      ctx.body = {
        code: 200,
        data: result,
      };
    }
  }
  
  module.exports = new RoleController();
  
  ```

- cms/router/role.router.js

  ```
  const koaRouter = require("koa-router");
  const roleController = require("../controller/role.controller");
  
  const roleRouter = new koaRouter({ prefix: "/role" });
  
  // 增
  roleRouter.post("/", roleController.create);
  
  // 查
  roleRouter.get("/", roleController.list);
  
  module.exports = {
    roleRouter,
  };
  
  ```

### menu

- menu 建表

```sql
CREATE TABLE IF NOT EXISTS menu (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(20) NOT NULL,
  type TINYINT(1),
  icon VARCHAR(20),
  parentId INT DEFAULT NULL,
  url VARCHAR(50) UNIQUE,
  permission VARCHAR(100) UNIQUE,
  sort INT DEFAULT 100,
  createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updateAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(parentId) REFERENCES menu(id) ON DELETE CASCADE ON UPDATE CASCADE
);
```

- cms/server/menu.service.js

```js
const connection = require("../../app/database");

class MenuService {
  async create(menu) {
    try {
      const statement = "INSERT INTO menu SET ?;"; // 一样使用了便捷的用法
      const [result] = await connection.query(statement, [menu]); // 注意这里使用数据库的方式都是query，不是craete或post那些
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  // 查询整个菜单表
  async wholeMenu() {
    const statement = `
      SELECT
        m1.id id,
        m1.name name,
        m1.type type,
        m1.url url,
        m1.icon icon,
        m1.sort sort,
        m1.createAt createAt,
        m1.updateAt updateAt,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              "id", m2.id,
              "name", m2.name,
              "type", m2.type,
              "parentId", m2.parentId,
              "url", m2.url,
              "sort", m2.sort,
              "createAt", m2.createAt,
              "updateAt", m2.updateAt,
              "children",
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      "id", m3.id,
                      "name", m3.name,
                      "type", m3.type,
                      "parentId", m3.parentId,
                      "url", m3.url,
                      "sort", m3.sort,
                      "permission", m3.permission,
                      "createAt", m3.createAt,
                      "updateAt", m3.updateAt
                    )
                  )
                  FROM menu m3
                  WHERE m3.parentId = m2.id
                  ORDER BY m3.sort
                )
            )
          )
          FROM menu m2
          WHERE m1.id = m2.parentId
          ORDER BY m2.sort
        ) children
      FROM menu m1
      WHERE m1.type = 1;
    `;

    const [result] = await connection.query(statement);
    return result;
  }
}

module.exports = new MenuService();
```

- cms/controller/menu.controller.js

  ```js
  const menuService = require("../server/menu.service");
  
  class MenuController {
    // 增
    async create(ctx) {
      const menu = ctx.request.body;
      const result = await menuService.create(menu);
      ctx.body = {
        code: 200,
        message: "创建菜单成功",
        data: result,
      };
    }

    // 查
    async wholeMenu(ctx) {
      const result = await menuService.wholeMenu();
    
      for (const item of result) {
        if (item && typeof item.children === "string") {
          item.children = JSON.parse(item.children);
        }
      }
    
      ctx.body = {
        code: 200,
        data: result,
      };
    }
  }
  
  module.exports = new MenuController();
  
  ```

- cms/router/menu.router.js

  ```javascript
  const koaRouter = require("koa-router");
  const menuController = require("../controller/menu.controller");
  
  const menuRouter = new koaRouter({ prefix: "/menu" });
  
  // 增
  menuRouter.post("/", menuController.create);
  
  // 查
  menuRouter.get("/", menuController.wholeMenu);
  
  module.exports = {
    menuRouter,
  };
  
  ```



### role_menu

- role_menu关系表

```sql
CREATE TABLE IF NOT EXISTS `role_menu`(
  roleId INT NOT NULL,
  menuId INT NOT NULL,
  createAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updateAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(roleId, menuId),
  FOREIGN KEY (roleId) REFERENCES role(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (menuId) REFERENCES menu(id) ON DELETE CASCADE ON UPDATE CASCADE
);
```

- cms/server/role.service.js

  ```js
  async assignMenu(roleId, menuIds) {
    // 1. 先删除之前的关系
    const deleteStatement = "DELETE FROM role_menu WHERE roleId = ?;";
    await connection.query(deleteStatement, [roleId]);
  
    // 2. 插入新的值
    const insertStatement =
      "INSERT INTO role_menu (roleId, menuId) VALUES (?, ?);";
    for (const menuId of menuIds) {
      await connection.query(insertStatement, [roleId, menuId]);
    }
  }
  ```

- cms/controller/role.controller.js

  ```js
  async assignMenu(ctx) {
    // 1. 获取参数
    const roleId = ctx.params.roleId;
    const menuIds = ctx.request.body.menuIds;
  
    // 2. 分配权限
    await roleService.assignMenu(roleId, menuIds);
  
    // 3. 返回结果
    ctx.body = {
      code: 0,
      message: "分配权限成功~",
    };
  }
  ```

- cms/router/role.router.js

  ```js
  // 分配权限
  roleRouter.post("/:roleId/menu", roleController.assignMenu);
  ```




### 完善role的查询

#### 效果：具备获取menu对应相关树结构的功能

- cms/controller/role.controller.js

  ```js
  async list(ctx) {
    // 1. 获取角色基本信息
    const { offset = 0, size = 10 } = ctx.query;
    const result = await roleService.list(Number(offset), Number(size));
  
    // 2. 获取菜单信息
    for (const role of result) {
      const menu = await roleService.getRoleMenu(role.id);
      role.menu = menu;
    }
  
    ctx.body = {
      code: 0,
      message: "获取角色列表~",
      data: result,
    };
  }
  ```

- cms/server/role.service.js

  ```js
  const menuService = require("./menu.service");
  
  async getRoleMenu(roleId) {
    const getMenuIdsStatement = `
      SELECT
        rm.roleId,
        JSON_ARRAYAGG(rm.menuId) menuIds
      FROM role_menu rm
      WHERE rm.roleId = ?
      GROUP BY rm.roleId;
    `;
  
    const [roleMenuIds] = await connection.query(getMenuIdsStatement, [roleId]);
    if (!roleMenuIds.length) return [];
  
    const menuIds = roleMenuIds[0].menuIds;
    const wholeMenu = await menuService.wholeMenu();
  
    function filterMenu(menu) {
      const newMenu = [];
        
      // 常用算法：作用用menuIds对wholeMenu稀释
        // 注意async list里面是对role遍历了
      for (const item of menu) {
        if (item.children) {
          item.children = filterMenu(item.children);
        }
        if (menuIds.includes(item.id)) {
          newMenu.push(item);
        }
      }
      return newMenu;
    }
  
    return filterMenu(wholeMenu);
  }
  ```


# 四.项目部署

### 4.1.购买云服务器

常见选择：阿里云/腾讯云/华为云等。(建议买一年，面试以及优惠)

- 选择 Linux（常见 Ubuntu/CentOS）
- 开放端口（安全组/防火墙），例如：
  - 22（SSH）
  - 80/443（HTTP/HTTPS）
  - 你服务实际端口（建议通过 Nginx 反代，不直接暴露 Node 端口）

### 4.2.服务器环境搭建

#### 方案A：CentOS Stream / Rocky / Alma（dnf）

1. 连接云服务器（SSH）

```bash
# 连接服务器（默认 22 端口）
ssh root@服务器公网IP

# 指定 SSH 端口（如果不是 22）
ssh -p 2222 root@服务器公网IP

# 使用私钥登录（推荐）
ssh -i ~/.ssh/id_rsa root@服务器公网IP
```

2. 安装 Node.js（dnf，NodeSource 推荐） -y就是所有选择都选yes

```bash
# 安装 curl（用于拉取 NodeSource 安装脚本）（可选）
dnf -y install curl

# 配置 Node.js 18 的安装源（按需把 18.x 换成 20.x） （可选）
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -

# 安装 Node.js（包含 node 与 npm）
dnf -y install nodejs

# 验证 Node / npm 版本
node -v
npm -v

# 可选：切换 npm 镜像源（国内更快）
npm config set registry https://registry.npmmirror.com

# 可选：安装 pm2（Node 服务进程守护/后台运行常用）
npm i -g pm2
pm2 -v
```

3. 安装 MySQL 8（dnf，官方源）

```bash
# 搜索 mysql-server 包
dnf search mysql-server

# 查看 mysql-server 包信息（能看到版本号、来源仓库等）
dnf info mysql-server

# 安装 mysql-server（-y 表示所有提示默认选 yes）
dnf -y install mysql-server

# 启动 MySQL 服务
systemctl start mysqld

# 查看 MySQL 服务状态（active (running) 表示启动成功）
systemctl status mysqld

# 设置开机自启
systemctl enable mysqld
```

- mysql

```sql
-- 进入mysql
# 尝试进入 mysql（如果能直接进说明是 socket/免密策略）
mysql

# 如果不行再用
# 需要密码时用这种方式进入
mysql -uroot -p

-- 切换到 mysql 系统库
USE mysql;

-- 查看当前账号的 host 限制（一般会看到 root 绑定 localhost）
SELECT host, user FROM user;

-- 把 root 的 host 改为 '%'：允许任意 IP 远程登录（前提是安全组/防火墙放行 3306）
UPDATE user SET host = '%' WHERE user = 'root';

-- 刷新权限让配置生效
FLUSH PRIVILEGES;
```

```bash
# MySQL 安全初始化（设置密码策略/移除匿名用户/删除 test 库等）
# 注意：有些选项会建议禁止 root 远程登录，按你的实际需求选择
mysql_secure_installation

# 这一步密码配置很难，用ai帮你想个密码
```

```bash
# 确认 MySQL 监听 3306（用于排错）
ss -lntp | grep 3306
```

5. 本地 Navicat 连接远程数据库（开放 3306）--- 一般可不用

```bash
# 放行 3306 端口（firewalld 防火墙）
firewall-cmd --permanent --add-port=3306/tcp

# 重载防火墙规则
firewall-cmd --reload

# 确认已开放端口
firewall-cmd --list-ports
```

- 云厂商安全组也需要放行 `3306/tcp`（建议只放行你的公网 IP，而不是 0.0.0.0/0）

---

#### 方案B：Ubuntu（apt） -- 了解

1. 连接云服务器（SSH）

```bash
# 连接服务器（默认 22 端口）
ssh root@服务器公网IP

# 指定 SSH 端口（如果不是 22）
ssh -p 2222 root@服务器公网IP

# 使用私钥登录（推荐）
ssh -i ~/.ssh/id_rsa root@服务器公网IP
```

2. 安装 Node.js（apt，NodeSource 推荐）

```bash
# 更新包索引
apt update

# 安装 curl（用于拉取 NodeSource 安装脚本）
apt -y install curl

# 配置 Node.js 18 的安装源（按需把 18.x 换成 20.x）
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# 安装 Node.js（包含 node 与 npm）
apt -y install nodejs

# 验证 Node / npm 版本
node -v
npm -v

# 可选：切换 npm 镜像源（国内更快）
npm config set registry https://registry.npmmirror.com

# 可选：安装 pm2（Node 服务进程守护/后台运行常用）
npm i -g pm2
pm2 -v
```

3. 安装 MySQL（apt）

```bash
# 更新包索引
apt update

# 安装 MySQL 服务端
apt -y install mysql-server

# 启动 MySQL 并设置开机自启
systemctl enable --now mysql

# 查看 MySQL 状态
systemctl status mysql
```

4. 配置 MySQL（创建库/用户）

```bash
# 进入 MySQL（Ubuntu 上常见 root 使用 auth_socket，可先直接 sudo mysql）
sudo mysql
```

```sql
-- 创建项目数据库（按你的实际库名修改）
CREATE DATABASE coderwhyhub DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 创建业务账号（允许远程连接用 '%'）
CREATE USER 'coderwhy'@'%' IDENTIFIED BY '你的强密码';

-- 授权业务账号访问指定数据库
GRANT ALL PRIVILEGES ON coderwhyhub.* TO 'coderwhy'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

```bash
# 确认 MySQL 监听 3306（用于排错）
ss -lntp | grep 3306
```

5. 本地 Navicat 连接远程数据库（开放 3306）--- 一般可不用

```bash
# 允许 3306 端口通过 ufw（Ubuntu 常用防火墙）
ufw allow 3306/tcp

# 查看 ufw 状态与规则
ufw status
```

- 云厂商安全组也需要放行 `3306/tcp`（建议只放行你的公网 IP，而不是 0.0.0.0/0）





### 4.3.部署Node服务器

- 使用remote

- 找到配置

  - 类似这样

    ```js
    Host 101.33.196.88
      HostName 101.33.196.88
      User root
    ```

- 然后打开文件夹一般是/root/，然后点击确定

- 把本地文件夹复制到里面就部署成功了（当然还有git clone操作）

  - 你项目中有个.env

    ```js
    SERVER_PORT=8000
    SERVER_HOST=http://localhost
    ```

    - 记得云厂商打开8000，然后SERVER_HOST改为远程服务器地址

  - postman修改

    - 之前{{locolhost}}是127.0.0.1
    - 要是想改为别的
      - 设置不同环境，然后再设置变量
        - 不同环境变量名可以相同，但值就不同，从而达到你的要求


#### 别忘了运行本地项目（否则postman有问题），以及修改mysql密码

- node 项目





### 4.4.PM2工具

 刚才通过终端启动 node 程序，如果终端关闭：

 - node 进程会被关闭
 - 服务就无法继续对外提供访问

 在真实部署中，通常会使用 `pm2` 来管理 Node 的进程：

 - PM2 是 Node 的进程管理器
 - 可以将 Node 程序以后台进程运行
 - 终端关闭后，服务仍可继续运行

 安装 pm2：

 ```bash
 # 全局安装 pm2
 npm install pm2 -g
 ```

 pm2 常用命令：

 ```bash
 # 命名启动（示例：启动 app.js，并命名为 my-api）
cd coderwhyHub
pm2 start ./src/main.js --name coderwhyHub

 # 查看所有进程状态
 pm2 list

 # 停止指定 id 的进程
 pm2 stop 0

 # 停止所有进程
 pm2 stop all

 # 重启所有进程
 pm2 restart all

 # 重启指定 id 的进程
 pm2 restart 0

 # 删除指定 id 的进程（从 pm2 进程列表中移除）
 pm2 delete 0

 # 删除所有进程
 pm2 delete all

 # 以 cluster 模式启动多个进程（示例：启动 4 个进程做负载均衡）
 pm2 start app.js -i 4
