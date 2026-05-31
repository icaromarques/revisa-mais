# 🚀 Tutorial de Deploy Gratuito (Zero Cost) para o Revisa+

Este guia passo a passo foi criado para que você consiga subir a infraestrutura completa do **Revisa+** na internet sem gastar nada, utilizando plataformas modernas com ótimos planos gratuitos (Free Tier).

Vamos dividir o processo em 3 partes: Banco de Dados, Backend e Frontend.

---

## 🗄️ Parte 1: Banco de Dados (Supabase)

O Supabase oferece um PostgreSQL gerenciado excelente e com interface amigável.

1. **Acesse** o site [Supabase](https://supabase.com/) e faça login (pode usar sua conta GitHub).
2. Clique em **"New Project"** (Novo Projeto).
3. **Configure o projeto**:
   - **Name**: `revisa-db` (ou o nome que preferir)
   - **Database Password**: Crie uma senha **MUITO FORTE** e guarde-a em um lugar seguro. Você precisará dela.
   - **Region**: Selecione uma região próxima de você (ex: `South America (São Paulo)`).
4. Clique em **"Create new project"**. (Pode levar de 1 a 2 minutos para o banco de dados ser provisionado).
5. **Pegue a String de Conexão (DATABASE_URL)**:
   - No menu lateral esquerdo, clique no botão verde **Connect** no topo da tela (ou em Project Settings -> Database).
   - No painel que abrir, selecione a aba **Node.js** (ou ORMs -> Prisma).
   - Copie a **Transaction Pooler string** (NÃO use a Direct Connection / porta 5432).
   - Você verá uma URL parecida com: 
     `postgresql://postgres.[sua-ref]:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
   - Copie essa URL. Lembre-se de substituir `[YOUR-PASSWORD]` pela senha que você acabou de criar no passo 3. Essa será a sua `DATABASE_URL` no Backend.
   - **MUITO IMPORTANTE:** Ao colar essa URL no Render, adicione `?pgbouncer=true&connection_limit=1` no final dela. Sem isso, o Prisma pode falhar na hora de criar as tabelas (migrate) no Render.

*(Não é necessário criar as tabelas manualmente no Supabase. O nosso backend com o comando `npx prisma migrate deploy` fará isso automaticamente para você!).*

---

## ⚙️ Parte 2: Backend (Render.com)

O Render é ótimo para hospedar APIs Node.js de forma gratuita.

1. **Acesse** o site [Render.com](https://render.com/) e faça o login com seu GitHub.
2. Certifique-se de que o código do Revisa+ está commitado e *pushed* (enviado) para o seu repositório no GitHub.
3. No painel do Render, clique em **"New +"** e selecione **"Web Service"**.
4. Selecione **"Build and deploy from a Git repository"** e clique em Next.
5. Conecte sua conta do GitHub (se ainda não fez) e **selecione o repositório** do Revisa+.
6. **Configure o Web Service**:
   - **Name**: `revisa-backend`
   - **Root Directory**: Digite `apps/backend` (Isso diz ao Render para focar apenas na pasta do backend).
   - **Environment**: Selecione `Node`.
   - **Build Command**: Digite `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: Digite `npm run start` (ou `node dist/index.js`).
   - **Importante**: confirme que o Render está apontando para o repositório/branch com os commits mais recentes (ex.: `icaromarques/revisa-mais`, branch `main`). Deploys em commits antigos falham no `tsc`.
7. **Instance Type**: Certifique-se de que está selecionada a opção **Free**.
8. **Configurar as Variáveis de Ambiente (Environment Variables)**:
   Role um pouco para baixo e clique em **"Advanced"**, depois em **"Add Environment Variable"**. Adicione exatamente estas chaves:
   - `DATABASE_URL` -> Cole a URL do Supabase (aquela que você colocou a senha).
   - `JWT_SECRET` -> Crie uma senha aleatória para segurança (Ex: `sua-senha-super-secreta-revisa-123`).
   - `GOOGLE_CLIENT_ID` -> Copie a chave que você gerou lá no Google Console.
   - `GOOGLE_CLIENT_SECRET` -> Copie a chave secreta gerada no Google Console.
   - `FRONTEND_URL` -> Vamos precisar atualizar essa variável **DEPOIS**, quando tivermos a URL da Vercel. Por hora, coloque um valor temporário, ou se já tiver a URL do Vercel planejada, insira.
   - `GOOGLE_REDIRECT_URI` -> Ex: `https://revisa-backend.onrender.com/api/auth/google/callback` (Substitua "revisa-backend" pela URL real que o Render vai gerar para o seu serviço).
9. Clique em **"Create Web Service"**.
10. O Render começará a fazer o build. Anote a **URL do backend** que o Render forneceu no canto superior esquerdo (ex: `https://revisa-backend-xyz.onrender.com`).
11. **IMPORTANTE**: Após o build terminar e a URL estiver pronta, lembre-se de ir no seu projeto no **Google Cloud Console**:
    - Vá na tela do seu Cliente OAuth2.
    - Em **"URIs de redirecionamento autorizados"**, ADICIONE a URL do seu backend no Render: `https://[URL-DO-RENDER]/api/auth/google/callback`.

---

## 🎨 Parte 3: Frontend (Vercel)

A Vercel é a melhor plataforma para frontends em React/Vite.

1. **Acesse** [Vercel.com](https://vercel.com/) e faça login com seu GitHub.
2. Clique em **"Add New..."** e selecione **"Project"**.
3. Na seção "Import Git Repository", encontre o repositório do Revisa+ e clique em **"Import"**.
4. **Configure o Projeto**:
   - **Project Name**: `revisa-app`
   - **Framework Preset**: Selecione `Vite`.
   - **Root Directory**: Clique em *Edit* e selecione a pasta `apps/frontend`.
5. **Configurar as Variáveis de Ambiente (Environment Variables)**:
   Abra a sanfona "Environment Variables" e adicione:
   - `VITE_API_URL` -> A URL do seu backend no Render gerada na Parte 2 (ex: `https://revisa-backend-xyz.onrender.com/api`).
6. Clique em **"Deploy"**.
7. Após alguns minutos, a Vercel gerará a URL de produção do seu site (ex: `https://revisa-app.vercel.app`).

---

## 🔄 Passos Finais (Amarrando tudo)

Com tudo rodando, precisamos de 2 passos finais de configuração:

1. **Vá ao Google Cloud Console**:
   - Entre nas configurações do seu Cliente OAuth2.
   - Em **"Origens JavaScript autorizadas"**, adicione a sua **URL do Frontend na Vercel** (ex: `https://revisa-app.vercel.app`). Isso permite que o pop-up de login abra sem bloquear por segurança.
2. **Vá ao Painel do Render (Backend)**:
   - Acesse a aba **Environment** do seu Web Service.
   - Edite a variável `FRONTEND_URL` e cole a URL do seu Frontend na Vercel (ex: `https://revisa-app.vercel.app`). Isso ajusta o CORS para a nuvem.

### Pronto! 🎉
Sua infraestrutura full-stack (Front, Back e Database relacional) está no ar com 100% de gratuidade e alta resiliência!
