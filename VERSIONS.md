# Tourgo — 版本日志 (Version Log)

本文件记录 Tourgo 主应用 (`public/NeoUI/`) 与 Friend 子应用 (`public/game/`) 的功能演进。
发布号采用缓存破坏 (cache-bust) 字段形式，可从 HTML 的 `?v=...` 或 `data-app-build` 属性直接读出对应版本。

---

## 主应用 (Tourgo NeoUI)

当前构建号：`v=20260425-leaderboard-async`（加载字段 `public/NeoUI/app.html`）。

### `20260425-leaderboard-async` — 修复 Rank 页快速切换导致的"卡住"
- **现象**：用户点 Rank tab 后立刻切其他 tab，界面看起来卡住一段时间。
- **根因**：`leaderboard.js` 的 `render()` 是 `async`，内部 `await Promise.all([getDocs, getDoc])` 会阻塞 `app.js` 的 `await dispatchHashRoute()`。下一次路由 flush 必须等当前 Firestore 往返完成才能执行 → 看起来像冻屏。
- **修复**：
  - `render()` 改为同步返回：先用 `renderShell()` 画出 hero + loading body，立刻 return。
  - 数据加载抽到 `loadLeaderboard(bodyEl, myToken)` 里 fire-and-forget。
  - 新 token 机制：每次 `render()` 和 `cleanup()` 都 `activeToken += 1`。in-flight 加载携带自己的 `myToken`，query 返回后对不上就跳过所有 DOM 写入。`!bodyEl.isConnected` 兜底防止写入已脱离文档的节点。
- **浏览器验证**：Rank → Profile 快切 758ms 完成，profile 页正确渲染，leaderboard DOM 已移除；Rank 的 Firestore 还在背景转完自然作废。

### `20260425-dock-mech10` — dock 大小锁定，不随视口缩放
- 之前 `.app-dock-inner(--five)` 用 `width: calc(100% - 1.2rem)`，dock 宽度会随视口变化（iPhone vs iPad 视觉尺寸不一致）。
- 修复：`width: calc(var(--content-max) - 1.2rem)`（= 402px − 1.2rem ≈ 382.8px），视口 ≥ 402px 时 dock 尺寸固定；`max-width: calc(100vw - 1.2rem)` 仅作超窄视口兜底。
- 浏览器验证：在 426px 和更宽的视口下 dock 始终 382.8px。

### `20260425-dock-mech9` — dock 圆角 = 高光圆角
- `neo-design.css` 里 `.mobile-tab:not(.mobile-tab-plus).is-active` 的 chip 用 `border-radius: 0.95rem`（圆角矩形，非胶囊）；而外层 `.app-dock-inner--five` 之前是 `999px` 全胶囊 —— 内外形状不同。
- 修复：外层 dock 改 `0.95rem`，与 chip 属同一圆角家族。`motion.css` 里的 generic `.mobile-tab.is-active { border-radius: 999px }` 同步改为 `0.95rem`（非 neo-design 主题也沿用）。
- 已通过浏览器验证：`.app-dock-inner--five` 与 `.mobile-tab.is-active` 的 computed `border-radius` 均为 `15.2px`。

### `20260425-dock-mech8` — 加号按钮：恢复可见的圆圈与阴影
- 上一版把 idle 改成透明背景 + 无阴影后，"圆圈"和"浮起感"消失。
- 修复：idle 回到 `background: var(--surface)` + `border: 1px solid border` + 柔和阴影；图标色仍是 `var(--text-muted)`（对齐其他未选中 tab）。
- 暗色主题恢复 dark-surface 圆圈 + 深阴影。

### `20260425-dock-mech7` — 加号按钮：未选中色对齐其他 tab
- **idle（未选中）**：`.mobile-tab-plus-circle` 背景改为 `transparent`，图标色 `var(--text-muted)`，无边框、无阴影 —— 完全复刻其他未选中 tab 的空气态。
- **hover / 选中 / 按压**：由对应伪类规则显式重新注入 accent 渐变 + 白色图标 + 阴影（上一版把这些 attr 放在基础规则里，现在搬到状态选择器内）。
- 抬升（`margin-top: -1.15rem`）仍在基础规则，三态共享，所以只在颜色层有变化，无任何位移。
- 暗色主题：idle 继承浅色基础（透明 + text-muted），不再单独覆盖；交互态阴影加深保持不变。

### `20260425-dock-mech6` — 加号按钮：统一 accent 填充 + 浮出 dock 顶部
- **颜色统一**：选中（`.is-active` / hover）与按压（`:active`）都用长按的 accent 渐变（`linear-gradient(145deg, var(--accent), var(--accent-hover))`）+ `#fdf9f3` 白色图标。按压仅加深阴影与 `filter: brightness(1.04)` 作区分，不换主色。
- **位置抬高**：`.mobile-tab-plus-circle` 加 `margin-top: -1.15rem`，FAB 圆浮出 dock 胶囊上方，视觉上成为 primary CTA；`.mobile-tab-label` 负向微调避免整体过高。
- **依然 0 位移**：保留 `transform: none !important` 守卫；这次的抬升用 margin 实现，不触发 transform 过渡，点击完全无下移。
- 暗色主题保留 accent 渐变填充（深底上仍对比清晰），分别加深 idle / 选中 / 按压阴影。

### `20260425-dock-mech5` — 加号按钮：彻底消除位移 + 选中态对齐其他 tab
- **点击不再下移**：`.mobile-tab-plus` 及其 `.mobile-tab-plus-circle` 的所有伪类（`:hover`/`:focus`/`:focus-visible`/`:active`/`.is-active`）全部写死 `transform: none !important`，杜绝任何层级引入 translate/scale。
- **选中态与其他 tab 一致**：hover / `.is-active` → `accent-soft` 柔和胶囊 + `var(--text)` 图标色（此前是 `var(--accent)`），与普通 `.mobile-tab.is-active` 的胶囊方案同款。
- **按压态保持强调**：`:active` 仍走 accent 渐变填充 + 白色图标，与选中态区分。
- 暗色主题同步调整：选中 → accent-soft + text；按压 → accent 填充。

### `20260425-dock-mech4` — 加号按钮：三态区分 + 图标清晰
- **按压不再下移**：移除 `.mobile-tab-plus:active .mobile-tab-plus-circle` 上的任何 `transform`，press 通过颜色高亮传达而不是位移。
- **选中态 ≠ 按压态**：
  - 选中 / 悬浮（`.is-active` / `:hover:not(:active)`）→ `accent-soft` 柔和胶囊 + `var(--accent)` 图标，作为被选中的 subtle 高亮。
  - 按压（`:active`）→ 填充 `linear-gradient(accent, accent-hover)` + `#fdf9f3` 图标 + 加深阴影，作为强调反馈（比选中更抢眼）。
- **图标"看不清"**：idle 图标色从 `text-muted` 提到 `var(--text)`；SVG 尺寸由 18px 放到 22px（通过 CSS 缩放，不改 `shell.js`）。
- 暗色主题分别覆盖三态（idle / 选中 / 按压），press 依旧走 accent 填充。

### `20260425-dock-mech3` — 修复 dock 加号按钮
- **问题 1（下移抖动）**：`.mobile-tab:active { transform: scale(0.94) }` 同时命中 `.mobile-tab-plus`（FAB 带两个 class），再叠加 `.mobile-tab-plus-circle` 的 `translateY(-1px)` hover 与 `scale(0.93)` press，按压/悬浮时 FAB 视觉上被"按下去"。
  - 修复：`.mobile-tab:active` 改为 `.mobile-tab:not(.mobile-tab-plus):active`，不再命中 FAB；移除 hover 的 `translateY(-1px)`；press 的 scale 从 `0.93` 放缓到 `0.96`。
- **问题 2（图标色不统一）**：原 `.mobile-tab-plus-circle` 用 accent 渐变 + `#fdf9f3` 白色图标，与旁边的 text-muted/text 配色不搭。
  - 修复：`motion.css` 新增覆盖层，把加号圆设为 `background: var(--surface)` + `color: var(--text-muted)`，hover/active 时渐变到 `var(--text)`，保留阴影（`0 6–8px 18–22px color-mix(var(--text)...)`）以维持"浮起"的视觉权重。暗色主题另做一层覆盖。

### `20260425-dock-mech2` — 修复 dock 抖动
- `public/js/components/shell.js` 每次换路由都 `document.body.innerHTML = ...`，导致 dock DOM 在每次导航时重新挂载。前一版的 `.app-dock { animation: app-dock-in }` 因此会在每次路由切换时重播入场动画 → 用户看到 dock 从下方"跳"一下。
- 修复：移除 `.app-dock` 上的 keyframe 动画；dock 仍以浮动胶囊样式呈现，但挂载即到位，不再位移。
- 其他交互机制（按钮 hover 抬升、按压回弹、tap 按压缩放、`.motion-content` 子项 stagger）保留。

### `20260425-dock-mech` — 移植 Friend 的交互机制 + 胶囊 dock 风格
- 保持颜色 / 图标 / 字体不变，机制层面向 Friend 子应用对齐。
- **Dock 外观**：`.app-dock-inner(--five)` 改为居中浮动胶囊（`border-radius: 999px`，`backdrop-filter: blur(16px) saturate(1.05)`，阴影 + 内高光）；`.app-dock` 外层透明。
- **Active 态**：tab 获得一层 `accent-soft` 胶囊高亮；中间 `+` FAB 保留原渐变圆样式。
- **按钮**：`.btn` / `.btn-primary` / `.btn-ghost` 增加 `transform` 过渡；hover 抬升 ≤1.5px，`:active` 回弹 `scale(0.98~0.985)`；不改亮度 / 颜色。
- **Dock tap 反馈**：`.mobile-tab:active` → `scale(0.94)`；`.mobile-tab-plus:active .mobile-tab-plus-circle` → `scale(0.93)`；spring ease。
- **Stagger**：`#app-main .page-transition-root .motion-content > *:nth-child(2..7+)` 追加 42ms 步进的 `transition-delay`，复刻 Friend 的卡片阶梯入场。
- **回顶**：`public/js/lib/dock-navigation.js` 新增 `scrollAppToTop()`，dock 点击后在当前帧和 rAF 各执行一次 `window.scrollTo(0,0)` + `documentElement/body/#app-main.scrollTop = 0`；点击当前 active tab 也会触发。
- 所有新动画均包 `prefers-reduced-motion: reduce` 守卫。

### `20260425-image-motion` — 基线（dock-mech 系列之前）
- 先前稳定版；图片入场淡入 + 去抖等。细节不在本文件范围。

---

## Friend 子应用 (Tourgo Friend / Manhunt)

当前构建号：`v=4b-dock`（加载字段 `public/game/index.html`）。

### `4b-dock` — dock 回顶 + switchTab 集成
- `public/game/js/app.js` 新增 `scrollAppToTop()`。接入点：
  - dock 按钮 click 处理器：调用前先滚顶，再走 `switchTab(tab)`。
  - `switchTab()`：same-tab early-return 分支内滚顶；render 之后再滚一次以应对 DOM 替换后的残留滚动。

### `4-social` — 把 Friends 页重构为 Social（WeChat 风格）
- **底部 tab 改名**：`Friends` → `Social`；图标换成聊天气泡 SVG。
- **Me 页**：新增 `.hs-code-card`（Friend Code + Copy 按钮），原 Friends 面板的代码卡片搬移过来。
- **Social 列表视图**：WeChat 风格行（头像 + 在线圆点 + 姓名 + 最近时间 + 最后一条消息预览）；在线房间的好友行尾显示 `Join 123456` 快捷按钮，按名称 & 最近活动排序。
- **Social 二级聊天**：
  - 顶部返回 + 好友名 + 在线状态；若好友在房间，顶部同样显示 `Join` 按钮。
  - 气泡（我发右对齐主色渐变 / 对方左对齐卡片色）；支持文本（Enter 发送、Shift+Enter 换行）与语音（麦克风按钮 + 录音条）。
  - `MediaRecorder` 录制，60 秒自动停止；红色 pulse 动画提示录音中；上传到 `hide-seek/voice/{threadId}/{uid}/{messageId}.webm`。
- **Presence**：登录 → `publishFriendIndex()` + `publishPresence("")`；`subscribeRoom` 进房时写 currentRoom，`leaveRoom` 清空；列表与聊天头部据此显示 "In room 123456" + Join CTA。
- **添加好友**：Save 时通过 `hideSeekFriendIndex/{code}` 解析 uid 写回 friend 列表；解析失败仍保存，等对方上线。
- **规则同步**：
  - `firestore.rules`：新增 `hideSeekPresence/{uid}`、`hideSeekFriendIndex/{code}`、`hideSeekChats/{threadId}` + 子集合 `messages/{id}`（participantUids 成员校验 + 字段白名单）。
  - `storage.rules`：新增 `hide-seek/voice/{threadId}/{uid}/{fileName}`（仅本人、audio MIME、<4 MB）。

### `3-tabs` — 4-tab dock shell + Me / Ranks
- **底部 dock**：4 个 tab (`Start` / `Ranks` / `Friends` / `Me`) + 居中胶囊入场动画 `hs-dock-in`。
- **Start**：原 lobby/room 流程保留。
- **Ranks**：新的成就视图（captures, rooms joined/created, games played/won 等）；来自 localStorage 的 lifetime stats。
- **Friends**：（此版本中仍是 CRUD 好友列表；4-social 版本才改造成聊天流）。
- **Me**：姓名模式切换（Same as Tourgo / Custom），离开/加入房间状态。
- 顶部 header 采用 Tourgo 风格（品牌字 + "Back to Tourgo" 在右上方）。
- 每次 `render()` 在 `#hs-app` 上 toggle `data-hs-enter="1"` 触发 `.hs-stack > *` 的 nth-child stagger。

### 早期版本
首次 demo 聚焦于匿名房间 + QR 邀请 + 头像捕获 → 捕获确认流程。

---

## 安全规则里程碑

| 文件 | 新增规则 | 关联版本 |
|---|---|---|
| `firestore.rules` | `hideSeekPresence` / `hideSeekFriendIndex` / `hideSeekChats` + messages | Friend `4-social` |
| `storage.rules` | `hide-seek/voice/{threadId}/{uid}/{fileName}` | Friend `4-social` |
| `storage.rules` | `hide-seek/headshots/{roomCode}/{uid}/headshot.jpg` | Friend 早期 |

---

## 部署流程

```bash
# 只发 hosting（纯前端改动）
firebase deploy --only hosting

# 改了 firestore/storage 规则要一起发（注意：是 "storage" 不是 "storage:rules"）
firebase deploy --only firestore:rules,storage,hosting
```

每次前端改动记得 bump HTML 里的 `?v=...` 查询串（主应用在 `public/NeoUI/app.html`，Friend 在 `public/game/index.html`），否则 Service Worker / 浏览器缓存会继续喂旧版。
