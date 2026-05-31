# 🤖 AI Agent Strict Context (Rulebook)

**CRITICAL:** Read this file AND `docs/ARCHITECTURE.md` completely BEFORE making any architectural changes, creating new features, or refactoring code. 

You are working on **Revisa+**, a modern EdTech app. The user who created this is an intelligent beginner; they rely on you to be the **Senior Full-Stack Architect**. You must execute commands flawlessly while maintaining strict architectural boundaries.

---

## 1. Absolute Rules
1. **Language:** Communicate with the user in **Brazilian Portuguese (PT-BR)**. Write code comments/docs in **English**.
2. **No Mocks:** The user **hates mocks/stubs**. All features MUST be fully functional, backed by Prisma, and persist to the PostgreSQL database.
3. **Formatting:** NEVER use markdown blocks inside markdown blocks (e.g., nesting code fences incorrectly).
4. **Validation:** Always run lint (`npm run lint` in frontend) and build (`npm run build` in backend) before declaring a task as finished.

---

## 2. Tech Stack Boundaries
- **Monorepo:** Organized with `npm` workspaces. `apps/frontend/` and `apps/backend/`.
- **Frontend:** React 19, Vite, Tailwind v4. It must ONLY communicate with the Backend via REST API (using the wrapper in `apps/frontend/src/lib/api.ts`).
- **Backend:** Node.js, Express, Prisma.
- **Database:** PostgreSQL. All schema changes MUST happen in `apps/backend/prisma/schema.prisma`.

---

## 3. Strict Coding Conventions

### A. Express 5 & Typescript
We use Express 5 with strict TypeScript. `req.params.id` is typed as `string | string[] | undefined`.
**DO NOT** pass `req.params.id` directly to Prisma.
**DO** use the mapper utility:
```typescript
import { asString } from '../utils/responseMapper';
const id = asString(req.params.id);
// Now use `id` safely in Prisma queries.
```

### B. Snake Case vs Camel Case
- Prisma uses `camelCase` (e.g., `materiaId`, `createdAt`).
- The Frontend expects `snake_case` JSON payloads (e.g., `materia_id`, `created_at`).
**DO NOT** manually map objects in every controller.
**DO** use the mapper utility before returning responses:
```typescript
import { toSnakeCase } from '../utils/responseMapper';
res.json(toSnakeCase(materia)); // Automatically deep-converts keys to snake_case
```

### C. No Firebase Client DB
- Firebase is ONLY used for Authentication (`signInWithPopup`).
- **NEVER** import or use `getFirestore`, `doc`, `setDoc`, `onSnapshot` in the frontend. All data operations MUST go through the Node.js backend.

### D. Timezones and Dates
- Always use `date-fns` for date manipulation. Do not rely on native `Date` math (like `date.getTime() + 86400000`).

---

## 4. Standard Workflow for New Features
When asked to create a new feature (e.g., "Add a tagging system"), execute these steps in order:

1. **Database:** Edit `schema.prisma`. Add the new model/fields. Tell the user to run `npx prisma migrate dev --name feature_name` (or you run it using a shell tool).
2. **Backend Controller:** Create `feature.controller.ts`. Write CRUD operations using Prisma. Remember to use `asString` and `toSnakeCase`.
3. **Backend Routes:** Create `feature.routes.ts`, protect with `requireAuth` middleware, and mount it in `index.ts`.
4. **Frontend API:** Add the endpoint calls in `apps/frontend/src/lib/api.ts` or directly in a service file.
5. **Frontend UI:** Build the React components using Tailwind CSS. Use `lucide-react` for icons.

---

## 5. Deployment Info
- Backend builds on **Render.com**. It uses `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`.
- Missing dependencies in the backend `package.json` (like `date-fns`) will break the Render build because it isolates the workspace. Ensure all backend imports are explicitly in `apps/backend/package.json`.
- Frontend builds on **Vercel** (`vite build`). SPA routing is handled by `vercel.json`.