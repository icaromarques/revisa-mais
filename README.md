<div align="center">  
  
  # 📚 Revisa+
  
  ### O ecossistema inteligente de planejamento acadêmico e revisão ativa.
  
  [![React Version](https://img.shields.io/badge/React-19.0-blue.svg?logo=react)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?logo=vite)](https://vite.dev)
  [![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.1-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)
  [![Node.js](https://img.shields.io/badge/Node.js-Express-339933.svg?logo=nodedotjs)](https://nodejs.org)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1.svg?logo=postgresql)](https://www.postgresql.org)
</div>

---

## ✨ O que é o Revisa+?

O **Revisa+** é um aplicativo premium completo de gestão e otimização de estudos acadêmicos. Ele foi idealizado para oferecer uma interface moderna, fluida e reativa, acoplada a um backend relacional robusto para ajudar estudantes a organizarem sua rotina, gerenciarem faltas e praticarem lembrança ativa (*Active Recall*).

---

## 🛠️ Recursos Principais

*   **📊 Dashboard Analítico**: Gráficos inteligentes mostrando estatísticas de estudo, tempo focado, streaks diários e nível de domínio.
*   **🔄 Revisões Espaçadas**: Planejador automático de revisões para maximizar a retenção a longo prazo (Algoritmo SM-2).
*   **🧠 Active Recall**: Módulo de Flashcards e Banco de Questões com histórico analítico.
*   **⏰ Smart Scheduler**: Motor de conflitos que calcula horários ideais de estudo baseado na sua grade de aulas e compromissos pessoais.
*   **📅 Grade de Aulas**: Cronograma semanal com diário de presenças e alertas inteligentes de limite de faltas.
*   **✍️ Resumos com IA**: Acervo de anotações integradas a Inteligência Artificial (Google Gemini) para síntese automática.

---

## 🏗️ Arquitetura do Sistema

O projeto é um **Monorepo Full-Stack** dividido em Frontend e Backend.

Para desenvolvedores e agentes de IA, a documentação detalhada da arquitetura e fluxos de dados está centralizada na pasta `docs/`.

👉 **[Ver Documentação de Arquitetura (Mermaid Diagrams)](docs/ARCHITECTURE.md)**
👉 **[Ler Manual de Contexto para IAs (Regras Estritas)](docs/AI_AGENT_CONTEXT.md)**
👉 **[Guia para a Criadora (Iniciantes)](docs/GUIA_DA_LIVIA.md)**

---

## 🚦 Executando Localmente

Siga os passos abaixo para rodar o ecossistema inteiro na sua máquina.

### Pré-requisitos
*   **Node.js** (versão 20+ recomendada)
*   **PostgreSQL** rodando localmente na porta 5432 (ou uma URL remota do Supabase)

### Passo a Passo

1.  **Clonar o repositório**:
    ```bash
    git clone https://github.com/icaromarques/revisa-mais.git
    cd revisa-mais
    ```

2.  **Instalar todas as dependências** (na raiz do monorepo):
    ```bash
    npm install
    ```

3.  **Configurar Variáveis de Ambiente**:
    
    No Backend (`apps/backend/`):
    Crie o arquivo `.env`:
    ```env
    DATABASE_URL="postgresql://postgres:password@localhost:5432/revisa?schema=public"
    JWT_SECRET="sua_chave_secreta"
    FRONTEND_URL="http://localhost:3000"
    ```

    No Frontend (`apps/frontend/`):
    Crie o arquivo `.env.local` com as chaves do Firebase (para a tela de Login Google) e a URL da API:
    ```env
    VITE_API_URL="http://localhost:4000/api"
    VITE_FIREBASE_API_KEY="sua_chave_aqui"
    # ... adicione o restante das chaves do Firebase
    ```

4.  **Preparar o Banco de Dados (Backend)**:
    ```bash
    cd apps/backend
    npx prisma migrate dev --name init
    ```

5.  **Rodar o Projeto**:
    Na pasta raiz do projeto, inicie os dois servidores ao mesmo tempo:
    ```bash
    npm run dev
    ```
    *   O Frontend estará em: `http://localhost:3000`
    *   A API estará em: `http://localhost:4000`

---

## 🚀 Deploy em Produção

O projeto está otimizado para deploy *Zero Cost* usando:
- **Vercel** para o Frontend.
- **Render** para o Backend Node.js.
- **Supabase** para o Banco de Dados PostgreSQL.

Consulte o arquivo **[`DEPLOY_TUTORIAL.md`](DEPLOY_TUTORIAL.md)** para o passo a passo completo de hospedagem.