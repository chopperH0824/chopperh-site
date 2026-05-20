#!/bin/bash
# 启动本地HTTP服务器来预览网站和demo

echo "启动本地服务器..."
echo "网站地址: http://localhost:8000"
echo "Demo地址: http://localhost:8000/demo/52059-toy/"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

cd /Users/leyang862/Downloads/个人
python3 -m http.server 8000
