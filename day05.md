# 一。DDL语句 - 表的操作

### 1.1.创建表的基本结构

DDL（Data Definition Language）负责“定义结构”：创建/修改/删除数据库对象（库、表、字段、索引）。创建表时重点是：字段、类型、约束、以及表级别配置。

关键点：

- **[字段设计]** 先确定业务字段，再选类型与长度
- **[主键]** 通常用自增 `id` 或业务唯一键（不推荐用可变字段做主键）
- **[引擎/字符集]** 常见 `InnoDB` + `utf8mb4`

示例：最小可用表

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DESC users;
SHOW CREATE TABLE users;
```

补充：生产里建议统一字段命名、时间字段、以及必要的索引策略。

### 1.2.表中常见数据类型

常见数据类型可以按“数值 / 字符串 / 时间 / 其它”来记。

关键点：

- **[整数]** `TINYINT/SMALLINT/INT/BIGINT`（按范围选）
- **[小数]** `DECIMAL(M, D)`（金额等要求精确时用它）
- **[字符串]** `VARCHAR(n)` 最常用；大文本用 `TEXT`
- **[时间]** `DATE/DATETIME/TIMESTAMP`
- **[布尔]** MySQL 常用 `TINYINT(1)` 表达
- **[JSON]** `JSON`（MySQL 5.7+）

示例：类型片段

```sql
CREATE TABLE demo_types (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  price DECIMAL(10, 2) NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT,
  is_deleted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

补充：`VARCHAR` 长度不是越大越好；`DECIMAL(10,2)` 表示总 10 位其中小数 2 位。

### 1.3.表的常见约束

- 主键
- 。。。。

约束用于保证数据合法性与一致性，尽量把“错误挡在写入之前”。

关键点：

- **[PRIMARY KEY]** 主键（唯一 + 非空）
- **[NOT NULL]** 非空
- **[UNIQUE]** 唯一（例如邮箱、手机号）
- **[DEFAULT]** 默认值（例如 0、当前时间）
- **[AUTO_INCREMENT]** 自增（常配合主键）

示例：唯一 + 默认值

```sql
CREATE TABLE accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL UNIQUE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

补充：是否强制外键（foreign key）看项目规范；外键能保一致性，但也会增加写入成本。

### 1.4.创建完整的表结构

“完整表结构”通常会包含：主键、业务字段、时间字段、软删除字段（可选）、以及必要索引。

关键点：

- **[时间字段]** `created_at`、`updated_at`
- **[软删除]** `is_deleted` 或 `deleted_at`
- **[索引]** 为高频查询字段建索引（例如 username/email）

示例：较完整的用户表

```sql
CREATE TABLE IF NOT EXISTS user_profile (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_deleted TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

补充：索引不是越多越好；会降低写入性能，按查询场景加。

# 二。DML - 数据操作

### 2.1.新增数据

DML（Data Manipulation Language）对数据做增删改。新增数据主要是 `INSERT`.

关键点：

- **[推荐写列名]** 避免表结构变更导致插入错位
- **[批量插入]** 一条 INSERT 插多行更快

示例：单条/批量插入

```sql
INSERT INTO user_profile (username, email, password_hash)
VALUES ('tom', 'tom@test.com', 'xxx');

INSERT INTO user_profile (username, email, password_hash)
VALUES
('alice', 'alice@test.com', 'xxx'),
('bob', 'bob@test.com', 'xxx');
```

补充：自增主键可用 `LAST_INSERT_ID()` 获取（不同客户端返回方式也不同）。

### 2.2.删除数据

删除使用 `DELETE`，但业务系统更常用“软删除”（UPDATE 标记删除），便于恢复与审计。

关键点：

- **[必须带 WHERE]** 否则会全表删除
- **[DELETE vs TRUNCATE]** `TRUNCATE` 更快但风险更高，且重置自增

示例：按条件删除/软删除

```sql
DELETE FROM user_profile
WHERE id = 1;

UPDATE user_profile
SET is_deleted = 1
WHERE id = 1;
```

补充：建议先 `SELECT` 验证条件范围，再执行 `DELETE`.

### 2.3.更新数据

更新使用 `UPDATE ... SET ... WHERE ...`.

关键点：

- **[必须带 WHERE]** 避免全表更新
- **[更新多列]** 用逗号分隔
- **[自增/自减]** `count = count + 1` 这种写法很常见

示例：更新与自增

```sql
UPDATE user_profile
SET email = 'new@test.com'
WHERE id = 2;

UPDATE demo_counter
SET pv = pv + 1
WHERE id = 1;
```

# 三。DQL - 数据查询

### 3.1.基本查询

DQL 核心就是 `SELECT`，用于查询数据。

关键点：

- **[列选择]** 业务代码里尽量别用 `SELECT *`
- **[别名]** `AS`（可省略）
- **[去重]** `DISTINCT`

示例：基础查询

```sql
SELECT id, username, email
FROM user_profile;

SELECT DISTINCT username
FROM user_profile;
```

### 3.2.where条件

`WHERE` 用于过滤行，是查询最常用的条件部分。

关键点：

- **[比较]** `= != > >= < <=`
- **[逻辑]** `AND/OR/NOT`（复杂条件建议加括号）
- **[范围]** `IN (...)`、`BETWEEN ... AND ...`
- **[模糊]** `LIKE '%xx%'`
- **[空值]** `IS NULL / IS NOT NULL`（不能写 `= NULL`）

示例：常见条件

```sql
SELECT * FROM user_profile
WHERE id IN (1, 2, 3);

SELECT * FROM user_profile
WHERE email IS NOT NULL AND username LIKE 'a%';
```

### 3.3.order by

`ORDER BY` 用于排序，默认 `ASC`（升序）。

关键点：

- **[ASC/DESC]** 控制升降序
- **[多字段排序]** `ORDER BY a DESC, b ASC`

示例：排序

```sql
SELECT id, username, created_at
FROM user_profile
ORDER BY created_at DESC;
```

### 3.4.limit、offset

`LIMIT`/`OFFSET` 常用于分页。

关键点：

- **[写法]** `LIMIT n OFFSET m` 或 `LIMIT m, n`
- **[性能]** 偏移很大时 `OFFSET` 会慢（需要跳过大量行）

示例：分页

```sql
SELECT * FROM user_profile
ORDER BY id DESC
LIMIT 10 OFFSET 0;

SELECT * FROM user_profile
ORDER BY id DESC
LIMIT 10 OFFSET 10;
```

补充：大数据量更推荐“游标分页”（例如 `WHERE id < last_id ORDER BY id DESC LIMIT 10`）。

# 四。聚合函数

### 4.1.常见的聚合函数

- avg
- count
- max
- min
- sum

聚合函数对多行做统计，返回单个值或每组一个值。

关键点：

- **[COUNT]** `COUNT(*)` 统计行数；`COUNT(col)` 不统计 NULL
- **[AVG/SUM]** 平均/求和（NULL 通常会被忽略）
- **[MAX/MIN]** 最大/最小

示例：统计

```sql
SELECT COUNT(*) AS total
FROM user_profile
WHERE is_deleted = 0;
```

### 4.2.分组的group by

`GROUP BY` 按字段分组，再对每组做聚合。

关键点：

- **[分组字段]** `GROUP BY col1, col2`
- **[严格模式]** `ONLY_FULL_GROUP_BY` 下，SELECT 的非聚合列必须出现在 GROUP BY

示例：按删除标记分组计数

```sql
SELECT is_deleted, COUNT(*) AS total
FROM user_profile
GROUP BY is_deleted;
```

### 4.3.分组条件having

`HAVING` 过滤“分组后的结果”，而 `WHERE` 过滤“分组前的行”。

关键点：

- **[位置]** `GROUP BY ... HAVING ...`
- **[聚合条件]** 例如 `HAVING COUNT(*) > 10`

示例：筛选数量大于 1 的组

```sql
SELECT is_deleted, COUNT(*) AS total
FROM user_profile
GROUP BY is_deleted
HAVING total > 1;
```

### 五。创建多张表

### 5.1.创建多张表的意义

- song
- singer

拆成多张表的意义是：减少冗余、建立关系、提升可维护性（规范化）。

关键点：

- **[避免重复存储]** 歌曲表里不要反复存歌手完整信息
- **[用外键关联]** 常见 `song.singer_id -> singer.id`
- **[用 JOIN 查询]** 拆表后通过连接把数据组合回来

### 5.2.多张表约束 - 外键

- on update
- on delete

外键（Foreign Key）用于保证引用一致性，防止出现“引用的 singer_id 在 singer 表不存在”。

关键点：

- **[ON UPDATE]** 主表主键更新时的联动策略（常见 `CASCADE`）
  - 默认是restrict，即不允许修改相关键

- **[ON DELETE]** 主表删除时策略（`CASCADE/SET NULL/RESTRICT`）

示例：song 引用 singer

```sql
CREATE TABLE singer (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE song (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  singer_id INT,
  CONSTRAINT fk_song_singer
    FOREIGN KEY (singer_id) REFERENCES singer(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 5.3.多张表连接

- 左连接（推荐）
- 右链接
- 内连接
  - 只有当两张表都符合条件才显示

- 全连接

连接查询把多张表按条件组合成一个结果集。

关键点：

- **[内连接 INNER JOIN]** 只保留两边都匹配的行
  - 没带 left、right、full即内连接

- **[左连接 LEFT JOIN]** 左表全保留，右表匹配不到为 NULL
- **[右连接 RIGHT JOIN]** 右表全保留（多数情况下可用 LEFT JOIN 互换顺序替代）
- **[全连接 FULL JOIN]** MySQL 不直接支持，常用 `UNION` 模拟

示例：查询歌曲及歌手名

```sql
SELECT s.id, s.name AS song_name, si.name AS singer_name
FROM song s
LEFT JOIN singer si ON s.singer_id = si.id;
```

# 六。多对多的关系

### 6.1.创建表

- 三张表
  - 关系表

多对多需要一张“关系表”（中间表）来存两端的关联。

关键点：

- **[三张表]** A、B、A_B(关系表)
- **[主键策略]** 关系表常用联合主键 `(a_id, b_id)`，避免重复关联

示例：学生-课程（多对多）

```sql
CREATE TABLE student (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE course (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE student_course (
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.2.多对多中查询数据

- 完成对应案例

多对多查询就是 JOIN 三张表，通过关系表把两端关联起来。

关键点：

- **[从 student 查 course]** `student -> student_course -> course`
- **[从 course 查 student]** `course -> student_course -> student`

示例：查询某学生（id为1）选了哪些课

```sql
SELECT st.id AS student_id, st.name AS student_name,
       c.id AS course_id, c.name AS course_name
FROM student st
JOIN student_course sc ON st.id = sc.student_id
JOIN course c ON c.id = sc.course_id
WHERE st.id = 1;
```

查询某课程被那些学生选了

```sql
SELECT st.id AS student_id, st.name AS student_name,
       c.id AS course_id, c.name AS course_name
FROM course c
left JOIN student_course sc ON st.id = sc.student_id
left JOIN  student st ON st.id = sc.course_id
WHERE c.name = '历史';
```

