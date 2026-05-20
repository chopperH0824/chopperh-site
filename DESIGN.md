# 个人网站设计说明文档

> 这份文档说明网站的设计思路、结构、交互和待补充内容。
> 后续可以直接把这份文档 + `index.html` 一起喂给 **Claude Code / Codex**，让它帮你补充真实内容、加图片、加新板块。

---

## 一、设计定调（Design Direction）

**美学方向：`Terminal × Editorial`（终端 × 杂志）暗色调**

核心理念：你的个人品牌是「**用 AI 工具构建产品的产品经理**」，所以视觉上要同时传达两种气质：

- **开发者/Builder 的硬核感** —— 等宽字体（JetBrains Mono）、终端符号（`//`、`_`、闪烁光标）、电光绿点缀（#D4FF3F）
- **产品人的精致感** —— 大字号 Display 字体（Syne）、克制的留白、杂志式分栏排版

**刻意避开的"AI 烂大街"风格**：紫色渐变、白底紫字、Inter/Roboto 字体、千篇一律的卡片堆叠。

---

## 二、设计系统（Design System）

### 配色（CSS 变量，在 `:root` 里）
| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg` | `#0a0a0b` | 主背景（近黑）|
| `--bg-card` | `#16161a` | 卡片背景 |
| `--text` | `#ECECE8` | 主文字（暖白）|
| `--text-dim` | `#8C8C86` | 次要文字 |
| `--accent` | `#D4FF3F` | **电光绿**——核心强调色，象征 vibe coding 能量，克制使用 |
| `--accent-2` | `#FF6B4A` | 暖珊瑚——次强调（备用）|
| `--accent-3` | `#5AC8FA` | 冷青——第三强调（备用）|

> 强调色只在关键处用（数据、标题点缀、hover、按钮），用多了就廉价了。

### 字体（Google Fonts CDN）
- **Display 标题**：`Syne` 700/800 —— 几何感强、有个性
- **等宽/标签**：`JetBrains Mono` —— Builder 身份信号
- **正文**：`Manrope` —— 干净现代
- **中文**：`Noto Sans SC` —— 自动 fallback

### 间距 / 圆角
- 最大内容宽度 `--maxw: 1180px`
- 板块上下 padding `110px`（移动端 `72px`）
- 卡片圆角 `12–16px`

---

## 三、页面结构（Sections）

| # | 板块 | id | 内容 | 状态 |
|---|------|-----|------|------|
| — | 导航 Nav | — | Logo + 锚点链接 + 联系 CTA | ✅ 完成 |
| Hero | 首屏 | `#top` | 姓名 + 打字机副标题 + 简介 + CTA | ✅ 完成 |
| — | 数据条 Stats | — | 4 个核心数据（百万台/TOP1/国内领先/行业首个）| ✅ 完成 |
| 01 | 关于 About | `#about` | 大字标语 + 自述 + Quick Facts 卡片 | ✅ 文字完成 |
| 02 | AI 工具链 | `#stack` | 10 个工具卡片（场景→工具→用途）| ✅ 完成 |
| 03 | 作品集 | `#work` | 筛选器 + 10 个项目卡片 | ⚠️ **缺图片** |
| 04 | 经历 | `#journey` | 4 段时间轴 | ✅ 完成 |
| — | 联系 Contact | `#contact` | 大标题 + 邮箱/电话 | ✅ 完成 |
| — | 页脚 Footer | — | Logo + "Built with vibe coding" | ✅ 完成 |

---

## 四、交互细节（Interactions）

全部用**原生 HTML/CSS/JS**实现，无构建步骤、无依赖，方便部署和扩展：

1. **背景**：CSS 网格漂移动画 + 3 个模糊光晕浮动 + SVG 噪点颗粒层
2. **Hero 标题**：逐行从下往上滑入（`lineUp` 动画）
3. **打字机副标题**：4 句话循环打字（JS `phrases` 数组，可改）
4. **数据计数器**：滚动到视野时从 0 累加（IntersectionObserver）
5. **滚动揭示**：所有 `.reveal` 元素滚动进入视野时淡入上滑，`.d1/.d2/.d3` 控制错峰延迟
6. **作品集筛选**：点击标签按 `data-cat` 过滤卡片
7. **工具卡片光斑**：鼠标移动时跟随的径向光斑（CSS 变量 `--mx/--my`）
8. **卡片 hover**：上浮 + 顶部进度条扫过 + 边框点亮
9. **导航**：滚动后加深背景 + 移动端汉堡菜单

---

## 五、待补充内容（TODO — 交给 Claude Code / Codex）

### 🔴 优先级高
1. **作品集配图**：每张卡片的 `.ph` 占位框需要替换成真实截图/GIF
   - 替换方法：把 `<div class="ph">[ 图片占位 ]</div>` 换成 `<img src="images/xxx.png" style="width:100%;height:96px;object-fit:cover;border-radius:10px;">`
   - 建议素材：模拟器录屏 GIF、产品照片、小程序截图、证书照片、白皮书封面
2. **作品集补充链接**：能公开的项目可以加 `<a href="...">` 跳转到 demo / 视频 / 文章
3. **真实头像**：可以在 Hero 区或 About 区加一张你的照片

### 🟡 优先级中
4. **作品详情页**：点击卡片展开 modal 或跳转独立页面，放更多细节
5. **可交互 Demo 嵌入**：把你做的网页交互模拟器、剧本杀 HTML 直接 iframe 嵌进来——这是最能"秀肌肉"的（让访客直接玩你的作品）
6. **英文版切换**：导航预留了位置，可加 `?lang=en` 或独立 `en.html`

### 🟢 优先级低 / 锦上添花
7. **AI 终端彩蛋**：加一个可交互的「终端」组件，访客输入命令能得到回应（甚至接你的 Hermes Agent / Gemini 代理 API，做成"和我的 AI 分身对话"）
8. **暗/亮主题切换**
9. **访问统计**（如 Umami / Plausible 自托管）

### 给 Claude Code / Codex 的提示词模板
```
这是我的个人网站（index.html）和设计文档（DESIGN.md）。
请帮我：
1. 把作品集第 N 张卡片的图片占位换成 images/xxx.png
2. 给「网页端交互模拟器」卡片加一个 iframe，嵌入 demo/simulator.html
保持现有的 Terminal×Editorial 暗色调风格和 CSS 变量体系，不要引入新的字体或配色。
```

---

## 六、内容来源

网站内容基于：
- 个人 Obsidian 档案（`99_归档/个人/个人档案_胡强斌.md`）
- AI 产品经理简历（含 AI 实战工具链板块）

更新原则：**Obsidian 档案是 single source of truth**，简历和网站都从它取数据。改了档案后，记得同步更新网站对应文字。

---

## 七、文件结构建议

```
chopperh-site/
├── index.html          # 主页（当前文件，自包含）
├── DESIGN.md           # 本设计文档
├── images/             # 作品集图片（待添加）
│   ├── product-line.png
│   ├── simulator.gif
│   └── ...
└── demo/               # 可交互 demo（待添加，可选）
    ├── simulator.html
    └── murder-mystery.html
```
