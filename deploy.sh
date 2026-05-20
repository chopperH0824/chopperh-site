#!/bin/bash
# 部署个人网站到GitHub Pages

set -e

echo "=== 个人网站部署脚本 ==="
echo ""

# 检查是否已初始化Git
if [ ! -d ".git" ]; then
    echo "1. 初始化Git仓库..."
    git init
    git add index.html DESIGN.md DEPLOY.md demo/
    git commit -m "personal site v1 with calculator demo"
else
    echo "1. Git仓库已存在，更新文件..."
    git add index.html DESIGN.md DEPLOY.md demo/
    git commit -m "update site with calculator demo" || echo "没有新的更改需要提交"
fi

echo ""
echo "2. 请在GitHub创建仓库（如果还没有）："
echo "   - 仓库名：chopperh-site"
echo "   - 设为Public"
echo "   - 不要初始化README"
echo ""
read -p "请输入你的GitHub用户名: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "错误：GitHub用户名不能为空"
    exit 1
fi

echo ""
echo "3. 添加远程仓库..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${GITHUB_USERNAME}/chopperh-site.git"

echo ""
echo "4. 推送到GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "=== 部署完成！==="
echo ""
echo "接下来请："
echo "1. 访问 https://github.com/${GITHUB_USERNAME}/chopperh-site"
echo "2. 进入 Settings → Pages"
echo "3. Source选择 'main' 分支 '/ (root)'，点击Save"
echo "4. 等待1分钟后访问: https://${GITHUB_USERNAME}.github.io/chopperh-site/"
echo ""
echo "绑定自定义域名 me.chopperh.me："
echo "1. 在Settings → Pages → Custom domain填入: me.chopperh.me"
echo "2. 在阿里云添加CNAME记录: me → ${GITHUB_USERNAME}.github.io"
echo "3. 回GitHub勾选 'Enforce HTTPS'"
echo ""
echo "详细步骤请参考 DEPLOY.md"
