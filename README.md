<div align="center">  
  
  # 📚 Revisa+
  
  ### O seu ecossistema inteligente de planejamento acadêmico e revisão ativa.
  
  [![React Version](https://img.shields.io/badge/React-19.0-blue.svg?logo=react)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?logo=vite)](https://vite.dev)
  [![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.1-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com)
  [![Firebase](https://img.shields.io/badge/Firebase-12.12-FFCA28.svg?logo=firebase)](https://firebase.google.com)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
</div>

---

## ✨ O que é o Revisa+?

O **Revisa+** é um aplicativo premium completo de gestão e otimização de estudos acadêmicos. Ele foi idealizado e construído para criar uma interface do usuário moderna, fluida e reativa com recursos de ponta para ajudar estudantes a organizarem sua rotina, gerenciarem faltas e praticarem lembrança ativa (*Active Recall*).

---

## 🛠️ Recursos Principais do Sistema

O Revisa+ possui uma ampla gama de módulos integrados e dinâmicos:

*   **📊 Dashboard de Desempenho**: Gráficos analíticos inteligentes (usando `recharts`) mostrando estatísticas semanais de estudo, tempo focado, streaks diários e nível de domínio dos assuntos.
*   **🔄 Revisões Espaçadas Inteligentes**: Planejador automático de revisões baseado no nível de domínio de tópicos (`revisaoService.ts`) para maximizar a retenção a longo prazo.
*   **🧠 Banco de Questões & Active Recall**: Módulo de Flashcards (Decks) e Banco de Questões com cronômetro de tentativas, taxas de acerto e histórico analítico individual por caderno.
*   **⏰ Encaixe Inteligente (Smart Scheduler)**: Motor de conflitos e disponibilidade unificada (`unifiedAvailabilityService.ts`) que calcula horários ideais de estudo baseado na grade de aulas, compromissos pessoais e janela de descanso configurada.
*   **📅 Grade de Aulas & Faltas**: Cronograma fixo semanal para acompanhamento acadêmico com diário de presenças e alertas inteligentes de limite de faltas (`FaltasPage.tsx`).
*   **✍️ Resumos Inteligentes**: Acervo de anotações formatadas em Markdown com recursos preparados para síntese por Inteligência Artificial (Gemini).
*   **⏱️ Widgets de Estudo (Pomodoro)**: Widget fixo de estudo com temporizador, cronômetro de foco e configurações flexíveis de ciclos Pomodoro integradas ao estado global da aplicação.
*   **🔗 Sincronização Google Calendar**: Conector seguro (OAuth2 cliente via Firebase) para agendar compromissos, testes e revisões automaticamente no calendário primário do usuário.

---

## 🏗️ Arquitetura Tecnológica Atual

A aplicação está estruturada sob um ecossistema moderno e de alto desempenho no frontend:

1.  **Interface & Estilo**: React 19 (TypeScript), Vite 6 como servidor de desenvolvimento extremamente rápido e **Tailwind CSS v4** com um design system premium de Glassmorphism e Dark Mode dinâmico.
2.  **Transições & Animações**: Motion/React (`motion` / `framer-motion`) para micro-interações extremamente fluidas de feedback visual.
3.  **Persistência & Auth**: Firebase Auth (Autenticação do usuário e fluxos de OAuth) conectado diretamente ao Cloud Firestore (NoSQL) no lado do cliente com regras rígidas de segurança (`firestore.rules`).

---

## 🚦 Executando Localmente

Siga os passos abaixo para rodar o frontend em sua máquina de desenvolvimento.

### Pré-requisitos
*   **Node.js** (versão 18 ou superior recomendada)
*   Gerenciador de pacotes **npm** ou **yarn**

### Passo a Passo

1.  **Clonar o repositório** e entrar no diretório do projeto:
    ```bash
    git clone https://github.com/livialucena/Revisa-.git
    cd Revisa-
    ```

2.  **Instalar as dependências** necessárias:
    ```bash
    npm install
    ```

3.  **Configurar Variáveis de Ambiente**:
    Duplique o arquivo `.env.example` para criar o seu `.env.local` na raiz do projeto:
    ```bash
    cp .env.example .env.local
    ```
    Edite o `.env.local` preenchendo as chaves do seu Firebase SDK e chaves adicionais do Google Developer Console:
    ```env
    VITE_FIREBASE_API_KEY=seu_api_key_aqui
    VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain_aqui
    VITE_FIREBASE_PROJECT_ID=seu_project_id_aqui
    VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket_aqui
    VITE_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_id_aqui
    VITE_FIREBASE_APP_ID=seu_app_id_aqui
    
    # Integrações Google Workspace (Opcional para teste local)
    VITE_GOOGLE_CLIENT_ID=seu_google_client_id_aqui
    ```

4.  **Iniciar o Servidor de Desenvolvimento**:
    ```bash
    npm run dev
    ```
    A aplicação estará acessível em: `http://localhost:3000`

---

## 🚀 Próximos Passos: Transição para Backend Relacional (PostgreSQL)

> [!IMPORTANT]  
> Planejamos evoluir o Revisa+ de uma aplicação baseada em *Firebase Client-Side* para um ecossistema com **Servidor de API Dedicado (Node.js/Express)** e **Banco de Dados Relacional (PostgreSQL)**, trazendo maior controle de segurança, integridade referencial nativa e sincronização em segundo plano robusta com o Google Workspace (Calendar & Drive).

Desenvolvemos um **Roadmap de Migração Completo** com toda a arquitetura de tabelas do Prisma ORM, mapeamento de coleções do Firestore e o checklist de tarefas técnicas necessárias para o desenvolvimento.

👉 **[Acesse o Guia Completo e TODO de Migração do Backend aqui (BACKEND_TODO.md)](file:///Users/livialucena/Documents/GitHub/Revisa-/BACKEND_TODO.md)**
