#!/bin/bash
echo "Iniciando o Backend (API Python)..."
python3 backend/app.py &
BACKEND_PID=$!

echo "Iniciando o Frontend (React/Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "O Mini-App está rodando! Acesse http://localhost:5173 no seu navegador."
echo "Pressione Ctrl+C para encerrar."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
