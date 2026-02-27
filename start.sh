#!/bin/bash
echo "🚀 Starting Absenin v3.0..."
if command -v docker-compose &>/dev/null; then
  docker-compose up -d && sleep 8
  docker-compose exec -T backend node src/config/migrate.js
  echo "✅ Running at http://localhost:3000"
  echo "📧 Superadmin: admin@absenin.com / admin123"
else
  echo "Starting without Docker..."
  cd backend && npm install && npm run db:migrate &
  sleep 5
  cd backend && npm run dev &
  cd frontend && npm install && npm run dev &
  echo "Backend: http://localhost:3001 | Frontend: http://localhost:3000"
  wait
fi
