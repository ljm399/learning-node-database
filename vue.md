# Vue 项目从创建到浏览器看到效果

## 1. 前置条件（必须）

### 1.1 安装 Node.js

这个项目的 `package.json` 里写了：

- Node 版本：`^20.12.0 || >=22.12.0`

建议你至少使用 Node 20.x。

### 1.2 包管理器（任选其一）

- `npm`（Node 自带）
- `pnpm`（更快，团队常用）

如果你要装 pnpm：

```bash
npm i -g pnpm
```

## 2. 创建 Vue 项目（从 0 开始）

创建命令（npm 方式）：

```bash
npm create vue@latest
```

执行后会有交互式选项（大意是这些）：

- 是否使用 TypeScript：建议选 `Yes`
- 是否使用 Router：如果你要多页面/后台系统，建议选 `Yes`
- 是否使用 Pinia：如果你需要状态管理，建议选 `Yes`
- ESLint/Prettier：团队协作建议选 `Yes`

然后进入项目目录（在终端里手动进入你创建的目录）并安装依赖。

## 3. 安装依赖（让项目能跑起来）

在项目根目录执行：

```bash
npm install
```

或者：

```bash
pnpm install
```

### 3.1 这个项目（`vueplustypescript`）实际用到的核心依赖

对应 `package.json`：

- `vue`
- `vite`
- `@vitejs/plugin-vue`
- `typescript`
- `vue-tsc`（用于类型检查）
- `vue-router`
- `pinia`

## 4. 启动开发服务器（在浏览器看到效果）

启动命令（本项目 scripts 里是 `dev: vite`）：

```bash
npm run dev
```

或：

```bash
pnpm dev
```

终端会输出一个本地地址（常见是 `http://localhost:5173/`），在浏览器打开即可看到页面。

## 5. 你看到页面的“最短链路”（这个项目实际发生了什么）

### 5.1 浏览器打开时，最先访问的是 `index.html`

项目根目录 `index.html` 的关键点：

- 页面里有一个挂载点：`<div id="app"></div>`
- 用 ESModule 方式加载入口：`<script type="module" src="/src/main.ts"></script>`

### 5.2 `src/main.ts` 创建 Vue 应用并挂载

在这个项目里（`src/main.ts`）：

- `createApp(App)` 创建应用
- `app.use(...)` 安装插件（路由、Pinia、图标等）
- `app.mount('#app')` 挂载到 `index.html` 的 `#app` 容器

当你 `mount` 后，`App.vue` 的内容就会渲染到页面上。

### 5.3 你现在这个 `App.vue` 的结构（与页面效果关系）

项目里 `App.vue` 大意是：

- `el-config-provider`：Element Plus 的全局配置（这里用中文 `zhCn`）
- `router-view`：路由占位符，实际页面内容由路由匹配到的组件渲染

所以：

- 如果路由当前指向 `/login`，页面就显示 `login.vue`
- 如果指向 `/main`，页面就显示 `main.vue`

## 6. “后续开发需要什么依赖/配置”——以本项目为例

下面这些不是“跑起来的最低要求”，但属于后台项目常用能力，本项目也确实配了。

### 6.1 路由（vue-router）

安装：

```bash
npm i vue-router
```

在本项目里：

- 路由文件：`src/router/index.ts`
- 使用 hash 模式：`createWebHashHistory()`
- 在 `main.ts` 里 `app.use(router)` 启用

### 6.2 状态管理（pinia）

安装：

```bash
npm i pinia
```

在本项目里：

- `src/store/index.ts`：创建 `pinia` 并封装了一个 `registerStore(app)`
- 在 `main.ts` 里 `app.use(registerStore)` 启用

### 6.3 Element Plus（UI 组件库）与“自动按需引入”

安装 Element Plus：

```bash
npm i element-plus
```

本项目为了更舒服地使用 Element Plus（不用每个组件都手动 import），还配了：

- `unplugin-auto-import`
- `unplugin-vue-components`
- `unplugin-element-plus`

它们在 `vite.config.ts` 里通过 `plugins` 注册，并使用了 `ElementPlusResolver()`。

对应的安装命令（如果你从 0 搭同样能力）：

```bash
npm i -D unplugin-auto-import unplugin-vue-components unplugin-element-plus
```

并且（本项目已配置）在 `vite.config.ts` 里加入对应插件。

### 6.4 TS 路径别名 `@`（非常常用）

本项目的别名配置有两处要一致：

- `vite.config.ts`：
  - `resolve.alias['@'] = 指向 src`
- `tsconfig.app.json`：
  - `compilerOptions.paths` 里配置 `"@/*": ["./src/*"]`

这样你才可以写：

- `import router from '@/router/index.ts'`

## 7. 常用命令汇总（本项目 package.json）

- **[开发运行]**
  - `npm run dev`
- **[类型检查]**
  - `npm run type-check`（本质：`vue-tsc --build`）
- **[构建生产包]**
  - `npm run build`（会先 type-check，再 build）
  - `npm run build-only`（只打包，不做类型检查）
- **[本地预览打包结果]**
  - `npm run preview`（先 build 再 preview 更合理）
- **[代码规范]**（可选但建议）
  - `npm run lint`
  - `npm run format`





# 渲染的整个过程

## 一. 你最关心的“一条龙命令”（从 0 到看到页面）

如果你要自己从 0 新建一个类似项目，一般就是：

```bash
npm create vue@latest
npm install
npm run dev
```

然后浏览器打开终端提示的地址。

## 二. `.vue` 单文件组件（SFC）是如何变成浏览器看到的效果的

> 这一节回答：`template / script / style` 怎么被处理成浏览器能执行的 `JS/CSS`，以及为什么最后能看到 DOM。

### 2.1 先把入口串起来：浏览器从 `index.html` 开始

在本项目 `index.html` 里有：

- `<div id="app"></div>`：容器
- `<script type="module" src="/src/main.ts"></script>`：入口

当你跑 `npm run dev` 后：

- Vite 起了一个 dev server
- 浏览器请求 `index.html`
- 浏览器再以 **ESM** 方式请求 `/src/main.ts`

### 2.2 `main.ts` 做了什么：创建应用 + 挂载

本项目的关键语句：

- `const app = createApp(App)`：把 `App` 组件当作根组件
- `app.use(router)` / `app.use(pinia)`：安装插件
- `app.mount('#app')`：把根组件渲染到 `#app` 容器

你能看到页面效果，真正发生在 `mount` 之后。

### 2.3 `.vue` 文件在 dev 阶段是怎么被“拆开并编译”的（Vite + `@vitejs/plugin-vue`）

浏览器原生不认识 `.vue` 文件，所以在 dev 模式下：

- 浏览器会请求 `App.vue`
- Vite 的 dev server 收到请求后，会交给插件链处理
- `@vitejs/plugin-vue` 会使用 `@vue/compiler-sfc` 把 SFC 拆成三部分并编译成 **多个可被浏览器加载的 ESM 模块**

你可以把它理解为：一个 `App.vue` 会被转换为（概念上）几段请求/模块：

- **[script 部分]** 变成 JS 模块
  - 普通 `<script>`：导出组件选项对象
  - `<script setup>`：会被编译成等价的 `setup()` 逻辑（编译期语法糖）
- **[template 部分]** 会被编译成 `render` 函数
  - `template` 不会直接变成 HTML 文件
  - 而是变成 JS 里的渲染函数：`render() { return h(...) }`
- **[style 部分]** 会变成 CSS
  - dev 模式下通常是通过 JS 把 CSS 注入 `<style>` 标签（热更新友好）

最终 dev 模式下浏览器拿到的是：

- 一份 JS（组件逻辑 + render 函数）
- 一份 CSS（样式）

### 2.4 `scoped` 样式是怎么做到“只作用于当前组件”的

当你写：

- `<style scoped> ... </style>`

编译时会发生两件事（核心思想是“加属性选择器”）：

- **[给当前组件的 DOM 加标记]**
  - 编译后的 DOM 节点会带一个类似 `data-v-xxxxxxx` 的属性
- **[重写 CSS 选择器]**
  - 比如 `.app { ... }` 会被改写成 `.app[data-v-xxxxxxx] { ... }`

所以样式只会命中带有同样 `data-v-xxxxxxx` 的节点，从而实现“组件级作用域”。

### 2.5 运行时为什么能看到 DOM：`render` -> 虚拟 DOM -> patch 到真实 DOM

这一段是 Vue runtime 在浏览器里执行的：

1. **[执行组件 setup/逻辑]**
   - 你 `script setup` 里写的导入、响应式数据等会在组件创建时执行
2. **[执行 render 函数得到 VNode]**
   - `render()` 返回的是“虚拟 DOM”（VNode）结构，不是真实 DOM
3. **[渲染器把 VNode 变成真实 DOM]**
   - Vue 的 renderer 会把 VNode 转成真实 DOM 节点
   - 然后插入到 `#app` 这个容器里

所以你看到页面，不是因为生成了一个新的 HTML 文件，而是因为：

- **Vue 在浏览器运行时动态创建/更新了 DOM**。

### 2.6 结合你项目的 `App.vue`：为什么会看到路由页面

你 `App.vue` 里有：

- `<router-view></router-view>`

它本质是一个组件占位符：

- 当 URL 变化时（hash/history），router 会匹配到对应的路由组件
- `router-view` 会渲染“当前匹配到的组件”

所以你看到的页面内容取决于当前路由（比如 `/login`、`/main`）。

### 2.7 HMR（热更新）为什么改了代码不用手动刷新

dev 模式下 Vite + Vue 插件会支持 HMR：

- 你保存 `.vue` 文件
- Vite 推送变更到浏览器
- Vue 插件尝试做组件级替换：
  - 只更新模板/样式/某些逻辑
  - 尽量保留当前页面状态（这就是你感觉“没刷新也生效”）

### 2.8 build 阶段（`npm run build`）又有什么不同

当你执行 `npm run build`：

- Vite 会进入构建模式（底层用 Rollup 打包）
- `.vue` 仍然会被编译成 JS/CSS
- 但输出会变成：
  - `dist/assets/*.js`（打包后的代码）
  - `dist/assets/*.css`（通常会被抽离合并）
  - `dist/index.html`（引用打包产物）

然后你用：

- `npm run preview`

启动一个静态服务来预览 `dist`，浏览器加载的是打包后的产物.





# Vue2（Vue CLI / Webpack）从创建到浏览器看到效果

如果你说的“Vue2”，通常指的是：

- **Vue 2.x**
- 脚手架是 **Vue CLI（webpack）**（而不是 Vite）

下面这节就按 Vue2 + Vue CLI 的方式把“一条龙”讲清楚。

## 1. 创建 Vue2 项目（Vue CLI）

Vue CLI 是一个全局命令行工具（会生成 webpack 工程）。

安装 CLI（全局）：

```bash
npm i -g @vue/cli
```

- 测试之前是否安装

  ```
  vue --version  
  结果：@vue/cli 5.0.8
  ```



创建项目：

```bash
vue create my-vue2-app
```

创建时会让你选预设：

- 选 `Manually select features`（手动选功能）更可控
- 关键是 **Vue version 选择 2.x**

进入项目目录（在终端里手动进入你创建的目录）后安装依赖（如果创建过程没自动装完）：

```bash
npm install
```

启动开发服务器：

```bash
npm run serve
```

终端会提示一个地址（常见 `http://localhost:8080/`），浏览器打开即可看到页面。

## 2. Vue2 项目“看到页面”的最短链路

Vue CLI 生成的项目里，关键入口通常是：

- `public/index.html`：里面有 `<div id="app"></div>`
- `src/main.js`：创建应用并 `mount`
- `src/App.vue`：根组件

`src/main.js` 最核心一般就是：

```js
import Vue from "vue";
import App from "./App.vue";

new Vue({
  render: (h) => h(App),
}).$mount("#app");
```

你现在看到的页面效果，本质都是从这里开始把 `App.vue` 渲染进 `#app`.

## 3. Vue2 的 `.vue`（SFC）是怎么变成浏览器能执行的 JS/CSS 的（vue-loader）

Vue2 + Vue CLI 的核心是 **webpack**，而 `.vue` 文件的处理核心是：

- `vue-loader`
- `vue-template-compiler`（Vue2 的模板编译器）

### 3.1 编译期：webpack 如何处理 `.vue`

当你 `npm run serve` 后：

- webpack-dev-server 启动
- 你改动代码会触发 webpack 重新编译（增量）
- `.vue` 文件会被 `vue-loader` 拆开并分别交给不同 loader 链处理

拆开后的典型走向是：

- **[template]**
  - `template` 会被 `vue-template-compiler` 编译成 `render` 函数
  - 最终不会生成一个新的 html 文件，而是生成 JS 里的渲染函数
- **[script]**
  - 变成普通 JS 模块（组件选项对象：data/methods/computed/components...）
- **[style]**
  - 走 `css-loader` / `style-loader`（dev）等
  - dev 模式通常是把 CSS 通过 JS 注入到页面的 `<style>` 里
  - build 模式会由 `mini-css-extract-plugin` 抽离成单独 css 文件（Vue CLI 内部集成）

### 3.2 运行时：为什么最终能看到 DOM（render -> vnode -> patch）

编译完成后，浏览器执行的是打包后的 JS：

- Vue2 执行 `new Vue({ render })`
- `render(h)` 生成 VNode（虚拟 DOM）
- Vue2 的 patch 算法把 VNode 映射成真实 DOM，并挂载到 `#app`

所以你看到页面，是因为 **Vue 在浏览器里运行时创建/更新 DOM**，而不是因为把 template 直接“吐出”成静态 HTML。

### 3.3 Vue2 的 `scoped` 原理（和 Vue3 类似）

你写：

```vue
<style scoped>
.box {
  color: red;
}
</style>
```

本质也是：

- 给该组件的 DOM 节点加类似 `data-v-xxxx` 的属性
- 把 CSS 选择器改写成带属性选择器的形式

从而做到“只命中当前组件”。



### 3.4 HMR：Vue2 为什么也能热更新

Vue2 这套热更新通常来自：

- webpack-dev-server 的 HMR 能力
- vue-loader 对组件模块的热替换支持

所以你改 `.vue` 保存后，通常不需要手动刷新浏览器。



## 4. 一个你正在用的点：Vue2 自定义指令（全局）

你现在这个写法：

```js
app.directive("color", (el, bindings) => {
  el.style.color = bindings.value;
});
```

是 **Vue3 的 `createApp().directive`**。

Vue2 的全局指令写法通常是：

```js
Vue.directive("color", function (el, binding) {
  el.style.color = binding.value;
});
```

然后在模板里用：

```html
<div v-color="'red'">text</div>
```

## 5. Vue2（webpack）和 Vue3（Vite）最关键差异（你只要记住这几个）

- **[开发模式加载方式]**
  - Vue2（webpack）：先“打包/构建”一遍，再让浏览器拿 bundle
  - Vue3（Vite）：dev 下浏览器直接按 ESM 一次次请求模块，按需编译
- **[处理 `.vue` 的核心]**
  - Vue2：`vue-loader` + `vue-template-compiler`
  - Vue3：`@vitejs/plugin-vue` + `@vue/compiler-sfc`
- **[启动速度]**
  - Vite 通常更快（少了全量 bundle 的冷启动成本)

