#!/bin/bash

echo "🚀 Iniciando Projeto Fullstack..."
echo ""
echo "📦 Backend rodando em: http://localhost:5000"
echo "⚛️  Frontend rodando em: http://localhost:5173"
echo ""

# Iniciar backend
npx tsx server/index.ts &

# Aguardar um pouco
sleep 2

# Iniciar frontend
npx vite --host 0.0.0.0 --port 5173

echo "✅ Projeto iniciado com sucesso!"