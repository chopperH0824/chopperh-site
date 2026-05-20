# 网站发布指南

> 你已经有：腾讯云服务器 `43.156.212.118`（新加坡，已装 Nginx + Certbot）+ 阿里云域名 `chopperh.me`（.me 后缀**无需 ICP 备案**，已实名）。
> 之前我们已经跑通了 `api.chopperh.me`（Gemini 小程序代理），现在给个人网站再配一个子域名即可。

发布有两条路，我**推荐方案 A（GitHub Pages）**——免费、零维护、自带 CDN，最适合静态网页。方案 B 用你现成的腾讯云服务器，控制权更高。

---

## 方案 A：GitHub Pages（推荐，免费 + 零维护）

### 1. 建仓库并上传
```bash
# 在网站文件夹里
cd chopperh-site
git init
git add index.html DESIGN.md
git commit -m "personal site v1"

# 在 GitHub 新建一个仓库（比如叫 chopperh-site），然后：
git remote add origin https://github.com/你的用户名/chopperh-site.git
git branch -M main
git push -u origin main
```

### 2. 开启 Pages
GitHub 仓库页 → **Settings** → 左侧 **Pages** → Source 选 `main` 分支 `/ (root)` → Save。
等 1 分钟，会给你一个地址：`https://你的用户名.github.io/chopperh-site/`。

### 3. 绑定你的域名 `chopperh.me`
**a) 在仓库 Settings → Pages → Custom domain** 填入 `me.chopperh.me`（或你想要的子域名），Save。
仓库里会自动生成一个 `CNAME` 文件。

**b) 去阿里云加 DNS 解析**（[阿里云控制台](https://dc.console.aliyun.com/) → 域名解析 → chopperh.me → 添加记录）：

| 类型 | 主机记录 | 记录值 | TTL |
|------|---------|--------|-----|
| CNAME | `me` | `你的用户名.github.io` | 默认 |

> 想用根域名 `chopperh.me`（不带前缀）的话，GitHub 要求加 4 条 A 记录指向 GitHub IP：`185.199.108.153` / `109.153` / `110.153` / `111.153`。但子域名 CNAME 更简单，建议用 `me.chopperh.me`。

**c) 回 GitHub Pages 勾选 "Enforce HTTPS"**（等证书签发，几分钟到半小时）。

完成后访问 `https://me.chopperh.me` 就是你的网站了。以后改内容只要 `git push`，自动更新。

---

## 方案 B：腾讯云服务器（用你现成的服务器）

你的服务器已经装好 Nginx 了，再加一个站点配置即可。

### 1. 上传网站文件到服务器
```bash
# 在本地网站文件夹
scp index.html DESIGN.md root@43.156.212.118:/var/www/chopperh-site/
# 如果目录不存在，先 SSH 上去建：ssh root@43.156.212.118 "mkdir -p /var/www/chopperh-site"
```

### 2. 加阿里云 DNS 解析
[阿里云控制台](https://dc.console.aliyun.com/) → 域名解析 → chopperh.me → 添加记录：

| 类型 | 主机记录 | 记录值 | TTL |
|------|---------|--------|-----|
| A | `me` | `43.156.212.118` | 默认 |

### 3. 配置 Nginx
```bash
sudo nano /etc/nginx/sites-available/chopperh-site
```
粘贴：
```nginx
server {
    listen 80;
    server_name me.chopperh.me;
    root /var/www/chopperh-site;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
    }
}
```
启用并申请 HTTPS：
```bash
sudo ln -s /etc/nginx/sites-available/chopperh-site /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d me.chopperh.me
```

> ⚠️ 记得在**腾讯云控制台 → 防火墙/安全组**放行 **80 和 443 端口**（之前配 api 域名时应该已经放行过了）。

完成后访问 `https://me.chopperh.me`。以后改内容用 `scp` 重新上传即可。

---

## 加速优化（可选）：Cloudflare 免费 CDN

国内访问海外服务器可能慢。可以套一层 Cloudflare（永久免费）：
1. 注册 [Cloudflare](https://dash.cloudflare.com/sign-up)，添加 `chopperh.me`
2. Cloudflare 给你两个 nameserver，回阿里云把 DNS 服务器改成它们
3. 在 Cloudflare 加 CNAME/A 记录指向你的服务器或 GitHub，开启橙色云朵代理
4. SSL/TLS 设为 `Full (Strict)`

> 注：用 Cloudflare 后，DNS 解析就从阿里云转到 Cloudflare 管理了，原来 `api.chopperh.me` 的解析记录也要一起迁过去。

---

## 方案对比

| | GitHub Pages | 腾讯云服务器 |
|---|---|---|
| 成本 | 免费 | 已有服务器 |
| 维护 | 零维护 | 要管 Nginx/证书续期 |
| 更新方式 | `git push` 自动 | `scp` 上传 |
| CDN | 自带全球 CDN | 需自己加 Cloudflare |
| 国内速度 | 中（可加 Cloudflare）| 看服务器位置 |
| 适合 | **静态网页（推荐）** | 需要后端/全栈时 |

---

## 我的建议

1. **先用方案 A（GitHub Pages）+ `me.chopperh.me`** 把网站发出去，最快最省心。
2. 等你后续想加「和我的 AI 分身对话」这种需要后端的功能时，再用方案 B 的服务器跑后端 API（你已经有 `api.chopperh.me` 的 Gemini 代理了，可以复用）。
3. 这样静态前端走 GitHub，动态后端走腾讯云，各司其职。
