#!/bin/bash
# MyCandler 시작 스크립트

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🗓  MyCandler 시작 중..."

# Backend
echo "▶ Backend (FastAPI) 시작..."
cd "$ROOT_DIR/backend"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait a moment for backend
sleep 2

# Frontend
echo "▶ Frontend (Next.js) 시작..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 서버가 시작되었습니다:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "종료하려면 Ctrl+C 를 누르세요."

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
