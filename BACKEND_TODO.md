# 🚀 Roadmap de Migração: Backend Relacional & Google Workspace para o Revisa+

Este documento serve como um guia técnico passo a passo e checklist de tarefas (TODO) para a transição da arquitetura atual do **Revisa+** (Frontend-only + Firebase NoSQL) para uma arquitetura robusta com um **Backend dedicado (Node.js/Express/TypeScript)**, **Banco de Dados Relacional (PostgreSQL)** e **Integrações robustas com o Google Workspace no lado do Servidor**.

---

## 📊 1. Por que Migrar para uma Base Relacional (PostgreSQL)?

A arquitetura NoSQL do Firestore foi excelente para prototipar rapidamente via Google AI Studio. No entanto, para um gerenciador de estudos complexo com revisões espaçadas, grade horária e controle de presença, o modelo relacional traz vantagens críticas:

*   **Integridade Referencial e Cascatas**: Se uma Matéria é excluída, podemos deletar em cascata tópicos, faltas, materiais e revisões via banco de dados, sem precisar de scripts complexos no frontend (`cascadeDeleteService.ts`).
*   **Agregações e Estatísticas complexas**: Calcular o tempo total estudado por matéria, taxa de acerto de questões por tópico e streaks de estudo no Firestore exige duplicar dados ou fazer múltiplas leituras custosas. No PostgreSQL, fazemos isso com queries simples (`JOIN` + `GROUP BY`).
*   **Segurança de Chaves e APIs**: Atualmente, a chave da API do Gemini e o fluxo de chamadas do Google Calendar acontecem no navegador. Mover isso para o backend protege os segredos do app e previne abusos.
*   **Sincronização em Segundo Plano**: Com o backend, podemos ter processos agendados (cron jobs) que sincronizam o Google Calendar e geram revisões mesmo se o usuário estiver com o aplicativo fechado.

---

## 🛠️ 2. Stack Tecnológica Proposta

*   **Linguagem & Runtime**: Node.js com TypeScript (alto reaproveitamento dos tipos existentes e serviços escritos na aplicação).
*   **Framework Web**: Express.js (leve, flexível e rápido de configurar).
*   **ORM (Object-Relational Mapping)**: Prisma ORM (fornece tipagem automática em TypeScript a partir do schema do banco de dados).
*   **Banco de Dados**: PostgreSQL (persistido, relacional, ideal para consultas estruturadas de agendas e desempenho escolar).
*   **Autenticação**: Preservar o Firebase Auth no Frontend para logins e login social, mas validar o token JWT (`idToken`) nas requisições do Backend através de um Middleware com o SDK `firebase-admin`.
*   **Integrações**: `googleapis` (SDK oficial do Google para Node.js) para gerenciar Google Calendar, Drive, Docs e Classroom com segurança no servidor.
*   **IA**: SDK `@google/genai` no Node.js para sintetização de resumos e geração de cadernos de questões.

---

## 🧬 3. Schema Relacional Proposto (Banco de Dados)

Abaixo está o modelo de dados traduzido para tabelas relacionais do PostgreSQL (formato de arquivo `schema.prisma`).

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                   String               @id // UID do Firebase Auth
  email                String               @unique
  nome                 String
  createdAt            DateTime             @default(now()) @map("created_at")
  updatedAt            DateTime             @updatedAt @map("updated_at")
  
  // Google OAuth Tokens (Necessários para sincronização offline/background)
  gcalConnected        Boolean              @default(false) @map("gcal_connected")
  gcalEmail            String?              @map("gcal_email")
  googleRefreshToken   String?              @map("google_refresh_token") // Essencial para renovar token no server
  gcalLastSync         DateTime?            @map("gcal_last_sync")
  gcalTokenStatus      String               @default("disconnected") @map("gcal_token_status")
  gcalLastError        String?              @map("gcal_last_error")

  // Relacionamentos
  preferences          UserPreferences?
  materias             Materia[]
  sessoes              SessaoEstudo[]
  revisoes             Revisao[]
  resumos              Resumo[]
  decks                Deck[]
  cadernos             Caderno[]
  eventosAcademicos    EventoAcademico[]
  notificacoes         Notificacao[]
  gradeFaculdade       GradeFaculdade[]
  bloqueiosAgenda      BloqueioAgenda[]
  tentativas           TentativaQuestao[]

  @@map("users")
}

model UserPreferences {
  id               String   @id @default(uuid())
  userId           String   @unique @map("user_id")
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  preferencesJson  Json     @map("preferences_json") // Armazena as configurações pomodoro, heurísticas, etc.
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("user_preferences")
}

model Materia {
  id               String            @id @default(uuid())
  userId           String            @map("user_id")
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  nome             String
  cor              String
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

  // Relacionamentos
  topicos          Topico[]
  notas            NotaMateria[]
  aulas            Aula[]
  materiais        MaterialEstudo[]
  faltas           FaltaMateria[]
  ocorrenciasGrade OcorrenciaGrade[]
  revisoes         Revisao[]
  resumos          Resumo[]
  eventos          EventoAcademico[]

  @@map("materias")
}

model NotaMateria {
  id          String   @id @default(uuid())
  materiaId   String   @map("materia_id")
  materia     Materia  @relation(fields: [materiaId], references: [id], onDelete: Cascade)
  nome        String
  notaMaxima  Float    @map("nota_maxima")
  notaObtida  Float?   @map("nota_obtida")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("notas_materia")
}

model Topico {
  id            String         @id @default(uuid())
  materiaId     String         @map("materia_id")
  materia       Materia        @relation(fields: [materiaId], references: [id], onDelete: Cascade)
  nome          String
  statusDominio String         @default("iniciante") @map("status_dominio") // iniciante, intermediario, avançado
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  // Relacionamentos
  revisoes      Revisao[]
  resumos       Resumo[]
  sessoesEstudo SessaoEstudo[]

  @@map("topicos")
}

model SessaoEstudo {
  id                    String   @id @default(uuid())
  userId                String   @map("user_id")
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  materiaId             String?  @map("materia_id")
  topicoId              String?  @map("topico_id")
  topico                Topico?  @relation(fields: [topicoId], references: [id], onDelete: SetNull)
  tipo                  String   @default("pomodoro") // pomodoro, cronometro, manual
  tempoEstudadoSegundos Int      @map("tempo_estudado_segundos")
  createdAt             DateTime @default(now()) @map("created_at")

  @@map("sessoes_estudo")
}

model Revisao {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  materiaId    String   @map("materia_id")
  materia      Materia  @relation(fields: [materiaId], references: [id], onDelete: Cascade)
  topicoId     String?  @map("topico_id")
  topico       Topico?  @relation(fields: [topicoId], references: [id], onDelete: SetNull)
  nome         String
  status       String   @default("pendente") // pendente, concluida, atrasada
  dataPrevista DateTime @map("data_prevista")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  eventos      EventoAcademico[]

  @@map("revisoes")
}

model Resumo {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  materiaId String?  @map("materia_id")
  materia   Materia? @relation(fields: [materiaId], references: [id], onDelete: SetNull)
  topicoId  String?  @map("topico_id")
  topico    Topico?  @relation(fields: [topicoId], references: [id], onDelete: SetNull)
  titulo    String
  conteudo  String   @db.Text
  origem    String   @default("manual") // manual, ia
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("resumos")
}

model Deck {
  id         String      @id @default(uuid())
  userId     String      @map("user_id")
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  nome       String
  origem     String      @default("manual") // manual, ia
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")
  flashcards Flashcard[]

  @@map("decks")
}

model Flashcard {
  id               String    @id @default(uuid())
  deckId           String    @map("deck_id")
  deck             Deck      @relation(fields: [deckId], references: [id], onDelete: Cascade)
  frente           String    @db.Text
  verso            String    @db.Text
  
  // Metadados SuperMemo SM-2 (Algoritmo de Spaced Repetition)
  intervalo        Int       @default(0) // Dias até a próxima revisão
  repeticoes       Int       @default(0) // Número de repetições consecutivas corretas
  fatorFacilidade  Float     @default(2.5) @map("fator_facilidade")
  proximaRevisao   DateTime? @map("proxima_revisao")
  
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  @@map("flashcards")
}

model Caderno {
  id            String     @id @default(uuid())
  userId        String     @map("user_id")
  user          User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  nome          String
  descricao     String?
  questoesCount Int        @default(0) @map("questoes_count")
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")
  questoes      Questao[]

  @@map("cadernos")
}

model Questao {
  id           String             @id @default(uuid())
  cadernoId    String             @map("caderno_id")
  caderno      Caderno            @relation(fields: [cadernoId], references: [id], onDelete: Cascade)
  enunciado    String             @db.Text
  tipo         String             @default("multipla_escolha")
  dificuldade  String             @default("media") // facil, media, dificil
  origem       String             @default("manual") // manual, ia
  createdAt    DateTime           @default(now()) @map("created_at")
  updatedAt    DateTime           @updatedAt @map("updated_at")
  
  alternativas AlternativaQuestao[]
  tentativas   TentativaQuestao[]

  @@map("questoes")
}

model AlternativaQuestao {
  id        String   @id @default(uuid())
  questaoId String   @map("questao_id")
  questao   Questao  @relation(fields: [questaoId], references: [id], onDelete: Cascade)
  texto     String
  correta   Boolean  @default(false)

  @@map("alternativas_questao")
}

model TentativaQuestao {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  questaoId String   @map("questao_id")
  questao   Questao  @relation(fields: [questaoId], references: [id], onDelete: Cascade)
  acertou   Boolean
  createdAt DateTime @default(now()) @map("created_at")

  @@map("tentativas_questao")
}

model EventoAcademico {
  id                 String    @id @default(uuid())
  userId             String    @map("user_id")
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  materiaId          String?   @map("materia_id")
  materia            Materia?  @relation(fields: [materiaId], references: [id], onDelete: SetNull)
  revisaoId          String?   @map("revisao_id")
  revisao            Revisao?  @relation(fields: [revisaoId], references: [id], onDelete: SetNull)
  titulo             String
  descricao          String?   @db.Text
  tipo               String    @default("evento") // revisao, prova, trabalho, apresentacao, sessao_estudo, evento_google
  origem             String    @default("sistema") // sistema, google_external
  dataInicio         DateTime  @map("data_inicio")
  dataFim            DateTime  @map("data_fim")
  diaInteiro         Boolean   @default(false) @map("dia_inteiro")
  local              String?
  cor                String?
  concluido          Boolean   @default(false)
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  // Integração Google Calendar
  googleEventId      String?   @map("google_event_id")
  googleCalendarId   String?   @map("google_calendar_id")
  htmlLink           String?   @map("html_link")
  googleStatus       String?   @map("google_status")
  syncStatus         String    @default("pendente") @map("sync_status") // sincronizado, pendente, erro, externo
  lastSyncAt         DateTime? @map("last_sync_at")

  @@map("eventos_academicos")
}

model Aula {
  id        String           @id @default(uuid())
  materiaId String           @map("materia_id")
  materia   Materia          @relation(fields: [materiaId], references: [id], onDelete: Cascade)
  titulo    String
  status    String           @default("agendada") // agendada, assistida, cancelada
  data      DateTime?
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")
  materiais MaterialEstudo[]

  @@map("aulas")
}

model MaterialEstudo {
  id               String   @id @default(uuid())
  materiaId        String   @map("materia_id")
  materia          Materia  @relation(fields: [materiaId], references: [id], onDelete: Cascade)
  aulaId           String?  @map("aula_id")
  aula             Aula?    @relation(fields: [aulaId], references: [id], onDelete: SetNull)
  titulo           String
  tipo             String   @default("link") // link, pdf, doc, slide, video
  url              String
  googleDriveFileId String?  @map("google_drive_file_id") // Arquivo armazenado no drive do usuário
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("materiais_estudo")
}

model Notificacao {
  id        String   @id @default(uuid())
  userId    String   @map("map_user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tipo      String
  titulo    String
  mensagem  String
  lida      Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("notificacoes")
}

model GradeFaculdade {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  titulo     String
  diasSemana Int[]    @map("dias_semana") // Ex: [1, 3, 5] (Seg, Qua, Sex)
  horaInicio String   @map("hora_inicio") // Formato "HH:MM"
  horaFim    String   @map("hora_fim") // Formato "HH:MM"
  ativo      Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("grade_faculdade")
}

model BloqueioAgenda {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  titulo     String
  categoria  String   @default("pessoal")
  horaInicio String   @map("hora_inicio")
  horaFim    String   @map("hora_fim")
  recorrente Boolean  @default(true)
  diasSemana Int[]    @map("dias_semana")
  ativo      Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("bloqueios_agenda")
}

model FaltaMateria {
  id        String   @id @default(uuid())
  materiaId String   @map("materia_id")
  materia   Materia  @relation(fields: [materiaId], references: [id], onDelete: Cascade)
  data      DateTime
  createdAt DateTime @default(now()) @map("created_at")

  @@map("faltas_materias")
}

model OcorrenciaGrade {
  id        String   @id @default(uuid())
  materiaId String   @map("materia_id")
  materia   Materia  @relation(fields: [materiaId], references: [id], onDelete: Cascade)
  data      DateTime
  status    String   @default("normal") // normal, cancelada, reposicao
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("ocorrencias_grade")
}
```

---

## 🛠️ 4. Integrações Google Workspace no Backend

A migração das chamadas para o lado do servidor resolve o problema de expiração de tokens e login intermitente.

### 📅 A. Google Calendar (Background Offline Sync)
*   **Fluxo de Autenticação**: O frontend inicializa o login Google solicitando escopo adicional (`https://www.googleapis.com/auth/calendar.events`) e o consentimento para **acesso offline** (`access_type: 'offline'`, `prompt: 'consent'`). O Google retorna um `code` de autorização de uso único.
*   **Troca de Token no Servidor**: O frontend envia esse `code` para `/api/google/exchange-token`. O backend usa o cliente OAuth2 do Google para trocar o code por um `access_token` e um **`refresh_token`**.
*   **Armazenamento**: O `refresh_token` é salvo na tabela `users` do PostgreSQL.
*   **Sync Assíncrono**: Um job em background (ex: usando `node-cron` ou `bullmq`) roda a cada 15 minutos. Ele pega usuários ativos, atualiza o access token com o `refresh_token` de forma silenciosa e chama a API do Calendar para sincronizar eventos em segundo plano, sem interrupção para o estudante.

### 💾 B. Google Drive (Gerenciador de Materiais)
O `googleDriveService.ts` atualmente é apenas um mock. Com o backend, podemos automatizar o Drive por matéria:
*   **Criação de Pastas Inteligentes**: Quando o usuário cria uma Matéria no Revisa+, o backend cria uma pasta correspondente no Google Drive do usuário (ex: `Revisa+ / [Nome da Matéria]`).
*   **Upload Direto no Backend**: O usuário anexa um slide ou PDF na página da matéria. O frontend faz o upload para o backend, que envia via API do Drive para a pasta correta da matéria e salva a URL e o `googleDriveFileId` na tabela `materiais_estudo`.
*   **Permissões**: O backend gerencia permissões para que apenas o estudante ou possíveis contatos integrados possam ler os arquivos.

### 🎓 C. Google Classroom (Oportunidade de Integração)
*   Podemos adicionar rotas `/api/classroom/courses` para importar turmas, trabalhos (`courseWork`) e materiais escolares direto para as tabelas `materias`, `eventos_academicos` (provas) e `materiais_estudo` de forma automática!

---

## 🧭 5. Lista de Tarefas (TODO) para a Implementação

### 🧱 Fase 1: Setup do Projeto & Boilerplate Backend
- [ ] Criar pasta `backend/` na raiz do projeto.
- [ ] Inicializar projeto TypeScript (`npm init -y` e `npx tsc --init`).
- [ ] Instalar dependências iniciais: `express`, `cors`, `dotenv`, `helmet`, `morgan`, `typescript`, `@types/express`, `@types/node`.
- [ ] Configurar `.env` com chaves locais (Database URL, Firebase Admin credentials, chaves do Google Console).
- [ ] Configurar Docker Compose local com um banco PostgreSQL, ou usar uma instância rápida no Neon/Supabase.

### 📐 Fase 2: Configuração de Banco de Dados & Prisma
- [ ] Instalar `prisma` e `@prisma/client`.
- [ ] Executar `npx prisma init` e copiar o schema acima no arquivo `schema.prisma`.
- [ ] Executar primeira migração: `npx prisma migrate dev --name init` para estruturar o banco de dados.
- [ ] Criar arquivos de serviço do Prisma Client (`backend/src/lib/prisma.ts`).

### 🔐 Fase 3: Autenticação & Segurança (Firebase Admin SDK)
- [ ] Criar conta de serviço no painel do Firebase Developer Console.
- [ ] Baixar o arquivo JSON da chave privada e configurar nas variáveis de ambiente do backend.
- [ ] Instalar `firebase-admin`.
- [ ] Criar o middleware `authMiddleware.ts`:
    - [ ] Extrair o token do cabeçalho `Authorization: Bearer <token>`.
    - [ ] Chamar `admin.auth().verifyIdToken(token)`.
    - [ ] Injetar o `uid` e `email` do usuário no objeto de request do Express para uso nas rotas.
    - [ ] Se o usuário não existir no PostgreSQL (primeiro login), criar o registro automaticamente com base nas informações do token.

### 🛣️ Fase 4: Desenvolvimento de Endpoints da API (CRUDs)
- [ ] **Módulo de Matérias & Tópicos** (`/api/materias`):
    - [ ] `GET /api/materias` - Lista com estatísticas resumidas (como faltas e horas estudadas).
    - [ ] `POST /api/materias` - Cria matéria.
    - [ ] `DELETE /api/materias/:id` - Deleta e remove tudo relacionado em cascata via cascade do DB.
    - [ ] `GET /api/materias/:id/topicos` e CRUD de Tópicos.
- [ ] **Módulo de Sessões de Estudo & Pomodoro** (`/api/sessoes`):
    - [ ] Registrar nova sessão de estudo (tempo em segundos).
    - [ ] Buscar estatísticas e histórico de estudos agrupado por dia/matéria para renderizar os gráficos de `Historico.tsx` e `Dashboard.tsx`.
- [ ] **Módulo de Spaced Repetition (Revisões)** (`/api/revisoes`):
    - [ ] Migrar a lógica do `revisaoService.ts`.
    - [ ] Criar endpoint para atualizar status de revisão.
- [ ] **Módulo de Flashcards & Decks** (`/api/decks`):
    - [ ] CRUD de Decks e Flashcards.
    - [ ] Migrar lógica do algoritmo SM-2 (cálculo de `intervalo`, `repeticoes` e `fatorFacilidade` com base na resposta de qualidade 0-5 do aluno).
- [ ] **Módulo de Questões** (`/api/cadernos`):
    - [ ] CRUD de Cadernos, Questões e Alternativas.
    - [ ] Rota para submeter tentativa de resposta (`POST /api/questoes/:id/tentativa`), computando taxa de erro/acerto instantaneamente.

### 📅 Fase 5: Inteligência de Agendamento (Smart Scheduler)
- [ ] Migrar os algoritmos de `unifiedAvailabilityService.ts` e `smartScheduleService.ts` para o backend.
- [ ] Ajustar consultas para buscar `grade_faculdade`, `bloqueios_agenda` e `eventos_academicos` utilizando o Prisma de forma performática.
- [ ] Disponibilizar o endpoint `POST /api/schedule/suggest` para sugerir melhores horários disponíveis em lote para novos cronogramas de estudo.

### 🌐 Fase 6: Google Workspace & Autenticação OAuth2
- [ ] Configurar credenciais do OAuth2 (Client ID, Client Secret, Redirect URI) no Google Cloud Console.
- [ ] Criar rotas do Google Auth no Backend:
    - [ ] `GET /api/google/auth-url` - Gera link para o frontend abrir popup/consentimento com escopos de Calendar e Drive e `access_type: 'offline'`.
    - [ ] `POST /api/google/exchange-token` - Recebe o code e armazena o `refresh_token` no banco de dados.
    - [ ] `POST /api/google/disconnect` - Limpa tokens no banco.
- [ ] **Google Calendar Servidor**:
    - [ ] Criar serviço do Calendar no backend usando `google.calendar({ version: 'v3', auth: oauth2Client })`.
    - [ ] Automatizar refresh do token caso expire durante a chamada.
    - [ ] Endpoint `/api/calendar/sync` - Executa a sincronização bidirecional completa na hora.
- [ ] **Google Drive Servidor**:
    - [ ] Implementar `googleDriveService` real.
    - [ ] Integrar no endpoint `/api/materias/:materiaId/upload` para enviar arquivos direto para a pasta correspondente no Drive.

### 🧠 Fase 7: Sintetizador de Resumos por IA (Gemini API)
- [ ] Migrar a biblioteca `@google/genai` para o backend.
- [ ] Proteger o token `GEMINI_API_KEY` apenas como variável de ambiente no servidor.
- [ ] Atualizar o método `generateWithAi` de `Resumos.tsx`:
    - [ ] Chamar `/api/resumos/generate-ai`.
    - [ ] Passar matéria, tópico, anotações de aulas e arquivos no Google Drive.
    - [ ] Usar o Gemini (ex: `gemini-2.5-flash`) para criar um resumo formatado em Markdown rico de verdade, em vez da versão mockada atual.

### 🔄 Fase 8: Script de Migração de Dados (Firestore -> Postgres)
- [ ] Criar um script Node.js utilitário (`backend/scripts/migrateFromFirestore.ts`):
    - [ ] Usar `firebase-admin` para ler em lote todas as coleções de todos os usuários.
    - [ ] Mapear as propriedades dos documentos do Firestore para os registros da tabela correspondente no Prisma.
    - [ ] Salvar em transação no PostgreSQL usando `prisma.$transaction()`.
    - [ ] Validar a integridade referencial dos dados migrados.

### 🎨 Fase 9: Refatoração do Frontend & Integração final
- [ ] Criar um cliente HTTP unificado no frontend usando Axios (ou fetch nativo) com interceptor para injetar o header `Authorization: Bearer <firebase_jwt>`.
- [ ] Substituir todas as chamadas diretas de `onSnapshot` / `addDoc` / `updateDoc` do Firestore por chamadas de API do Axios no novo backend.
- [ ] Substituir o fluxo de popup do Google Calendar do frontend para utilizar as rotas de OAuth2 seguro do backend.
- [ ] Realizar testes de ponta a ponta e auditorias de acessibilidade e performance.

---

### 🚀 Fase 10: Estratégia de Deploy Gratuito (Zero Cost)
- [ ] **Frontend (React/Vite)**: Deploy na Vercel (Plano Hobby gratuito), conectando ao repositório GitHub. Configurar variáveis de ambiente apontando para a API do Backend.
- [ ] **Backend (Node.js/Express)**: Deploy no Render.com (Plano Free para Web Services). O serviço entra em sleep após inatividade, mas é ideal para validação e testes gratuitos.
- [ ] **Banco de Dados (PostgreSQL)**: Utilizar o Supabase ou Neon Tech (ambos possuem planos gratuitos robustos). Obter a string de conexão e adicionar ao `.env` do Render.
- [ ] **Cron Jobs**: Utilizar a funcionalidade de cron do Render (se disponível no free tier) ou serviços externos como cron-job.org chamando um endpoint seguro do backend para acionar as sincronizações automáticas em background (Calendar/Revisões).

1. Configure uma instância do PostgreSQL (local ou nuvem).
2. Inicialize o projeto Node.js TypeScript na pasta `backend/`.
3. Valide o middleware de autenticação do Firebase no servidor.
4. Execute o script de migração de dados em ambiente de homologação.
