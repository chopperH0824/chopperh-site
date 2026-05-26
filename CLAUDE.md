# CLAUDE.md — AI 协作指南

> 本文件为 AI 协作者（Claude Code 等）提供项目快速上手信息。

## 项目概览

个人作品集网站，单页 HTML。部署在 **GitHub Pages**（主站），静态资产在**腾讯云服务器**（`assets.chopperh.me`）。

- 主文件：`index.html`（约 2600+ 行，CSS/JS 全部内嵌）
- GitHub 仓库：`https://github.com/chopperH0824/chopperh-site`
- 线上地址：`https://me.chopperh.me`
- 资产服务器：`root@43.156.212.118`，资产目录 `/var/www/assets/`
- CDN：`https://assets.chopperh.me`

## 开发流程

```bash
# 本地预览
python3 -m http.server 8080

# 部署：改完 index.html 后
git add index.html
git commit -m "描述"
git push origin main   # GitHub Pages 自动更新，约1分钟生效
```

## 图片资产规范

**必读：** 详见 [`IMAGE_RULES.md`](IMAGE_RULES.md)

核心要点：
- 所有图片统一用 **WebP** 格式
- 新图片先在本地转 WebP，再 `scp` 到服务器，再在 HTML 里引用
- 非首屏图加 `loading="lazy"`，叠图（stack-img）用 `data-src=` 懒加载

## 服务器操作

```bash
# SSH
ssh root@43.156.212.118

# 上传文件
scp local-file.webp root@43.156.212.118:/var/www/assets/images/

# 检查 Nginx
nginx -t && systemctl reload nginx
```

## 代码结构

| 位置 | 内容 |
|------|------|
| `<style>` (行 1–630 左右) | 全部 CSS，含变量、组件、动画 |
| `<!-- NAV -->` 到 `</body>` | 页面 HTML 结构 |
| `<script>` (行 1990+ ) | 全部 JS：滚动、TTS、聊天、动画 |

## 关键 Section 说明

| id | 内容 |
|----|------|
| `#top` (hero) | 首屏，含浮动公司 logo 快跳导航 |
| `#about` | 关于我，两栏布局 |
| `#stack` | AI 工具链 |
| `#work` | 作品集，含 filter 标签 |
| `#journey` | 工作经历，exp-card 卡片 |
| `#contact` | 联系方式 |

## 后端 Worker

`worker/src/index.ts` 部署在 Cloudflare Workers（`aichat.chopperh.me`）：
- `/chat` — LLM 对话（MiMo 模型）
- `/tts` — 语音合成（MiMo-V2.5-TTS）

修改 Worker 后需要 `wrangler deploy`。

## 素材暂存区

`next/` 文件夹是本地素材中间站，见 `next/README.md` 了解每个文件的状态和用途。**`next/` 不进 git。**
