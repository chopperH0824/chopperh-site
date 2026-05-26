# CLAUDE.md — AI 协作指南

> 本文件为 AI 协作者（Claude Code 等）提供项目快速上手信息。修改前必须通读。

---

## 项目概览

个人作品集网站，**单页 HTML**，所有 CSS 和 JS 全部内嵌在 `index.html`。

| 项目 | 地址 |
|------|------|
| 主文件 | `index.html`（约 2700+ 行） |
| GitHub 仓库 | `https://github.com/chopperH0824/chopperh-site` |
| 线上地址 | `https://me.chopperh.me`（GitHub Pages，push 后约 1 分钟生效） |
| 静态资产 CDN | `https://assets.chopperh.me` |
| 资产服务器 | `root@43.156.212.118`，目录 `/var/www/assets/` |

---

## 开发流程

```bash
# 本地预览
python3 -m http.server 8080

# 部署
git add index.html
git commit -m "描述"
git push origin main
```

---

## 代码结构

| 区域 | 行号（约） | 内容 |
|------|-----------|------|
| `<style>` | 1–640 | 全部 CSS：变量、组件、动画 |
| HTML body | 640–2050 | 页面结构，各 section |
| `<script>` | 2050+ | 全部 JS：滚动、TTS、聊天、IntersectionObserver |

### 关键 Section

| id | 内容 |
|----|------|
| `#top` | 首屏 hero，含 5 个浮动公司 logo（快速跳转锚点） |
| `#about` | 关于我，两栏布局 |
| `#stack` | AI 工具链 |
| `#work` | 作品集，filter 标签 + 卡片网格 |
| `#journey` | 工作经历，exp-card 卡片列表 |
| `#ai-demo` | AI 玩具体验区（TTS + LLM 对话） |
| `#contact` | 联系方式 |

---

## 设计系统

### CSS 变量（`:root`）

```css
--bg: #f8f4ee                  /* 页面底色，暖米色 */
--text: #211f1f                /* 主文字色 */
--text-dim: #555150            /* 次要文字 */
--text-faint: #8a817e          /* 更浅文字 */
--accent: #f59f2f              /* 主强调色，暖橙 */
--accent-2: #c58cf0            /* 紫色强调 */
--accent-3: #69c7e8            /* 蓝色强调 */
--maxw: 1180px                 /* 最大宽度 */
--mono: 'JetBrains Mono'       /* 等宽字体，用于标签/chip/数字 */
--display: 'Syne'              /* 展示字体，用于标题 */
--body: 'Manrope'              /* 正文字体 */
--glass-bg: linear-gradient(135deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58))
--glass-blur: blur(24px) saturate(165%)   /* 仅用于固定层，见下方规则 */
--glass-shadow: 0 24px 80px rgba(56,72,100,0.16), inset 0 1px 0 rgba(255,255,255,0.65)
```

### 字体用途规则

- **标题、大数字**：`font-family: var(--display)`（Syne）
- **标签、chip、等宽数据、nav 链接**：`font-family: var(--mono)`（JetBrains Mono）
- **正文段落**：`font-family: var(--body)`（Manrope，默认继承）

### 圆角规则

| 元素类型 | border-radius |
|----------|---------------|
| 大卡片（.card、.exp-card、.about-card） | `28px` |
| 中型容器（.tool、.ai-demo-panel） | `24px` |
| 小元素（chip、badge、tag） | `999px`（胶囊形） |
| 图片（card-image） | `12px` |
| 浮动 logo | `20px` |

---

## backdrop-filter 使用规则（重要）

**只有固定层元素**才允许使用 `backdrop-filter`，滚动内容一律不用。

| 允许使用 | 禁止使用 |
|----------|---------|
| 顶部 nav（fixed） | `.card` |
| 浮动 logo（.float-logo） | `.exp-card` |
| hero 区按钮（.btn、.hero-desc） | `.stats`、`.about-card` |
| filter 筛选栏 | `.tool` |
| 联系链接（.clink） | AI demo 区各元素 |

**原因**：页面同时存在 30+ 个 backdrop-filter 元素时，浏览器 GPU 合成层压力过大，滚动时会整屏闪烁。滚动内容改用更不透明的纯渐变背景（`--glass-bg`）替代。

---

## 作品集卡片规则（#work section）

### 图片容器
- 每张卡片只能有**一种**图片容器：要么 `<img class="card-image">` 单图，要么 `<div class="image-stack">` 多图堆叠，**不能同时存在两种**
- `image-stack` 或 `card-image` 放在 `.cat` 标签之后、`<h3>` 之前
- 多图堆叠：第一张图用 `src=` 直接加载（预览图），其余用 `src="" data-src="..."` 懒加载

### 文字长度
- `<p>` 描述控制在 **1–2 句**，避免同行卡片因文字差异导致行高不一致
- 同行内所有卡片文字量应大致对齐

### 行分组顺序

| 行 | 卡片内容 | data-cat |
|----|---------|----------|
| Row 1 | 颜小芋助农产业链 · 颜小芋品牌商业闭环 · 多模态内容工具链 | startup / content |
| Row 2 | 儿童AI玩具产品线 · F6S-AI联名故事机 · W1白噪音哄睡宝 | hw / hw impact |
| Row 3 | AI智能体DIY平台 · 京东白皮书 · 科学技术成果评价 | hw / impact |
| Row 4 | 网页端交互模拟器 · Hermes Agent · OpenClaw 网关 | vibe |
| **最后行** | **保密项目 A · B · C** | hw |

保密项目**必须放最后一行**，不得调整。

### 动画延迟 class
- 每行第 1 张：`class="card reveal"`
- 每行第 2 张：`class="card reveal d1"`
- 每行第 3 张：`class="card reveal d2"`

---

## 图片资产规范

详见 [`IMAGE_RULES.md`](IMAGE_RULES.md)，核心要点：

- 所有图片统一 **WebP** 格式，禁止在 HTML 中直接引用 jpg/png 的 CDN 资源
- 新图片：本地转 WebP → `scp` 上传服务器 → HTML 中用 CDN 地址引用
- 首屏关键图：直接 `src=`，无 `loading` 属性
- 非首屏普通图：`loading="lazy"`
- image-stack 叠图：`src=""` + `data-src="..."` + `loading="lazy"`（由 IntersectionObserver 触发）

```bash
# 上传图片
scp file.webp root@43.156.212.118:/var/www/assets/images/
```

---

## 浮动 Logo（#top hero 区）

5 个浮动 logo 固定在首屏右侧无文字区域，点击跳转对应工作经历锚点。

| id | logo 文件 | 跳转锚点 |
|----|----------|---------|
| `#fl-leyang` | `images/logos/logo-leyang.png` | `#exp-leyang` |
| `#fl-hhtu` | `images/logos/logo-hhtu.png` | `#exp-hhtu` |
| `#fl-vivo` | `images/logos/logo-vivo.svg` | `#exp-vivo` |
| `#fl-yidao` | `images/logos/logo-yidao.png` | `#exp-yidao` |
| `#fl-yxy` | `images/logos/logo-yxy.png` | `#exp-yxy` |

- 容器尺寸：76×76px，border-radius: 20px
- 默认图片尺寸：52×52px；JOYIN 和亿道单独放大至 66×66px（图片内容四周留白较多）
- Logo 文件存放在 `images/logos/`（进 git），均为透明底

---

## scroll reveal 动画

`.reveal` 元素初始 `opacity:0 + translateY(30px)`，由 IntersectionObserver 添加 `.in` 类触发入场。

- 动画曲线：`cubic-bezier(.16,1,.3,1)`，时长 0.7s
- 添加新 reveal 元素无需额外 JS，直接加 `class="reveal"` 即可
- `will-change: opacity, transform` 在动画前自动设置、动画后重置为 `auto`

---

## TTS 系统

- 模型：MiMo-V2.5-TTS（小米 API）
- 流程：回复生成时后台 `prefetchTTS()` 预取音频并缓存到 `Map`，点击播放按钮时 `playTTS()` 秒播
- 已缓存状态：`.play-btn.cached` + 绿色小圆点 `::after` 指示
- **不自动播放**，必须手动点击播放键

---

## 后端 Worker

`worker/src/index.ts` 部署在 Cloudflare Workers（`aichat.chopperh.me`）：

- `POST /chat` — LLM 对话（MiMo 模型）
- `POST /tts` — 语音合成（MiMo-V2.5-TTS）

修改后执行 `wrangler deploy`。

---

## 服务器操作

```bash
ssh root@43.156.212.118
nginx -t && systemctl reload nginx   # 修改 nginx 配置后执行
```

---

## 素材暂存区

`next/` 是本地素材中间站，见 `next/README.md`。**`next/` 不进 git，可随时清理。**
