#!/bin/bash
# 一键推送到 GitHub（等何先生给 token 后跑）
# 用法：./push-github.sh <token> [org]
set -eu
TOKEN="${1:?需要 GitHub token（repo + admin:org 权限）}"
ORG="${2:-ziweiai}"
REPO="ziwei-time"

cd "$(dirname "$0")"

echo "[1/4] 建仓库 $ORG/$REPO"
CODE=$(curl -s -o /tmp/gh_create.json -w '%{http_code}' -X POST \
  "https://api.github.com/orgs/$ORG/repos" \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d "{\"name\":\"$REPO\",\"description\":\"真太阳时与时辰换算 —— IANA 时区 / 夏令时 / 均时差 / 晚子时（紫微斗数排盘前置层）\",\"private\":false,\"has_issues\":true,\"has_wiki\":false}")
if [ "$CODE" = "201" ]; then
  echo "  已创建"
elif [ "$CODE" = "422" ]; then
  echo "  仓库已存在，继续推送"
else
  echo "  创建失败 HTTP $CODE"; cat /tmp/gh_create.json; exit 1
fi

echo "[2/4] 配置 remote（临时含 token）"
git remote remove origin 2>/dev/null || true
git remote add origin "https://$TOKEN@github.com/$ORG/$REPO.git"

echo "[3/4] 推送"
git branch -M main
git push -u origin main

echo "[4/4] 清除 remote 中的 token"
git remote set-url origin "https://github.com/$ORG/$REPO.git"
git remote -v

echo
echo "完成：https://github.com/$ORG/$REPO"
echo "注意：token 已从 .git/config 移除，但仍留在 shell history —— 建议在 GitHub 后台轮换一次"
