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





### 需求: 判断某个字段有无存在函数

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

#### 

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
  PRIMARY KEY (moment_id, label_id),
  FOREIGN KEY (moment_id) REFERENCES moment(id),
  FOREIGN KEY (label_id) REFERENCES label(id)
);
```

复习要点：

- 多对多一定要有“关系表”
- 主键/唯一索引可以防止重复插入

### 2.3.为动态添加标签

- verfyAuth
- verfyPermission
- verfyLableExists
  - 存在，那么直接使用
  - 不存在，label添加到label表
- 添加momentId和labelId之间的关系

这一块你复习要能按“中间件链路”描述清楚。

#### 2.3.1 核心流程（你可以背这个）

1. **verifyAuth**：必须登录，拿到 `ctx.user`（或 `ctx.state.user`）
2. **verifyPermission**：当前登录用户必须拥有对该动态的操作权限（例如只能给自己的动态加标签）
3. **verifyLabelExists**：
   - label 已存在：拿到 labelId
   - label 不存在：先插入 label，再拿到 labelId
4. 最终在 `moment_label` 表插入关系（并避免重复）

#### 2.3.2 示例：为动态添加标签（简化版）

```js
// moment.router.js
router.post("/:momentId/labels", verifyAuth, verifyPermission, async (ctx) => {
  const { momentId } = ctx.params;
  const { labels = [] } = ctx.request.body || {};

  // labels: ['前端', 'Node', 'Koa']
  for (const name of labels) {
    const label = await labelService.getByName(name);
    const labelId = label
      ? label.id
      : (await labelService.create(name)).insertId;
    await momentService.addLabel(momentId, labelId);
  }

  ctx.body = { message: "ok" };
});
```

这里你要注意两点：

- `labels` 可能是数组，循环时要注意异步 `await`
- `addLabel` 最好用 `INSERT IGNORE` 或先查询再插入，避免重复

### 2.4.动态列表展示标签个数

目标：列表返回 `labelCount`。

常见 SQL（子查询写法）：

```sql
SELECT
  m.id,
  m.content,
  (
    SELECT COUNT(*)
    FROM moment_label ml
    WHERE ml.moment_id = m.id
  ) AS labelCount
FROM moment m
ORDER BY m.createAt DESC;
```

复习要点：

- 标签个数统计的是关系表 `moment_label`

### 2.5.动态详情展示标签列表

- 评论的数据使用子查询

目标：动态详情返回：

- `labels: []`（标签列表）
- `comments: []`（评论列表，仍可用子查询聚合）

#### 2.5.1 标签列表聚合（示例 SQL 思路）

```sql
SELECT
  m.id,
  m.content,
  (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT('id', l.id, 'name', l.name)
    )
    FROM moment_label ml
    LEFT JOIN label l ON l.id = ml.label_id
    WHERE ml.moment_id = m.id
  ) AS labels,
  (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT('id', c.id, 'content', c.content, 'createAt', c.createAt)
    )
    FROM comment c
    WHERE c.moment_id = m.id
  ) AS comments
FROM moment m
WHERE m.id = ?;
```

注意：

- `labels/comments` 为空时可能是 `null`，在 controller 里统一转换为 `[]` 更好用。

# 三.文化上传

### 3.1.文件上传接口

文件上传一般要解决 3 件事：

1. 客户端把文件通过 `multipart/form-data` 发到服务器
2. 服务器保存文件到磁盘或对象存储（OSS）
3. 把文件的访问路径/文件名/类型保存到数据库（可选）

Koa 常用方案：`koa-multer`（基于 multer）。

#### 3.1.1 单文件上传示例（avatar）

```js
const Router = require("koa-router");
const multer = require("@koa/multer");

const upload = multer({ dest: "uploads/" });
const router = new Router({ prefix: "/upload" });

router.post("/avatar", upload.single("avatar"), (ctx) => {
  // 文件信息在 ctx.file
  ctx.body = {
    filename: ctx.file.filename,
    mimetype: ctx.file.mimetype,
    size: ctx.file.size,
  };
});
```

复习要点：

- `upload.single('avatar')` 里的字段名要和前端表单字段一致
- 保存目录 `uploads/` 只是演示，线上要考虑权限、清理、CDN 等

### 3.2.展示图片接口

目标：根据文件名把图片返回给浏览器。

最简单方式：通过 `koa-send` 或 `fs.createReadStream`。

#### 3.2.1 返回图片（stream）示例

```js
const fs = require("fs");
const path = require("path");

router.get("/avatar/:filename", (ctx) => {
  const { filename } = ctx.params;
  const filePath = path.join(__dirname, "../../uploads", filename);
  ctx.type = "image/jpeg";
  ctx.body = fs.createReadStream(filePath);
});
```

注意：

- `ctx.type` 真实项目最好根据 `mimetype` 动态设置
- 需要处理文件不存在（返回 404）

### 3.3.将图片avatarURL保持user表中

目标：上传成功后，把头像的访问 URL 写回用户表，例如 `user.avatar_url`。

常见做法：

- 上传接口拿到 `filename`
- 拼接访问地址 `http://host:port/upload/avatar/<filename>`
- 更新数据库用户表

#### 3.3.1 更新 user 表字段（SQL）

```sql
UPDATE user SET avatar_url = ? WHERE id = ?;
```

#### 3.3.2 结合上传接口的伪代码流程

```js
router.post("/avatar", verifyAuth, upload.single("avatar"), async (ctx) => {
  const { filename } = ctx.file;
  const userId = ctx.user.id;

  const avatarURL = `${ctx.origin}/upload/avatar/${filename}`;
  await userService.updateAvatar(avatarURL, userId);

  ctx.body = { avatarURL };
});
```

# 四.项目部署

### 4.1.购买云服务器

常见选择：阿里云/腾讯云/华为云等。

复习要点：

- 选择 Linux（常见 Ubuntu/CentOS）
- 开放端口（安全组/防火墙），例如：
  - 22（SSH）
  - 80/443（HTTP/HTTPS）
  - 你服务实际端口（建议通过 Nginx 反代，不直接暴露 Node 端口）

### 4.2.服务器环境搭建

- Node
- MySql
- MySQL备份和恢复

#### 4.2.1 Node

常见做法：使用 nvm 管理 node 版本（便于升级和切换）。

#### 4.2.2 MySQL

要点：

- 设置 root 密码
- 创建业务数据库与用户，按需授权
- 配置字符集（utf8mb4）

#### 4.2.3 MySQL 备份与恢复（你复习时要会讲命令含义）

备份：

```bash
mysqldump -u root -p coderhub > coderhub.sql
```

恢复：

```bash
mysql -u root -p coderhub < coderhub.sql
```

### 4.3.部署Node服务器

典型流程：

1. 把代码放到服务器（git clone / scp / CI/CD）
2. 安装依赖（`npm install`）
3. 配置环境变量（数据库账号、JWT 密钥等）
4. 启动服务（建议用 pm2）

复习要点：

- **不要把密钥写死在代码里**，用环境变量
- 线上一般用 Nginx 反代到 Node（如 `127.0.0.1:3000`）

### 4.4.pm2 Node进程工具

pm2 解决的问题：

- Node 进程挂了自动拉起
- 统一查看日志
- 支持多进程（cluster）提升利用率

常用命令：

```bash
pm2 start src/main.js --name coderhub
pm2 list
pm2 logs coderhub
pm2 restart coderhub
pm2 stop coderhub
pm2 delete coderhub
```

开机自启（常见流程，具体按系统提示操作）：

- `pm2 startup`
- `pm2 save`
