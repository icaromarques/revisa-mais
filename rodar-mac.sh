#!/bin/bash

echo "=========================================="
echo "🚀 Iniciando o Revisa+ (Ambiente Local)   "
echo "=========================================="

# 1. Verifica se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
  echo "❌ ERRO: O Docker não está rodando ou não está instalado."
  echo "👉 DICA: Abra o aplicativo 'Docker Desktop' no seu Mac, espere ele ficar verde e rode este script novamente."
  exit 1
fi

echo "📦 1. Subindo o Banco de Dados local (PostgreSQL via Docker)..."
docker-compose up -d

echo "📥 2. Instalando as dependências do projeto..."
npm install

echo "🗄️ 3. Sincronizando as tabelas do Banco de Dados..."
cd apps/backend
# Força a criação das tabelas no banco local recém-criado
npx prisma db push
cd ../..

echo "✨ 4. Tudo pronto! Iniciando o Frontend e o Backend..."
echo "------------------------------------------"
echo "🌐 O Frontend abrirá em: http://localhost:3000"
echo "⚙️ O Backend rodará em: http://localhost:4000"
echo "------------------------------------------"
echo "Pressione CTRL+C para desligar o servidor quando terminar."

npm run dev