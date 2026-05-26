# 图片资产管理规则

> 本文件约束本项目所有 AI 协作者在处理图片时的操作标准。任何新增、修改、上传图片都必须遵循以下规则。

---

## 1. 格式规范

| 场景 | 格式 | 说明 |
|------|------|------|
| 内容图片（照片、截图、产品图） | **WebP** | 统一输出，不使用原始 JPG/PNG |
| Logo / 透明底图 | **WebP**（透明通道）或 **SVG** | PNG → WebP 保留透明度 |
| 视频封面 | **WebP** | 原 PNG/JPG 封面一律转换 |
| SVG 矢量图 | **SVG** | 保持原格式，无需转换 |

**禁止**在 `index.html` 中直接引用 `.jpg` / `.jpeg` / `.png` 格式的 `assets.chopperh.me` 资源。

---

## 2. 压缩质量标准

```
内容图（照片/截图）：  cwebp -q 82  或 Pillow quality=82
封面/展示图（首屏）：  cwebp -q 85  或 Pillow quality=85
Logo（需清晰）：       cwebp -q 88  或 Pillow quality=88
```

**Python 转换命令（无 cwebp 时）：**
```python
from PIL import Image
img = Image.open("input.png").convert("RGB")   # 有透明通道用 .convert("RGBA")
img.save("output.webp", "WEBP", quality=82, method=6)
```

---

## 3. 文件命名规范

- 全英文 / 拼音，小写，用连字符 `-` 分隔，**禁止中文、空格、特殊字符**
- 命名格式：`{项目}-{内容描述}.webp`
- 示例：
  - `hhtu-jd-ai-lineup.webp`（火火兔京东AI产品线）
  - `w1-award.webp`（W1获奖照片）
  - `yxy-store-overview.webp`（颜小芋门店概览）

---

## 4. 上传流程

### 新增图片时必须：
1. **本地转 WebP**（见第2条）
2. **上传到服务器** `root@43.156.212.118:/var/www/assets/images/`
3. **在 index.html 中使用** `https://assets.chopperh.me/images/文件名.webp`
4. **stack-img（叠图）** 使用 `data-src=` 懒加载，不用 `src=`
5. **非首屏图片** 必须加 `loading="lazy"`

```bash
# 上传示例
scp images/my-new-image.webp root@43.156.212.118:/var/www/assets/images/
```

---

## 5. lazy loading 规则

| 图片类型 | 写法 |
|----------|------|
| 首屏关键图（about-photo, hero） | 直接 `src=`，无 loading 属性 |
| 普通内容图（card-image） | `loading="lazy"` |
| 叠图（stack-img） | `src=""` + `data-src="..."` + `loading="lazy"`（由 JS IntersectionObserver 触发） |

---

## 6. 服务器 Nginx 配置说明

- 服务器：`43.156.212.118`，Nginx 静态文件服务
- 资产根目录：`/var/www/assets/`
- CDN 域名：`https://assets.chopperh.me`
- 缓存策略：30天强缓存 + `immutable`
- 已开启 `gzip`（文本类）、`sendfile`、`tcp_nopush`

**修改 Nginx 配置后**必须执行：
```bash
ssh root@43.156.212.118 'nginx -t && systemctl reload nginx'
```

---

## 7. 整理后的文件结构

```
个人/
├── index.html              # 主网站文件
├── CLAUDE.md               # AI 协作指南（如有）
├── IMAGE_RULES.md          # 本文件：图片规范
├── remove_bg.py            # Logo 去背景工具脚本
├── deploy.sh               # GitHub Pages 部署脚本
├── images/
│   └── logos/              # 公司 logo（透明底 WebP/SVG）
│       ├── logo-leyang.png
│       ├── logo-hhtu.png
│       ├── logo-yidao.png
│       ├── logo-yxy.png
│       └── logo-vivo.svg
├── demo/                   # 交互 Demo（iframe 嵌入）
│   └── 52059-toy/
└── worker/                 # Cloudflare Worker 后端
    └── src/index.ts
```

**服务器资产目录** `/var/www/assets/`（通过 `assets.chopperh.me` 访问）：
```
/var/www/assets/
├── toy-ai-hero-poster.webp     # 首屏背景封面图
├── toy-ai-hero-scroll.mp4      # 首屏滚动控制视频
└── images/
    ├── ai-icon.webp                    # 右下角 AI 聊天按钮图标
    ├── chopper-avatar.webp             # Chopper 个人头像
    ├── b3.webp                         # 火火兔京东AI玩具产品线
    ├── f6s-ai.webp                     # F6S-AI 联名故事机
    ├── diy-platform.webp               # AI 智能体 DIY 平台
    ├── elevenlabs-demo.webp            # ElevenLabs prompt 截图
    ├── suno-demo.webp                  # Suno 音乐生成截图
    ├── lovart-demo.webp                # Lovart 视觉生成截图
    ├── chatcut-demo.webp               # ChatCut 剪辑口播视频截图
    ├── science-cert.webp               # 科学技术成果评价证书
    ├── jd-ai-toy-whitepaper.webp       # 京东2025 AI玩具白皮书
    ├── w1-award.webp                   # W1 Kids' Time Star 2026 获奖
    ├── w1-booth.webp                   # W1 波兰展会现场
    ├── w1-product.webp                 # W1 CocoNap 产品宣传图
    └── yxy/                            # 颜小芋项目图集
```
