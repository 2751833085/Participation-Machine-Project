# Tourgo — 项目架构

> 本文件是实现架构的"地图"。改代码前先读这份；添加新页面 / 新服务 / 新 CSS 分层时也以这份为准。
>
> 版本日志看 [VERSIONS.md](./VERSIONS.md)；准备开新会话交接看 [HANDOFF.md](./HANDOFF.md)。

---

## 概述

Tourgo 是一个基于 Firebase 的双应用项目：

1. **Tourgo NeoUI** — 主应用 SPA，路径 `/NeoUI/`。原生 ES Modules + hash 路由。
2. **Tourgo Friend / Manhunt** — 子应用，路径 `/game/`。ESM 入口 `public/game/js/app.js` + 自建 tab 路由；纯工具与常量逐步拆到 `public/game/js/lib/`（见下文「Friend 拆分」），不与主应用共享业务模块。

两套前端**共用**同一个 Firebase 后端（Auth/Firestore/Storage/Functions），但 Firestore 集合互不重叠，用户身份通过 Firebase Auth uid 直接打通。

---

## 顶层目录

```
/
├── ARCHITECTURE.md                # 当前文件
├── README.md                      # 项目自述
├── VERSIONS.md                    # 版本日志
├── HANDOFF.md                     # 会话交接说明
│
├── firebase.json                  # Firebase 部署配置
├── firestore.rules                # Firestore 安全规则
├── firestore.indexes.json         # Firestore 索引
├── storage.rules                  # Storage 安全规则
├── storage-cors.json              # Storage CORS
│
├── functions/                     # 云函数（Node.js）
│   ├── index.js                   #   入口，导出 callable / HTTP functions
│   ├── headshot-validator.js      #   Friend 子应用头像校验
│   ├── admin-portal-handlers.js   #   主应用管理员接口
│   └── package.json
│
├── public/                        # Hosting 根（部署内容）
│   ├── index.html                 #   根跳转（通常进 /NeoUI/）
│   ├── NeoUI/
│   │   ├── index.html             #   主应用登录门 / 入口
│   │   └── app.html               #   ★ 主应用真正的 shell（本架构的主角）
│   ├── game/
│   │   ├── index.html             #   Friend 子应用入口
│   │   ├── hide-seek.css          #   Friend 子应用全部 CSS（单文件）
│   │   └── js/
│   │       ├── app.js             #   Friend 入口（状态机、订阅、render、actions）
│   │       └── lib/               #   无 Firebase 依赖的可复用片段（constants、format、…）
│   ├── css/                       #   ★ 主应用 CSS（分层 @import）
│   ├── js/                        #   ★ 主应用 JS（lib/services/components/pages 分层）
│   ├── assets/ img/ vendor/
│
├── tools/                         # 独立工具（独立 HTML，不走 SPA）
│   └── map-editor.html
│
└── _design-extract/ _design-v2/   # 历史设计稿归档（不参与构建，不引用任何代码）
```

---

## 主应用架构（`public/NeoUI/` + `public/js/` + `public/css/`）

### JS 目录结构

```
public/js/
├── app.js                         # ★ 入口：挂载 shell、启动路由循环
├── firebase-init.js               # Firebase 初始化（auth, db, storage）
├── image-utils.js                 # 图片压缩
├── recaptcha.js                   # reCAPTCHA v3
│
├── lib/                           # 纯工具 / 基础设施（不依赖 services/components/pages）
│   ├── router.js                  #   `parseRoute()` + `nav()`
│   ├── route-dispatch.js          #   ★ page/id → 页面 render (新路由的登记处)
│   ├── route-events.js            #   合并 nav/hashchange/auth 触发的 flush 队列
│   ├── auth-bootstrap.js          #   Auth 持久化、`authStateReady`、首帧 scheduleRoute
│   ├── dock-navigation.js         #   底部 dock 点击 → requestRoute + scrollAppToTop
│   ├── dock-visual-viewport.js    #   iOS visualViewport 抖动守卫
│   ├── state.js                   #   主题、登录返回路径、guest 会话
│   ├── ui-theme.js                #   ★ 主题注册 / 切换（classical + neo-design）
│   ├── ui-transitions.js          #   路由 enter/leave 过渡编排
│   ├── i18n.js                    #   运行时翻译
│   ├── agent-log.js               #   调试遥测（可拆除）
│   ├── app-toast.js               #   Toast 通知
│   ├── entry-welcome.js           #   首次登录欢迎条
│   ├── geo-flags.js               #   地区 flag / feature gate
│   ├── geo-hunt-rules.js          #   地理规则（距离、区域）
│   ├── manhattan-browse-regions.js# 曼哈顿 region 分块
│   ├── nyc-hero-context.js        #   NYC 英雄区上下文
│   ├── network-banner.js          #   离线提示条
│   ├── photo-proof.js             #   照片取证逻辑
│   └── utils.js                   #   escapeHtml、formatCountdown、haversineMeters 等
│
├── services/                      # 数据服务层（Firestore / Auth / Storage 封装）
│   ├── auth.js                    #   Google 登录 + reCAPTCHA + 会话 / admin session helper
│   ├── challenges.js              #   挑战 CRUD + 图片上传
│   ├── attempts.js                #   尝试生命周期 + start hunt flow
│   ├── users.js                   #   用户积分 / 显示名
│   ├── favorites.js               #   收藏
│   ├── run-social.js              #   运行中打卡照片 + 上传
│   ├── reports.js                 #   举报
│   ├── geocoding.js               #   位置反查
│   └── admin-portal.js            #   管理员操作
│
├── components/                    # 可复用 UI 块
│   ├── shell.js                   #   ★ 全局 shell（header + #app-main + dock + footer）
│   ├── modal.js                   #   通用确认弹窗
│   ├── hunt-feed-markup.js        #   Hunts 列表卡片
│   └── run-social-ui.js           #   运行中打卡 UI
│
└── pages/                         # 页面模块（每个页导出 render() + cleanup()）
    ├── home.js                    #   Hunts 首页（实时列表）
    ├── favorited.js               #   收藏列表
    ├── create.js                  #   创建 hunt (入口/列表模式)
    ├── create-picker.js           #   创建 hunt 选点器
    ├── create-map.js              #   创建 hunt 地图模式
    ├── challenge.js               #   Hunt 详情 + 开始按钮
    ├── run.js                     #   运行中
    ├── hunt-review.js             #   完成后复盘
    ├── leaderboard.js             #   排行榜
    ├── profile.js                 #   个人页
    ├── login.js                   #   登录页
    ├── map.js                     #   地图浏览
    └── admin.js                   #   管理员门户
```

### 依赖方向（**严格单向**）

```
lib  →  services  →  components  →  pages  →  app.js
```

- `lib/` 纯工具，不 import `services/components/pages`。
- `services/` 只 import `firebase-init`、`lib/`、其他 `services/`（不允许循环）。
- `components/` 只 import `lib/` + `services/`。
- `pages/` 只 import `lib/` + `services/` + `components/`。
- `app.js` 在启动阶段挂 shell、注册路由；运行中只被 hashchange 唤醒。

> 不存在循环依赖。如果看到 pages 反向被 lib/services 引用，视为 bug。

### 路由机制

- **hash 路由**：`#/home`、`#/challenge/ABC123`、`#/run/ABC123` …
- `lib/router.js::parseRoute()` 解析 `page`/`id`
- `lib/route-dispatch.js::dispatchRoute(page, id)` switch 到对应页面的 `render()`
- `lib/route-events.js::requestRoute()` 是外界触发路由的唯一入口（dock click / auth change / nav() 都走它）
- 页面切换时：
  1. `components/shell.js::renderShell(inner)` 写入 `document.body.innerHTML`
  2. `.page-transition-root` 里先显示 `inner`，再由 CSS/JS 加 `.is-route-entered` 触发入场动画
  3. ⚠ **每次路由都会整块 `document.body.innerHTML`** — 所以 dock 不能有入场 keyframe，否则每次导航都会重播（见 VERSIONS.md 的 `20260425-dock-mech2`）

### CSS 架构

```
public/css/
├── app.css                  # ★ 入口；按顺序 @import 下面的文件
│    ├─ @import themes/index.css → themes/neoui.css → (tokens, base, components, layout, pages, portrait-gate, neo-design)
│    ├─ @import design.css
│    └─ @import motion.css
│
├── tokens.css               # 1. 设计令牌：颜色、字体、阴影、间距、easing
├── base.css                 # 2. 重置、排版、链接
├── components.css           # 3. .btn / .card / .modal / forms / 状态条
├── layout.css               # 4. 头部、#app-main 容器、底部 .app-dock、footer
├── pages.css                # 5. 页面特定（Hero、Hunt Grid、Leaflet、登录、Profile）
├── portrait-gate.css        # 6. 横屏提示页
├── design.css               # 设计系统增量（在最后，可覆盖前面）
├── motion.css               # ★ 动画 / 过渡 / 交互反馈（页面转场、按钮抬升、dock pill）
├── view-transitions.css     # 原生 View Transitions API 支持
└── themes/
    ├── index.css            #   选择当前主题
    ├── neoui.css            #   NeoUI 主题（cascade hub）
    └── neo-design.css       #   Neo 视觉改版（dock 色、accent 等）
```

**层顺序约定：`tokens → base → components → layout → pages → theme override → motion`。**
motion.css 放在最末意味着它可以覆盖布局和组件的 `transition: none`，所以 dock/按钮的交互过渡都集中在它那里。

---

## Friend 子应用架构（`public/game/`）

```
public/game/
├── index.html          # 外壳：hero + #hs-app（内容挂载点） + <nav class="hs-dock">
├── hide-seek.css       # 单文件 CSS（约 2500 行）
└── js/
    ├── app.js          # ★ 入口：Firebase、`state`、订阅、`friendCtx()`、render、bindEvents
    ├── actions/        # 异步 `action*`（Firestore / Storage）；由 `friendCtx()` 注入依赖（Sentrux `friend_actions`）
    │   ├── room-create.js
    │   ├── room-participation.js
    │   ├── room-play.js
    │   ├── room-media.js
    │   ├── social.js
    │   └── types.js    # JSDoc typedef 占位
    └── lib/            # 无 `public/js` 依赖的叶子模块（`friend_lib`）
        ├── constants.js
        ├── format-utils.js
        ├── id-generators.js
        ├── local-prefs.js
        ├── room-subscriptions.js
        └── server-time.js
```

### Friend 拆分（按步骤，配合 Sentrux）

- **`.sentrux/rules.toml`**：`friend_lib`（`public/game/js/lib/**`）→ `friend_manhunt`（`public/game/js/*.js`）分层；`friend_lib` **禁止** import `public/js/**`（Firebase 初始化只留在 `app.js` 的 `../../js/firebase-init.js` 一条桥接）。
- **已完成 — 步骤 1**：常量、格式化、`uid`/房间码/二维码 token、`localStorage` 偏好与统计、`serverOffsetMs` / `gameNow` 迁入 `lib/`。
- **已完成 — 步骤 2**：`createRoomSubscriptionManager(db)` + `watchWithRetry` / `clearSubs` / 四套 `onSnapshot` → `lib/room-subscriptions.js`；`app.js` 用 `subscribeRoom(code)` 薄封装传入 `onRoomDeleted` / `onRoomUpdate` / `onMembers` / `onCaptures` / `onChats`。
- **已完成 — 步骤 3a**：全部 `action*` 迁至 `actions/`（`room-create`、`room-participation`、`room-play`、`room-media`、`social`）；`app.js` 中 `friendCtx()` 聚合 `state` / `db` / `storage` / Firebase helpers / `render` / `showToast` / `roomSubs` / `subscribeRoom` 等，事件处调用 `actionX(friendCtx(), …)`。
- **建议 — 步骤 3b**：`render*` / 巨型 HTML 生成 → `render/` 或按 tab 拆文件；每迁一块 `sentrux check .`。

### 内部结构（app.js 的分节）

1. **Imports** — Firebase SDK、`../../js/firebase-init.js`、`./lib/*`
2. **State** — 一份模块级 `state` 对象；render 读它，事件 handler 写它
3. **Tab shell** — `TAB_IDS = ["start", "leaderboard", "social", "profile"]`、`switchTab()`、`renderDock()`、`scrollAppToTop()`
4. **Presence / friend index / chat helpers** — `publishFriendIndex`、`publishPresence`、`resolveFriendCode`、`threadIdFor`、`ensureChatThread`、`subscribeFriendPresence`、`subscribeChatPreview`、`refreshSocialSubscriptions`、`openChat`、`closeChatDetail`、`sendTextMessage`、`startVoiceRecording`、`cancelVoiceRecording`、`finishVoiceRecording`
5. **Lobby / Room flows** — 创建房间、加入请求、扫码、确认捕获
6. **Render 函数** — `lobbyHtml`、`roomHtml`、`tabLeaderboardHtml`、`socialChatListHtml`、`socialChatDetailHtml`、`tabSocialHtml`、`tabProfileHtml`、`renderActiveTab`
7. **bindEvents** — 每次 `render()` 后重绑所有 DOM 事件（DOM 被 innerHTML 换掉）
8. **Auth bootstrap** — `onAuthStateChanged` → 匿名登录、`publishFriendIndex`、`publishPresence`、`refreshSocialSubscriptions`、挂 hashchange

### 与主应用的差异

| 维度 | 主应用 (NeoUI) | Friend (game) |
|---|---|---|
| 模块拆分 | lib / services / components / pages | `lib/` + `actions/` + `app.js`（render 待拆） |
| 路由 | hash 路由 (#/…) | 内部 tab state + URL room code |
| Shell 重挂 | 每次路由整块 `body.innerHTML` | dock 一次性挂载，只重绘 `#hs-app` |
| CSS | 分层 @import | 单文件 hide-seek.css |
| 身份 | Google 登录（guest 可用） | 匿名登录 (signInAnonymously) |
| 动画 | motion.css + view-transitions.css | 内建 keyframes（hs-card-rise, hs-dock-in, hs-bubble-in …） |

### Friend 子应用的 Firestore 集合

```
hideSeekRooms/{roomCode}                      # 房间主文档（status, hostUid, members）
├── pending/{uid}                             #   待审批
├── members/{uid}                             #   成员（含 ready, avatarReady, avatarUrl）
└── captures/{id}                             #   捕获记录

hideSeekPresence/{uid}                        # 每用户的在线状态（name, friendCode, currentRoom）
hideSeekFriendIndex/{friendCode}              # friendCode → uid 公开索引（加好友用）

hideSeekChats/{threadId}                      # 1-on-1 线程元信息（participantUids, lastMessage）
└── messages/{messageId}                      #   消息（type: text/voice, senderUid, createdAt, text?, audioUrl?, audioDurationMs?）
```

---

## Firebase 服务职责

| 服务 | 用途 |
|---|---|
| **Authentication** | 主应用 Google 登录 + reCAPTCHA v3；Friend 匿名登录 |
| **Firestore** | 主应用 `challenges` / `attempts` / `users` / `favorites` / `reports`；Friend `hideSeek*` 系列 |
| **Storage** | 主应用打卡照片；Friend 头像（`hide-seek/headshots/`）+ 语音消息（`hide-seek/voice/`） |
| **Hosting** | 静态文件托管（整个 `public/`） |
| **Functions** | 头像相似度校验、管理员接口（见 `functions/index.js`） |

完整规则见 [`firestore.rules`](./firestore.rules) 和 [`storage.rules`](./storage.rules)。

---

## 关键设计原则（务必遵守）

### 1. 新功能 = 新模块
不要改已有 pages/services 的内部结构去塞新功能。主应用在 `pages/` 下加文件并在 `route-dispatch.js` 里登记；Friend 子应用在 `app.js` 内部加一个 render 函数 + 一个 tab id 即可。

### 2. 服务层独占 Firebase SDK
所有 Firestore/Auth/Storage 调用封装在 `public/js/services/` 下。`pages/` 和 `components/` 不允许 `import { doc } from "firebase/firestore"` 之类的事。

### 3. 单向依赖
`lib → services → components → pages → app.js`，反向即 bug。循环依赖必须立刻拆。

### 4. 动画包守卫
任何新增 keyframe / transition 都要在 `prefers-reduced-motion: reduce` 里清零，包在现有的 `motion.css` 末尾守卫里或自己写 `@media`。

### 5. 每次改动 bump cache-bust
`public/NeoUI/app.html` 和 `public/game/index.html` 的 `?v=…`；别忘了改 `data-app-build` 字段供线上排查。

### 6. 主应用 dock DOM 每次路由都重挂
不要给 `.app-dock`/`.app-dock-inner` 加入场 keyframe，否则每次导航都会跳一下。入场类动画只能加在 `.page-transition-root` 里。

### 7. Friend 子应用不能反过来依赖主应用模块
`public/game/js/lib/**` 不得 import `public/js/**`。入口 `app.js` 允许 **仅此一条**：`import … from "../../js/firebase-init.js"`（共享 Firebase app 实例）。禁止从 `../../js/lib/*`、`../../js/services/*` 等引业务代码；要共享行为请用 Firestore/Storage 合约字段或复制最小常量到 `game/js/lib/`。

### 8. 无构建工具
全部浏览器原生 ES Modules。禁止引入需要打包的依赖（TypeScript、JSX、SCSS 等）。需要 polyfill 时 vendor 化放 `public/vendor/`。

---

## 添加新功能的工单模板

### 加一个新页面（主应用）
1. `public/js/pages/<name>.js` 导出 `render(id?)`、`cleanup()`
2. `public/js/lib/route-dispatch.js` 加 `case "<name>": render()`
3. `public/js/lib/router.js`（如需支持新 hash 形式）
4. `public/css/pages.css` 追加样式 —— 或独立文件 + 在 `app.css` @import
5. 如果在 dock 里出现，改 `public/js/components/shell.js::mobileDock()`
6. Bump cache-bust，`firebase deploy --only hosting`

### 加一个新 Firestore 集合
1. 先写 `firestore.rules` 新的 `match` 块（字段白名单 + membership 校验）
2. `public/js/services/<name>.js` 封装读写
3. 必要时在 `firestore.indexes.json` 登记复合索引
4. `firebase deploy --only firestore:rules,firestore:indexes`（再 hosting）

### Friend 子应用加 tab
1. `TAB_IDS` 加 id
2. 加一个 `tab<Name>Html()` 渲染函数
3. `renderActiveTab()` switch 加 case
4. `index.html` 的 `<nav class="hs-dock">` 加按钮（icon + label）
5. `bindEvents()` 绑该 tab 的所有事件
6. 如果要在离开时清理（定时器、订阅），在 `switchTab()` 的"离开分支"里加 cleanup
7. Bump cache-bust

---

## 调试 / 排查

- **查看用户跑的版本**：DevTools 打开页面 → 读 `<html data-app-build="…">`（主应用和 Friend 都有）。
- **缓存没刷新**：确认 `?v=` 真的 bump 了；在 Application → Service Workers 里 `Unregister` 再硬刷新。
- **Firestore permission-denied**：rules playground 模拟或 `firebase emulators:start`；注意 `resource.data` 是已有值、`request.resource.data` 是即将写入的值。
- **动画跳动**：通常是某个 DOM 被父容器 `innerHTML` 重挂时重放 keyframe。把 animation 改为一次性（JS 加 class）或移除即可。
- **Friend 子应用 mic 卡住**：iOS 会在 tab 切换时不停 stream；`switchTab` 离开 Social 的分支里会 `cancelVoiceRecording()` + `closeChatDetail()`。

---

## 开发与部署（摘要）

```bash
# 本地
firebase serve --only hosting

# 仅前端
firebase deploy --only hosting

# 前端 + 规则
firebase deploy --only firestore:rules,storage,hosting

# 云函数
firebase deploy --only functions
```

详细部署流程和缓存破坏约定见 [README.md](./README.md)；每个构建号承载的功能变化见 [VERSIONS.md](./VERSIONS.md)；跨会话交接在 [HANDOFF.md](./HANDOFF.md)。
