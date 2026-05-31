# 🤖 Revisa+ AI Agent Context

**Attention AI Agents (Google Gemini, Antigravity, Cursor, etc.):** 
Read this file completely BEFORE making any architectural changes, creating new features, or refactoring code. This file contains the absolute truth about the current state of the Revisa+ project.

---

## 1. Project Identity & Guidelines
- **Language Requirements:** You MUST respond to the user in **Brazilian Portuguese (PT-BR)**.
- **Code Comments:** All comments written inside the code MUST be in **English**.
- **Quality Assurance:** You MUST always execute linting (`npm run lint` in frontend) and build processes to ensure TypeScript correctness before declaring a task as done.
- **Target Audience:** The creator (Lívia) is a beginner who relies on AI to build. Be pedagogical when she asks, but execute with senior-level architectural strictness.

---

## 2. Architecture & Tech Stack

The project transitioned from a Firebase-only (Frontend-direct-to-database) architecture to a robust **Full-Stack Monorepo**.

### Environment
- **Monorepo:** Managed via npm workspaces.
- **Root `package.json`** orchestrates `apps/frontend` and `apps/backend`.

### Frontend (`apps/frontend/`)
- **Framework:** React 19 + Vite 6.
- **Language:** TypeScript (Strict mode).
- **Styling:** Tailwind CSS v4, Framer Motion for animations.
- **Authentication:** Firebase Auth (Client-side). Used ONLY to obtain the Google OAuth Token, which is then sent to the backend.
- **API Communication:** Axios/Fetch wrapper (`apps/frontend/src/lib/api.ts`). We intercept requests to inject the Firebase `idToken` in the `Authorization: Bearer <token>` header.
- **State Management:** React Context API and local state.

### Backend (`apps/backend/`)
- **Runtime:** Node.js + Express.js.
- **Language:** TypeScript.
- **Database ORM:** Prisma (`@prisma/client`).
- **Database Provider:** PostgreSQL (Hosted on Supabase).
- **Security:** Helmet, CORS, Firebase Admin SDK (`express` middleware to validate JWT tokens from the frontend).
- **Architecture:** 
  - `routes/`: Define Express endpoints.
  - `controllers/`: Handle business logic and Prisma interactions.
  - `middlewares/`: Security (e.g., `requireAuth.ts`).
  - `utils/`: Mappers (e.g., converting Prisma's `camelCase` to Frontend's expected `snake_case` using `responseMapper.ts`).

---

## 3. The Great Migration (Context)

Initially, the frontend directly manipulated Firestore documents. **This has been completely eradicated.** 
- All data persistence now happens via the Express backend saving to PostgreSQL via Prisma.
- **Do NOT** use `getFirestore`, `doc`, `setDoc`, `onSnapshot` anywhere in the frontend for business data.
- **Database Schema:** The source of truth is `apps/backend/prisma/schema.prisma`. 

---

## 4. How to Add a New Feature

If you are asked to create a new feature (e.g., "Add a tagging system to flashcards"), you MUST follow this flow:

1.  **Database (Prisma):** 
    - Update `apps/backend/prisma/schema.prisma`.
    - Provide instructions or execute `npx prisma migrate dev --name <feature_name>` to apply changes.
2.  **Backend Logic:**
    - Create/Update the Controller (`apps/backend/src/controllers/...`).
    - Expose the route in `apps/backend/src/routes/...`.
    - Mount the route in `apps/backend/src/index.ts` if it's a new domain.
    - Ensure `req.params.id` is parsed correctly (use `asString` utility from `responseMapper.ts` due to Express 5 type strictness).
    - Map the Prisma output to snake_case using `toSnakeCase()` if expected by the frontend.
3.  **Frontend Logic:**
    - Create the API call in the respective service or directly in the component using the `api` client (`lib/api.ts`).
    - Update the UI to render the new feature.
4.  **Verification:**
    - Run `cd apps/backend && npm run build` to verify backend typing.
    - Run `cd apps/frontend && npm run lint` to verify frontend typing.

---

## 5. Deployment Setup
- **Frontend:** Deployed on Vercel.
- **Backend:** Deployed on Render (Web Service). Uses build command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`.
- **Database:** Supabase PostgreSQL. 

---

## 6. Strict Rules & Gotchas
- **Express 5 Types:** `req.params.id` can be typed as `string | string[]`. Always cast it or use the utility `asString(req.params.id)` before passing it to Prisma.
- **Date Handling:** We use `date-fns`. Always ensure timezone-aware operations, especially for the "Grade" and "Sessões" features.
- **Frontend Mocks:** DO NOT CREATE MOCKS. The user explicitly hates mocks. Always connect the frontend to the real backend API.
- **Deployment Build:** The backend's `package.json` must have essential packages (like `date-fns`) in `dependencies`, not relying entirely on hoisted monorepo dependencies, because Render isolates the build.
