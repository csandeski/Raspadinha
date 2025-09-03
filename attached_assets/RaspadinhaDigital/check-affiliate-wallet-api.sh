#!/bin/bash

# Login as affiliate to get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/affiliate/login \
  -H "Content-Type: application/json" \
  -d '{"email":"afiliado@maniabrasil.com","password":"123456"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to login as affiliate"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in as affiliate"
echo "Token: ${TOKEN:0:20}..."

# Get earnings
echo -e "\n=== AFFILIATE EARNINGS ==="
curl -s http://localhost:5000/api/affiliate/earnings \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30

# Get wallet info
echo -e "\n=== AFFILIATE WALLET ==="
curl -s http://localhost:5000/api/affiliate/wallet \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || echo "No wallet endpoint"

# Get recent transactions
echo -e "\n=== RECENT TRANSACTIONS ==="
curl -s http://localhost:5000/api/affiliate/earnings \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'Total Earnings: R$ {data.get(\"totalEarnings\", 0):.2f}')
print(f'Available Balance: R$ {data.get(\"availableBalance\", 0):.2f}')
print(f'Pending Earnings: R$ {data.get(\"pendingEarnings\", 0):.2f}')
print(f'Completed Earnings: R$ {data.get(\"completedEarnings\", 0):.2f}')
if 'wallet' in data:
    wallet = data['wallet']
    print(f'\\nWallet Balance: R$ {wallet.get(\"balance\", 0):.2f}')
    print(f'Total Earned: R$ {wallet.get(\"totalEarned\", 0):.2f}')
    print(f'Total Withdrawn: R$ {wallet.get(\"totalWithdrawn\", 0):.2f}')
"
