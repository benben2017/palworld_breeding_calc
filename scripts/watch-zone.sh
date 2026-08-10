#!/bin/bash
# PalBreed zone 激活监控：检测到 active 后自动重试 Pages 自定义域名 + 打印结果
TOKEN=$(tr -d '\n\r ' < /root/.cf_token)
ZONE_ID="bb42d8ca8f95e472c60ab1f06d97eb28"
ACCOUNT_ID="2dce7d665dc2a35133072e6674ee00b7"
LOG="/root/palbreed-dev/zone-watch.log"

for i in $(seq 1 36); do
  STATUS=$(curl -s --max-time 10 -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/zones?name=palbreed.space" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result'][0]['status'] if d.get('success') and d.get('result') else 'error')")
  echo "[$(date '+%H:%M:%S')] zone 状态: $STATUS" | tee -a "$LOG"

  if [ "$STATUS" = "active" ]; then
    echo "🎉 ZONE 已激活！" | tee -a "$LOG"
    # 重新触发 Pages 自定义域名绑定
    curl -s --max-time 10 -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/palbreed/domains" \
      -d '{"name":"palbreed.space"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('Pages 域名:', d.get('success'), d.get('result',{}).get('name',''))" | tee -a "$LOG"
    # 查询 DNS 记录是否自动创建
    curl -s --max-time 10 -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?per_page=10" | python3 -c "
import json,sys
d = json.load(sys.stdin)
if d.get('success'):
    for r in d.get('result', []):
        print(f\"DNS: {r['type']} {r['name']} → {r['content']}\")
else:
    print('DNS 查询无权限(需在后台确认)')
" | tee -a "$LOG"
    exit 0
  fi
  sleep 300
done

echo "⏰ 3 小时后仍未激活，请检查 Spaceship NS 设置" | tee -a "$LOG"
