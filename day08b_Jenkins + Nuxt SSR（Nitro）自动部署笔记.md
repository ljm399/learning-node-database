# Jenkins环境的搭建 -- 需要java环境

- 安装Java（Jenkins 需要 Java 运行环境）

  - 推荐：Jenkins LTS 通常推荐使用 `OpenJDK 17`

  - Ubuntu/Debian

    ```bash
    sudo apt update
    sudo apt install -y openjdk-17-jdk
    java -version
    ```

  - CentOS/RHEL

    ```bash
    yum install -y java-21-openjdk || dnf install -y java-21-openjdk
    java -version
    ```

  - 注意

    - 如果服务器已装多个 Java 版本，需确认 `java -version` 输出的版本是 Jenkins 支持的版本
    - 生产环境建议用系统包管理器安装（便于安全更新）

- 安装 Jenkins（以 Ubuntu/Debian 为例）

  - 安装步骤

    ```bash
    # 3) 添加 Jenkins 官方 yum 仓库
    #    - 这一步相当于 Debian 系的“添加 apt 源”
    #    - 作用：让 yum 能搜索到 jenkins 包
    sudo curl -fsSL -o /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
    
    # 4) 导入 Jenkins 仓库的 GPG 公钥（用于校验软件包签名）
    sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
    
    # 5) 更新缓存（可选，但建议做）
    sudo yum makecache || sudo dnf makecache
    
    # 6) 安装 Jenkins
    sudo yum install -y jenkins || sudo dnf install -y jenkins
    
    # 3) 如果系统里有多个 Java，切换默认 java（任选其一）
    alternatives --config java
    
    
    # 7) 启动 Jenkins，并设置开机自启
    sudo systemctl enable jenkins
    sudo systemctl start jenkins
    
    # 8) 查看 Jenkins 状态
    sudo systemctl status jenkins
    ```

  - 启动/开机自启/查看状态

    ```bash
    sudo systemctl enable jenkins
    sudo systemctl start jenkins
    sudo systemctl status jenkins
    ```

  - 端口

    - 默认监听 `8080`
    - 云服务器/防火墙需放行 `8080`（或你自定义的端口）

- 进入 UI 界面（首次初始化）

  - 访问地址

    - 浏览器访问：`http://<服务器IP>:8080/`

  - 首次解锁（Unlock Jenkins）

    - 在服务器上查看初始管理员密码：

      ```bash
      sudo cat /var/lib/jenkins/secrets/initialAdminPassword
      ```

    - 将密码粘贴到网页解锁框

  - 安装插件

    - 一般选择 `Install suggested plugins`（推荐插件）

  - 创建管理员账号

    - 按向导创建 admin 用户，并确认 Jenkins URL（后续访问用）

- 在 Jenkins 里安装 Node（用于构建前端/Node 项目）

  - 安装 NodeJS 插件

    - 进入：`Manage Jenkins` -> `Plugins` -> `Available plugins`
    - 搜索并安装：`NodeJS`
    - 安装后建议重启 Jenkins（或等待插件生效）

  - 配置 Node 版本（全局工具）

    - 进入：`Manage Jenkins` -> `Tools`（有些版本叫 `Global Tool Configuration`）
    - 找到git
      - 报错就先在本地服务器安装git
    - 找到 `NodeJS installations`
      - 点击 `Add NodeJS`
      - `Name`: 例如 `node18`
      - 勾选 `Install automatically`
      - `Version`: 选择 `NodeJS 18.x`（按项目需要选择 16/18/20）
      - （可选）勾选 `Install npm packages`/配置 `npm` 镜像（企业内网常用）

    

# Jenkins + Nuxt SSR（Nitro）自动部署笔记（Freestyle + pnpm + rsync + root pm2 + Nginx）

这份笔记是最终验证通过的一套流程：

- 本地 `git push`
- Jenkins 自动拉取代码并构建
- Jenkins 把 `.output` 同步到服务器固定目录 `/www/oppo-nuxt`
- Jenkins 使用 `sudo /bin/pm2` 重启 **root pm2** 托管的 Nuxt 服务
- Nginx 监听 `80`，反代到 `127.0.0.1:3002`

------

# 0) 服务器一次性准备（root 执行一次）

## 0.1 安装依赖（rsync、pm2）

```bash
# 用于把 Jenkins workspace 的构建产物同步到固定部署目录
yum install -y rsync

# 进程守护
npm i -g pm2
pm2 -v
```

## 0.2 创建部署目录（构建产物落到这里）

```bash
mkdir -p /www/oppo-nuxt
```

## 0.3 允许 Jenkins 通过 sudo 操作 root 的 pm2（只放行 pm2）

```bash
visudo
```

在文件末尾新增一行（必须独占一行）： 输入i 然后回车换行输入下面的命令，之后按esc，再:wq

```bash
jenkins ALL=(root) NOPASSWD: /bin/pm2
```

验证（能看到 root 的 pm2 列表即成功）：

```bash
sudo -u jenkins sudo /bin/pm2 status
```

## 0.4 root 首次启动 Nuxt（只需要一次，用于创建 pm2 进程记录）

> 第一次部署完 `.output` 出来后再执行也行；执行过一次后，后续 Jenkins 都是 `restart`。

```bash
pm2 start "PORT=3002 node /www/oppo-nuxt/.output/server/index.mjs" --name oppo-nuxt --update-env
pm2 save
pm2 status
```

（可选）让 root pm2 开机自启：

```bash
pm2 startup systemd -u root --hp /root
# 按输出提示再执行一次它给你的命令
pm2 save
```

------

# 1) Jenkins 新建 Freestyle Job

1. Jenkins 首页 -> `New Item`
2. 输入 job 名，例如：`oppo-nuxt-build`
3. 选择 **Freestyle project**
4. `OK`

------

# 2) Jenkins 配置源码拉取（Git + SSH）

在 Job 配置页：

## 2.1 Source Code Management

1. 勾选 **Git**
2. `Repository URL` 填 GitHub SSH 地址：(你服务器先安装git，npm i git -g,然后取jenkins的插件里面配置git)
   - `git@github.com:<你的用户名>/<仓库名>.git`
3. `Credentials` 选择你创建的 `github-ssh`
4. `Branches to build`：
   - `*/main` 或 `*/master`

------

# 3) Jenkins 自动触发构建（Webhook）

## 3.1 Jenkins 勾选触发器

- `Build Triggers`：勾选 **GitHub hook trigger for GITScm polling**

## 3.2 GitHub 配 Webhook

1. GitHub 仓库（是**仓库**不是**个人设置**） -> `Settings` -> `Webhooks` -> `Add webhook`
2. `Payload URL`：
   - `http://<你的Jenkins公网IP或域名>:8080/github-webhook/`
3. `Content type`：`application/json`
4. Events：`Just the push event`

> 前提：Jenkins 的 `8080` 能被 GitHub 访问到（安全组/防火墙放行）。

------

# 4) Jenkins 构建环境（Node 注入）

在 Job 配置页：

- `Build Environment`：勾选 `Provide Node & npm bin/ folder to PATH`
- NodeJS Installation：选择你配置的 Node（例如 `node18` / `node20`）

------

# 5) build step: 选择Execute shell（构建 + 部署 + 重启服务）

> 说明：Jenkins 的代码会拉到 Jenkins workspace；部署目录是 `/www/oppo-nuxt`。

```bash
set -e

DEPLOY_DIR=/www/oppo-nuxt
APP_NAME=oppo-nuxt
PORT=3002

# 打印版本便于排查环境问题
node -v
npm -v

# 安装 pnpm（如果服务器 corepack 不可用，就用全局安装）
npm i -g pnpm
pnpm -v

# 1) 安装依赖 + 构建（发生在 Jenkins workspace）
pnpm install --frozen-lockfile // 作用只下载package.loct.json里面的依赖
pnpm run build

# 2) 同步构建产物到部署目录（只同步运行所需内容）
mkdir -p "$DEPLOY_DIR"
rsync -av --delete ./.output/ "$DEPLOY_DIR/.output/"
rsync -av package.json pnpm-lock.yaml nuxt.config.ts "$DEPLOY_DIR/"

# 3) 重启线上服务（root pm2 托管，Jenkins 通过 sudo 调用 root 的 pm2）
# - 进程存在：restart
# - 进程不存在：start（首次/兜底）
sudo /bin/pm2 describe "$APP_NAME" >/dev/null 2>&1 && \
sudo /bin/pm2 restart "$APP_NAME" --update-env || \
sudo /bin/pm2 start "PORT=$PORT node $DEPLOY_DIR/.output/server/index.mjs" --name "$APP_NAME" --update-env

# 保存进程列表（配合 pm2 startup 可开机自启）
sudo /bin/pm2 save

# 打印状态到 Jenkins 控制台
sudo /bin/pm2 status
```

## 你要点

- `rsync --delete`：保证部署目录与本次构建产物一致（会删掉目标目录多余旧文件）
- 用 `sudo /bin/pm2 ...`：确保操作的是 **root pm2**，避免出现 `jenkins pm2` 列表为空但线上实际在跑的割裂

------

# 6) Nginx：公网 80 -> Nuxt 3002

## 2.1 安装 Nginx（服务器一次性）

```
yum install -y nginx
systemctl enable nginx
systemctl start nginx
```

## 2.2 写一个最简反代配置

通常放在 `/etc/nginx/conf.d/oppo-nuxt.conf`（CentOS 常见）。

内容示例（先用 IP 也行，`server_name` 可以写 `_`）：

```sql
server {
  listen 80;
  server_name _;
 
  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

然后检查并重载

```
nginx -t
systemctl reload nginx
```

## 2.3 安全组/防火墙

- 对外只放行：`80`（后面有 HTTPS 再放 `443`）

------

# 3) Jenkins Trigger（push 自动部署）

## 推荐 Webhook（实时）

- Job 配置里勾：`GitHub hook trigger for GITScm polling`
- GitHub 仓库 `Settings -> Webhooks` 添加：
  - `http://<公网IP>:8080/github-webhook/`

如果 Jenkins 不方便对外暴露 8080，就改用 Poll SCM。

------

# 4) 你做完后如何验证

1. Jenkins 先手动点一次 `Build Now`（确保首次部署成功）
2. 访问：
   - `http://<你的服务器公网IP>/` （走 Nginx 80）
3. 本地 `git push`
4. Jenkins 自动触发构建，构建结束后刷新网页能看到更新



# 1) 如果你是在 vim 里编辑（最常见）

## 1.1 先按 `Esc` 回到普通模式

- 先按一次 `Esc`

## 1.2 删除的几种正确方式

- **删除光标所在字符**：按 `x`
- **删除整行**：输入 `dd`
- **进入插入模式再用退格删**
  - 按 `i` 进入插入模式
  - 用 `Backspace` 删除