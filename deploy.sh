#!/bin/bash
set -e
echo "🚀 Deploying Absenin v3.0..."
mkdir -p /var/log/absenin
cd /var/www/absenin
git pull origin main 2>/dev/null || echo "Not a git repo, skipping pull"
cd /var/www/absenin/backend && npm install --production 
cd /var/www/absenin/frontend && npm install && npm run build
cd /var/www/absenin && pm2 restart ecosystem.config.js
sleep 3 && pm2 status
B=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
F=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
echo "Backend:  $B $([ $B = '200' ] && echo '✅' || echo '❌')"
echo "Frontend: $F $([ $F = '200' ] && echo '✅' || echo '❌')"
echo "✅ Deploy complete!"
