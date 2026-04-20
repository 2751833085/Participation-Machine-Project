# Tourist Manhunt — 项目架构

## 概述

Tourist Manhunt 是一个基于 Firebase 的单页应用（SPA），使用原生 ES Modules 构建，无需打包工具。
采用 hash 路由（`#/page/id`），所有页面通过 JavaScript 动态渲染。

---

## 目录结构

```
public/
├── index.html                 # 入口 HTML（仅加载 CSS + JS 入口）
│
├── css/
│   ├── app.css                # 主样式入口（@import 所有子文件）
│   ├── tokens.css             # 设计令牌：颜色、字体、间距、阴影
│   ├── base.css               # 重置、排版、链接样式
│   ├── components.css         # 通用组件：按钮、卡片、表单、弹窗、状态条
│   ├── layout.css             # 布局：头部、主区域、底部 Dock、页脚
│   └── pages.css              # 页面特定：Hero、Hunt Grid、地图、登录、个人
│
├── js/
│   ├── app.js                 # ★ 应用入口：路由 flush 队列、shell 启动、hash 监听
│   ├── firebase-init.js       # Firebase 初始化（auth, db, storage）
│   ├── image-utils.js         # 图片压缩工具
│   ├── recaptcha.js           # reCAPTCHA v3 加载与执行
│   │
│   ├── lib/                   # 路由、状态、工具（与页面解耦）
│   │   ├── router.js          #   hash 解析 + `nav()`
│   │   ├── route-dispatch.js  #   ★ `page`/`id` → 具体页面 render（新路由主要改这里 + router）
│   │   ├── route-events.js    #   合并路由 flush（nav / hashchange / auth）
│   │   ├── dock-navigation.js #   底部 Dock 内链接触发 `requestRoute`
│   │   ├── auth-bootstrap.js  #   Auth 持久化、`authStateReady`、首帧 `scheduleRoute`
│   │   ├── state.js           #   主题、登录返回、guest 会话等
│   │   └── utils.js           #   escapeHtml, formatCountdown 等
│   │
│   ├── services/              # 数据服务层（Firestore / Auth / Storage）
│   │   ├── auth.js            #   Google 登录、reCAPTCHA 防护、会话管理
│   │   ├── challenges.js      #   挑战 CRUD、图片上传、曼哈顿地理推断
│   │   ├── attempts.js        #   尝试记录：创建、监听、更新、完成
│   │   └── users.js           #   用户积分：监听、发放
│   │
│   ├── components/            # 可复用 UI 组件
│   │   ├── shell.js           #   页面外壳：主区域 + Dock + 页脚
│   │   └── modal.js           #   确认弹窗（通用）
│   │
│   └── pages/                 # 页面模块（每页独立、可独立加载）
│       ├── home.js            #   首页 — Hunts 列表（实时更新）
│       ├── login.js           #   登录页 — Google 登录 + reCAPTCHA
│       ├── profile.js         #   个人页 — 账户、积分、主题切换
│       ├── create.js          #   创建页 — 多检查点上传表单
│       ├── challenge.js       #   详情页 — 预览检查点 + 开始按钮
│       ├── run.js             #   运行页 — 实时计时器 + 打卡
│       └── map.js             #   地图页 — Leaflet 曼哈顿地图
│
├── test1.html                 # 独立 UI 实验页（不影响主应用）
│
tools/
└── map-editor.html            # 独立地图编辑器工具

firestore.rules                # Firestore 安全规则
firestore.indexes.json         # Firestore 索引配置
storage.rules                  # Storage 安全规则
firebase.json                  # Firebase 部署配置
.firebaserc                    # Firebase 项目绑定
```

---

## 模块依赖图

```
index.html
  └─ js/app.js  (入口)
       ├─ lib/router.js        ← 纯工具，无依赖
       ├─ lib/state.js         ← 纯工具，无依赖
       ├─ lib/utils.js         ← 纯工具，无依赖
       ├─ firebase-init.js     ← Firebase SDK
       │
       ├─ services/auth.js     ← firebase-init, recaptcha, lib/*
       ├─ services/users.js    ← firebase-init
       ├─ services/challenges.js ← firebase-init, image-utils
       ├─ services/attempts.js ← firebase-init
       │
       ├─ components/shell.js  ← firebase-init, lib/state, services/users
       ├─ components/modal.js  ← 无依赖
       │
       └─ pages/*              ← 各自依赖 components/*, services/*, lib/*
```

**依赖方向始终是单向的：**
`lib → services → components → pages → app.js`

不存在循环依赖。

---

## 页面模块规范

每个页面模块（`js/pages/*.js`）导出两个函数：

| 导出 | 说明 |
|------|------|
| `render(id?)` | 渲染页面，`id` 为可选的路由参数 |
| `cleanup()` | 页面离开时清理（取消订阅、销毁定时器等） |

### 添加新页面的步骤

1. 在 `js/pages/` 下创建新文件，如 `leaderboard.js`
2. 实现 `render()` 和 `cleanup()` 导出
3. 在 `js/app.js` 中添加 `import` 和 `switch case`

```js
// js/app.js
import * as leaderboardPage from "./pages/leaderboard.js";

// 在 route() 的 switch 中添加:
case "leaderboard":
  activate(leaderboardPage);
  leaderboardPage.render();
  break;
```

4. 如果有新样式，在 `css/` 下创建文件并在 `app.css` 中 `@import`

---

## CSS 架构

采用分层 CSS，通过 `app.css` 中的 `@import` 按顺序加载：

| 层 | 文件 | 内容 |
|----|------|------|
| 1 | `tokens.css` | CSS 自定义属性（颜色、字体、间距、阴影）、亮/暗主题 |
| 2 | `base.css` | 重置、排版、链接、通用文本类 |
| 3 | `components.css` | 按钮、卡片、表单、状态条、弹窗 |
| 4 | `layout.css` | 头部、Dock、页脚、页面布局容器 |
| 5 | `pages.css` | Hero 区域、Hunt 卡片网格、地图、登录、个人页 |

### 添加新组件样式

在 `css/` 中创建新文件，然后在 `app.css` 末尾添加：
```css
@import url("my-feature.css");
```

---

## 关键设计原则

### 1. 模块独立
每个模块管理自己的状态和生命周期。页面离开时通过 `cleanup()` 清理资源。

### 2. 服务层封装
所有 Firestore/Auth/Storage 操作封装在 `services/` 中。页面模块不直接调用 Firebase SDK。

### 3. 单向依赖
`lib` ← `services` ← `components` ← `pages` ← `app.js`。禁止反向依赖和循环依赖。

### 4. 新功能 = 新模块
新功能以新文件形式加入，尽量不修改已有模块。只需在 `app.js` 的路由表中注册。

### 5. 无构建工具
全部使用浏览器原生 ES Modules，部署时直接上传 `public/` 目录到 Firebase Hosting。

---

## Firebase 服务

| 服务 | 用途 |
|------|------|
| **Authentication** | Google 登录（含 reCAPTCHA v3 防护） |
| **Firestore** | `challenges`（挑战）、`attempts`（尝试）、`users`（用户积分） |
| **Storage** | 检查点照片上传（自动压缩为 JPEG） |
| **Hosting** | 静态文件托管 |

---

## 开发与部署

```bash
# 本地开发
firebase serve --only hosting

# 部署到 Firebase
firebase deploy
```
