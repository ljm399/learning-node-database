# React 项目从创建到浏览器看到效果（以 `09React/airbnb` 为例）

> 目标：你看完这份笔记后，知道这个 `airbnb` 项目怎么装依赖、怎么启动、关键配置在哪里；并理解 React 里 JSX 是怎么变成浏览器看到的 DOM（从编译到运行、挂载、渲染、更新）。

## 1. 前置条件（必须）

### 1.1 Node.js

项目 README 里写的是 `>=14.0.0`，实际建议你用 Node 18/20（依赖更兼容）。

### 1.2 包管理器

- `npm`
- 或 `yarn`

本项目根目录里有 `package-lock.json`，说明它主要是 npm 流程。

## 2. 一条龙命令（从 0 到看到页面）

在 `d:\Desktop\JavaScript\09React\airbnb` 下执行：

```bash
npm install
npm start
```

终端会提示一个地址（CRA 默认通常是 `http://localhost:3000/`），浏览器打开即可看到页面。

## 3. 常用命令汇总（本项目 `package.json`）

- **[开发运行]**
  - `npm start`（实际跑的是 `craco start`）
- **[生产构建]**
  - `npm run build`（`craco build`，产物在 `build/`）
- **[测试]**
  - `npm test`（`craco test`）
- **[预览 build 产物]**
  - `npm run preview`（`serve -s build`）

## 4. 这个项目的技术栈（以 `package.json` 为准）

### 4.1 React 核心

- `react@18.2.0`
- `react-dom@18.2.0`

### 4.2 路由（React Router v7）

- `react-router-dom@^7.8.1`

你项目里：

- `src/index.js` 用了 `<HashRouter>`（hash 路由）
- `src/App.jsx` 用 `useRoutes(routes)` 渲染路由
- `src/router/index.js` 用 `React.lazy(() => import('...'))` 做路由懒加载

### 4.3 状态管理（Redux Toolkit）

- `@reduxjs/toolkit`
- `react-redux`

你项目里 `src/index.js` 用了：

- `<Provider store={store}>`

### 4.4 样式方案（Less + styled-components + normalize）

- `less` / `less-loader`
- `craco-less`
- `styled-components`
- `normalize.css`

入口样式在 `src/index.js`：

- `import 'normalize.css'`
- `import './assets/css/index.less'`

### 4.5 UI 组件库

- `antd` / `@ant-design/icons`
- `@mui/material`
- （同时存在）`@emotion/react` / `@emotion/styled`

### 4.6 构建工具链（CRA + CRACO）

- `react-scripts@5.0.1`：Create React App 的 webpack 工具链
- `@craco/craco`：不 eject 的前提下改 CRA 的 webpack 配置

本项目所有 `start/build/test` 都是通过 `craco ...` 来跑的。

## 5. 你看到页面的“最短链路”（这个项目实际发生了什么）

### 5.1 浏览器从 `public/index.html` 开始

`public/index.html` 里有挂载点：

- `<div id="root"></div>`

注意：你直接双击打开这个 html，页面是空的。

原因是：

- CRA/webpack 会在 dev/build 时把打包后的 JS 注入到 HTML 里
- 直接打开源文件不会自动注入这些 script

### 5.2 入口 `src/index.js`：createRoot + render

你的 `src/index.js` 做了这些事：

- `ReactDOM.createRoot(document.getElementById('root'))`
- `root.render(...)`

并且把 `App` 包在了这些“壳”里（从外到内）：

- `React.StrictMode`
- `HashRouter`
- `Provider(store)`
- `ThemeProvider(theme)`

这意味着：

- 路由能力、redux 全局状态、styled-components 的主题，都会在 App 内可用。

### 5.3 `src/App.jsx`：Header + 路由页面 + Footer

`App.jsx` 的结构大意是：

- `<AppHeader />`
- `<Suspense fallback='loading'>` 包住路由页面
  - `{useRoutes(routes)}`
- `<AppFooter />`

所以页面主体内容取决于当前路由匹配到的组件。

### 5.4 路由表 `src/router/index.js`

你项目把页面组件做成懒加载：

- `const Home = React.lazy(() => import('@/views/home'))`

并配置了一个重定向：

- `/` -> `/home`

因为用了 `React.lazy`，所以必须配合 `Suspense`，不然加载期间 React 不知道显示什么。

## 6. CRACO 配置到底改了什么（`craco.config.js`）

你的 `craco.config.js` 做了两件事：

### 6.1 支持 Less

通过 `craco-less` 让 CRA 的 webpack 能处理 `.less`。

### 6.2 配置路径别名

`craco.config.js` 里配置了：

- `@` -> `src`
- `components` -> `src/components`
- `utils` -> `src/utils`

所以你在路由里可以写：

- `import('@/views/home')`

同时 `jsconfig.json` 也配置了：

- `"@/*": ["src/*"]`

这能让编辑器/IDE 正确识别路径别名（不然只改 webpack，IDE 可能会报红）。

# 渲染的整个过程

## 一. 编译期：JSX 为什么浏览器能跑

浏览器原生不认识 JSX。你写的：

```jsx
<AppHeader />
```

在 dev/build 编译时会被转成等价的 JS 调用（概念上就是创建 React element 的调用）。

这一步是由 CRA 的工具链完成的（内部是 Babel + webpack）。最终浏览器拿到的是普通 JS（bundle），能直接执行。

## 二. 运行时：为什么最终能看到 DOM（reconcile -> commit）

React18 的入口可以这样理解：

1.  **[创建 Root 容器]**
    - `createRoot(#root)`：告诉 React “以后由你接管这个 DOM 容器”
2.  **[开始渲染]**
    - `root.render(<App />)`：把 element 树交给 React

接下来 React 会做两段大事：

1.  **[Reconciliation（协调/对比）]**
    - 计算“这次渲染和上次渲染差异在哪里”
2.  **[Commit（提交）]**
    - 把差异真正更新到 DOM 上（插入/删除/更新属性/更新文本等）

所以你看到页面不是因为生成了新的 HTML 文件，而是因为：

- **React 在浏览器运行时创建/更新了 DOM**。

## 三. 为什么你可能会看到“执行/打印次数变多”（StrictMode）

你入口里包了：

- `<React.StrictMode>`

开发环境下 StrictMode 会触发一些额外的检查行为，因此你看到“打印两次/三次”这种现象通常不是 bug，而是 dev 下的检查机制导致的。

## 四. `Suspense + lazy` 为什么能“边加载边显示 loading”

当路由组件是：

- `React.lazy(() => import('...'))`

它本质是异步模块。模块还没加载完时：

- React 会沿着组件树向上找最近的 `Suspense`
- 用你提供的 `fallback`（这里是 `'loading'`）先顶上
- 等模块加载完，再把真正组件渲染出来

## 五. 状态更新为什么能驱动页面变化

不管你用的是：

- React 自己的 `useState`
- Redux（dispatch action）

本质都是：

- 状态变了 -> 触发重新渲染 -> 产生新 element 树 -> reconcile -> commit -> DOM 更新

## 六. HMR（热更新）为什么改了代码不用手动刷新

dev 模式下（`npm start`）：

- webpack-dev-server 负责把编译产物放到内存里
- 文件变更会触发增量编译
- 浏览器接收更新，尽量做模块级替换（热更新）

## 七. build 阶段（`npm run build`）有什么不同

当你执行：

```bash
npm run build
```

项目会输出生产构建结果到：

- `build/`

然后你可以用：

```bash
npm run preview
```

用静态服务器预览构建产物。

---

## 当前状态

- **[完成情况]** 已按 `d:\Desktop\JavaScript\09React\airbnb` 的实际结构与配置把 React 全流程写入 `react.md`。
