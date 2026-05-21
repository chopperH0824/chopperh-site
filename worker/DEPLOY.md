# Cloudflare Worker 部署指南

## 前置准备

1. 注册/登录 Cloudflare 账号：https://dash.cloudflare.com
2. 安装 Node.js（如果还没有）
3. 安装 Wrangler CLI：
   ```bash
   npm install -g wrangler
   ```

## 部署步骤

### 1. 登录 Cloudflare

```bash
wrangler login
```

### 2. 创建 KV 命名空间

用于存储记忆文件：

```bash
wrangler kv namespace create MEMORY
```

记录返回的 `id`，后面需要用到。

### 3. 上传记忆文件到 KV

```bash
wrangler kv key put --binding=MEMORY "memory.md" --path="../memory.md"
```

### 4. 配置环境变量

在 Cloudflare Dashboard 中设置 API 密钥：

1. 访问 https://dash.cloudflare.com
2. 选择你的 Worker
3. 进入 **Settings** → **Variables**
4. 添加环境变量：
   - **Variable name**: `MIMO_API_KEY`
   - **Value**: 你的小米 mimo-2.5 API 密钥
   - 勾选 **Encrypt** 加密存储

### 5. 更新 wrangler.toml

编辑 `wrangler.toml` 文件，添加 KV 命名空间配置：

```toml
[[kv_namespaces]]
binding = "MEMORY"
id = "你的KV命名空间ID"
```

### 6. 部署 Worker

```bash
wrangler deploy
```

部署成功后，会显示 Worker 的 URL，类似：
```
https://hu-qiangbin-ai-chat.your-subdomain.workers.dev
```

### 7. 更新网站配置

在网站的 JavaScript 中，将 API 地址更新为你的 Worker URL。

## 测试 Worker

```bash
curl -X POST https://hu-qiangbin-ai-chat.your-subdomain.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"message": "你好，介绍一下胡强斌"}'
```

## 更新记忆文件

当需要更新记忆文件时：

1. 修改本地的 `memory.md` 文件
2. 重新上传到 KV：
   ```bash
   wrangler kv key put --binding=MEMORY "memory.md" --path="../memory.md"
   ```

## 注意事项

- API 密钥存储在 Cloudflare 的环境变量中，不会暴露到前端
- Worker 免费额度：每天 10 万次请求，足够个人网站使用
- 首次部署可能需要几分钟生效
