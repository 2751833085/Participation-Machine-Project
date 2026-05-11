# Tourgo

> Firebase-based walking/sightseeing game platform. Two shipped apps share one project: **Tourgo NeoUI**（主应用，挑战/地图/积分）and **Tourgo Friend / Manhunt**（子应用，匿名房间 + 好友社交 + 多人抓人游戏）。

- 线上地址：https://tourgo-a8ca9.web.app
- 主应用入口：`/NeoUI/`
- Friend 子应用入口：`/game/`

---

## 这是什么

Tourgo 是一个在真实城市中进行的"打卡 + 抓人"游戏平台。两套前端共用同一个 Firebase 后端（Auth / Firestore / Storage / Hosting / Functions），但面向两种玩法：

### 🗺 Tourgo NeoUI（主应用）

一个单页 SPA，用户可以：

- 浏览 / 创建 / 收藏 Hunts（挑战），每个 Hunt 由多个照片打卡点组成
- 运行一个 Hunt —— 倒计时、到每个点拍照、对比提交、积分
- 地图模式浏览（Leaflet，曼哈顿区域分区）
- Google 登录 + reCAPTCHA v3 防护，支持 guest 模式
- 多语言 i18n，Classic / Neo 两套主题
- 管理员门户、排行榜、个人页

### 👥 Tourgo Friend（Manhunt 子应用）

一个匿名好友专属的抓人游戏 + 社交小工具：

- 匿名房间（6 位房间码，主持人审批加入者）
- 头像上锁（不可改的自拍用于识别）
- QR Code 邀请 / 扫描加入
- 捕获确认（拍照对比头像）
- WeChat 风格聊天（文字 + 语音，60s 上限）
- 在线状态（presence）：好友创建了房间时，列表里直接出现 `Join 123456` 快捷按钮
- Friend Code（10 位）可手动添加好友

---

## 快速开始

### 本地运行

```bash
# 安装 Firebase CLI（一次即可）
npm install -g firebase-tools

# 进入项目后本地服务（开发时用）
firebase serve --only hosting

# 打开 http://localhost:5000/NeoUI/   —— 主应用
#   或 http://localhost:5000/game/    —— Friend 子应用
```

因为整个项目**不使用打包工具**，改完源码直接刷新浏览器即可。

### 部署

```bash
# 只更新前端
firebase deploy --only hosting

# 同步 Firestore + Storage 规则 + 前端
firebase deploy --only firestore:rules,storage,hosting

# 后端 Functions（头像校验、管理员接口等）
firebase deploy --only functions
```

### 缓存破坏

每次前端改动之后，bump 两个 HTML 的查询串：

- `public/NeoUI/app.html` → `../css/app.css?v=...` 和 `../js/app.js?v=...`
- `public/game/index.html` → `./hide-seek.css?v=...` 和 `./js/app.js?v=...`

否则浏览器/Service Worker 可能继续用旧缓存。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | 原生 ES Modules（无 Vite/Webpack/bundler）、单页 SPA、hash 路由 |
| 样式 | 原生 CSS + 自定义属性（tokens.css）；分层 @import；Classic + Neo 双主题；Barlow Condensed / Inter / DM Sans 字族 |
| 地图 | Leaflet 1.9.x + OpenStreetMap + 曼哈顿地理边界 |
| 后端 | Firebase（Auth / Firestore / Storage / Hosting / Functions） |
| 功能云函数 | Node.js（`functions/`），含头像校验、管理员接口 |
| 身份 | Google Sign-In（含 reCAPTCHA v3）/ Firebase 匿名登录（Friend 子应用） |
| i18n | `public/js/lib/i18n.js`，运行时切换 |

---

## 仓库地图

```
/                          ← 项目根
├── ARCHITECTURE.md        ← 架构文档（目录结构 / 模块依赖 / CSS 分层 / Firebase 服务）
├── VERSIONS.md            ← 版本日志（每个 cache-bust 构建号对应的功能变化）
├── HANDOFF.md             ← 跨会话交接说明（开新 Claude Code 会话时先读这份）
├── README.md              ← 当前文件
│
├── firebase.json          ← Hosting / Functions / 规则部署配置
├── firestore.rules        ← Firestore 安全规则
├── firestore.indexes.json ← Firestore 索引
├── storage.rules          ← Storage 安全规则
├── storage-cors.json      ← Storage CORS
│
├── functions/             ← 云函数（Node.js）
│
├── public/
│   ├── NeoUI/             ← 主应用入口（index.html 登录门、app.html 主应用）
│   ├── game/              ← Friend / Manhunt 子应用（单文件 app.js + hide-seek.css）
│   ├── css/               ← 主应用 CSS（分层 @import）
│   ├── js/                ← 主应用 JS（lib / services / components / pages）
│   ├── assets/ img/ vendor/
│   └── index.html         ← 根入口（通常跳转到 /NeoUI/）
│
├── tools/                 ← 独立工具（例如 map-editor.html）
└── _design-extract/ _design-v2/   ← 历史设计稿归档，不参与构建
```

详细的模块依赖方向、添加新页面的步骤、CSS 分层顺序等见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

---

## 两个应用的关系

主应用和 Friend 子应用**共享同一个 Firebase 项目**（`tourgo-a8ca9`），但各自有独立的：

- HTML 入口（`/NeoUI/` vs `/game/`）
- CSS（主应用用 `public/css/` 分层；Friend 单文件 `hide-seek.css`）
- JS 模块图（主应用是 services/components/pages 分层；Friend 是单文件 `game/js/app.js`）
- 用户展示名（Friend 可以与主应用同步，也可以单独设 Custom）

它们**共用的部分**：

- Firebase Auth 账号（匿名 uid 在 Friend 里直接工作；已登录的主应用 uid 在 Friend 里也可用）
- 主应用的 `users/{uid}` 文档里的 `displayName`（Friend "Same as Tourgo" 模式订阅它）
- 不同的 Firestore 集合（主应用 `challenges`/`attempts`/`users`；Friend `hideSeekRooms`/`hideSeekPresence`/`hideSeekFriendIndex`/`hideSeekChats`）

---

## 开发约定

- **先读 ARCHITECTURE.md 再改代码**，尤其是添加页面 / 服务 / CSS 层时。
- **只做单向依赖**：`lib → services → components → pages → app.js`。禁止反向或循环。
- **不要绕过 services 层调 Firebase SDK**。
- **新功能 = 新模块**；尽量不破坏已有页面。
- **每次前端改动 bump 缓存破坏字段**；有规则改动就同步 `firebase deploy --only firestore:rules,storage,hosting`。
- **不要删 `data-app-build` 属性**；它是我们跨设备排查 "用户到底在跑哪版" 的抓手。
- **动画**必须包 `@media (prefers-reduced-motion: reduce)` 守卫。
- **Friend 子应用不能在 shell 内重新挂载**（它的 dock 是一次性 DOM）；主应用 `shell.js` 每次路由 `innerHTML` 替换，不能给 `.app-dock` 加入场 keyframe。

---

## 许可 / 致谢

内部课程项目（Parsons），未对外开源协议。第三方资源：

- Leaflet (BSD-2-Clause)
- OpenStreetMap (ODbL)
- Google Fonts (OFL)
- Firebase JS SDK (Apache-2.0)
