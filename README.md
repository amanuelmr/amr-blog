# AMR Blog

A full-stack blogging platform — a REST API and a modern reading/writing client. Write articles in a Medium-style rich-text editor, publish with cover images, and browse a clean editorial feed. Authentication is email-verified (OTP) with JWT access/refresh tokens delivered as httpOnly cookies.

**Monorepo:**

| App | Stack | Purpose |
| --- | --- | --- |
| [`backend/`](./backend) | Node.js · Express 4 · MongoDB (Mongoose) | REST API, auth, uploads, email |
| [`frontend/`](./frontend) | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind | Reader + writer web client |

---

## Features

- **Auth** — register → email OTP verification → login, with password reset and change-password flows. Access/refresh JWTs are stored in **httpOnly cookies**; the API auto-refreshes on expiry.
- **Rich-text authoring** — a Medium-style Tiptap editor (headings, lists, quotes, code, links, inline images via drag/drop/paste) with a distraction-free composer (full-width cover dropzone, borderless title, chip tags).
- **Content safety** — article HTML is sanitized server-side (`xss` allowlist) before it is stored, and again with DOMPurify on render (defense-in-depth).
- **Reading experience** — an editorial home feed (featured lead + numbered list), full article pages with **likes** and threaded **comments**, tag/topic filtering, and full-text **search** with pagination.
- **SEO-friendly URLs** — posts resolve by human-readable **slug** (`/blog/the-quiet-architecture-9f3a1c`) with backward-compatible id lookups.
- **Media** — cover and inline images upload to **Cloudinary**.
- **Transactional email** — verification, password-reset, and welcome emails (table-based, inline-styled, responsive) via Nodemailer.
- **Docs & tests** — OpenAPI/Swagger UI for the API; Jest + Supertest integration tests (in-memory MongoDB) and GitHub Actions CI.
- **Theming** — light/dark, responsive, accessible.

## Tech stack

**Backend:** Express, Mongoose, JSON Web Tokens, bcryptjs, `xss`, Cloudinary + Multer, Nodemailer, Helmet, CORS, express-rate-limit, Zod validation, Swagger (swagger-jsdoc/ui-express), Jest + Supertest + mongodb-memory-server.

**Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS (+ Typography), Tiptap (ProseMirror), isomorphic-dompurify, Geist fonts.

---

## Getting started

### Prerequisites

- **Node.js ≥ 18**
- A **MongoDB** connection string (local or Atlas)
- A **Cloudinary** account (image uploads)
- SMTP credentials for email (the defaults assume Gmail; an app password is recommended)

### 1. Backend

```bash
cd backend
cp .env.example .env      # then fill in the values (see below)
npm install
npm run dev               # starts on http://localhost:$PORT (default 5000)
```

The server **fails fast** if required environment variables are missing or the database is unreachable.

#### Backend environment variables (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no | API port (default `5000`) |
| `NODE_ENV` | no | `development` / `production` / `test` |
| `MONGODB_URI` | **yes** | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | **yes** | Secret for signing access tokens (long, random) |
| `REFRESH_TOKEN_SECRET` | **yes** | Secret for signing refresh tokens (long, random) |
| `EMAIL` | **yes** | SMTP username / from-address |
| `PASSWORD` | **yes** | SMTP password / app password |
| `CLOUDINARY_CLOUD_NAME` | **yes** | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | **yes** | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | **yes** | Cloudinary API secret |
| `CORS_ORIGIN` | no | Allowed origin(s) for the browser client (e.g. `http://localhost:3000`) |
| `FRONTEND_URL` | no | Public frontend URL used to build links in emails |
| `SWAGGER_SERVER_URL` | no | Override the production server URL shown in Swagger |

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL (see below)
npm install
npm run dev                  # http://localhost:3000
```

#### Frontend environment variables (`frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | **yes** | Base URL of the backend API, including `/api/v1` |

> **Port alignment:** `NEXT_PUBLIC_API_URL` must point at the port the backend is running on, e.g. `http://localhost:5000/api/v1` (or `5001` — just start the backend with `PORT=5001` to match). Because auth uses cookies, also set the backend `CORS_ORIGIN` to the frontend origin (`http://localhost:3000`).

---

## API documentation

Interactive Swagger UI is served by the backend at:

```
http://localhost:<PORT>/swagger-ui
```

The frontend footer's **API** link points here automatically (derived from `NEXT_PUBLIC_API_URL`).

### Key endpoints (prefix `/api/v1`)

| Area | Endpoint |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/verify-email`, `/auth/login`, `/auth/refresh-token`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-password` |
| Blogs | `GET /blogs`, `GET /blogs/:slugOrId`, `GET /blogs/search`, `POST /blogs/create`, `PUT /blogs/:id`, `DELETE /blogs/:id`, `POST /blogs/upload-image` |
| Engagement | `POST /blogs/:id/like`, `GET|POST /blogs/:id/comments`, `PUT|DELETE /blogs/:id/comments/:commentId` |

---

## Testing

```bash
cd backend
npm test          # Jest + Supertest against an in-memory MongoDB
```

Coverage includes the auth lifecycle, blog CRUD & authorization, comments/likes, slug resolution, and HTML sanitization. CI runs lint + tests on every push/PR (`.github/workflows/ci.yml`).

## Scripts

**Backend:** `npm run dev` · `npm start` · `npm test` · `npm run lint`
**Frontend:** `npm run dev` · `npm run build` · `npm start` · `npm run lint`

## Project structure

```
amr-blog/
├── backend/
│   ├── config/         # db, cloudinary, env validation
│   ├── controllers/    # auth, blog
│   ├── middlewares/    # auth, validation, rate limiting
│   ├── models/         # User, Blog
│   ├── routes/         # /auth, /blogs
│   ├── utils/          # tokens, OTP, slugify, sanitize, email templates
│   └── tests/          # Jest + Supertest
└── frontend/
    └── src/
        ├── app/          # App Router pages (home, blog/[id], write, auth)
        ├── components/   # editor, feed, article, UI primitives
        ├── context/      # AuthContext
        └── lib/          # api client, types, formatting
```

## License

ISC © AMR Blog
