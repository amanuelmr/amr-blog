# AMR Blog

A full-stack publishing platform — a REST API and a modern reading/writing client. Write in a distraction-free rich-text editor with images, captions and embeds; publish now or on a schedule; and reach readers through an editorial feed, follows, notifications, email subscriptions and RSS. Readers can clap, highlight, comment, and keep their own reading lists. Authentication is email-verified (OTP) with JWT access/refresh tokens delivered as httpOnly cookies.

**Monorepo:**

| App | Stack | Purpose |
| --- | --- | --- |
| [`backend/`](./backend) | Node.js · Express 4 · MongoDB (Mongoose) | REST API, auth, uploads, email |
| [`frontend/`](./frontend) | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind | Reader + writer web client |

---

## Features

- **Auth** — register → email OTP verification → login, with password reset and change-password flows. Access/refresh JWTs are stored in **httpOnly cookies**; the API auto-refreshes on expiry.
- **Rich-text authoring** — a Tiptap editor with a selection toolbar and an insert menu (headings, lists, quotes, code, links, inline images via drag/drop/paste, image **alt text and captions**, and **embeds** from YouTube, Vimeo, CodePen and CodeSandbox) with a distraction-free composer (full-width cover dropzone, borderless title, optional **subtitle**, chip tags, up to 5); code blocks get syntax highlighting and a copy button on render. Unsaved writing is kept locally and offered back after a closed tab, and leaving with unsaved changes asks first.
- **Publishing controls** — save a post as a **draft**, **schedule** it for a future date, or publish immediately; posts are dated and ordered by when they went live. A "Your posts" dashboard lists every post you own regardless of status, with views, claps, comments and shares for live ones.
- **Content safety** — article HTML is sanitized server-side (`xss` allowlist) before it is stored, and again with DOMPurify on render (defense-in-depth). Iframes are allowed only for embed-player URLs on an exact allowlist, and render sandboxed.
- **Reading experience** — an editorial home feed (featured lead + numbered list) with **Latest / Following / For you** tabs, full article pages with an auto-generated **table of contents**, **view counts** (once per reader, never the author's own), **claps** (up to 50 per reader), **highlights** (with the post's top highlight shown to everyone), a **share menu**, threaded **comments** (authors can remove comments on their posts), topic pages, and full-text **search** with pagination.
- **Lists & history** — a default reading list plus any number of named lists, private or public; public lists appear on the owner's profile. A reading history page lists what you've read.
- **Following & notifications** — follow writers and topics; in-app notifications for follows, claps, comments, replies and new posts from writers you follow, with an unread badge in the header.
- **Email subscriptions** — get a writer's new posts by email, including scheduled posts once they go live; every email has a one-click unsubscribe link.
- **Author profiles** — a public `/author/:id` page with a photo, short bio, follower counts, public lists and the author's published posts.
- **SEO-friendly URLs** — posts resolve by human-readable **slug** (`/blog/the-quiet-architecture-9f3a1c`) with backward-compatible id lookups. Each article is server-rendered with its own title, description, canonical URL and Open Graph/Twitter card.
- **Discovery** — RSS feeds for the whole site (`/rss.xml`), each topic (`/tag/:tag/rss.xml`) and each author (`/author/:id/rss.xml`), and a sitemap (`/sitemap.xml`) for feed readers and search engines.
- **Media** — cover, inline and profile images upload to **Cloudinary**.
- **Email** — verification, password-reset, welcome and new-post emails (table-based, inline-styled, responsive) via Resend.
- **Docs & tests** — OpenAPI/Swagger UI for the API; Jest + Supertest integration tests (in-memory MongoDB) and GitHub Actions CI.
- **Theming** — light/dark, responsive, accessible.

## Tech stack

**Backend:** Express, Mongoose, JSON Web Tokens, bcryptjs, `xss`, Cloudinary + Multer, Resend, Helmet, CORS, express-rate-limit, Zod validation, Swagger (swagger-jsdoc/ui-express), Jest + Supertest + mongodb-memory-server.

**Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS (+ Typography), Tiptap (ProseMirror), isomorphic-dompurify, highlight.js, Inter + IBM Plex Mono (via `next/font`).

---

## Getting started

### Prerequisites

- **Node.js ≥ 18**
- A **MongoDB** connection string (local or Atlas)
- A **Cloudinary** account (image uploads)
- A **Resend** account with a verified sending domain (transactional email)

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
| `RESEND_API_KEY` | **yes** | Resend API key ([resend.com/api-keys](https://resend.com/api-keys)) |
| `MAIL_FROM` | no | From-address, must be on a domain verified in Resend (default `AMR Blog <noreply@mail.amanuel.work>`) |
| `CLOUDINARY_CLOUD_NAME` | **yes** | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | **yes** | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | **yes** | Cloudinary API secret |
| `CORS_ORIGIN` | no | Allowed origin(s) for the browser client (e.g. `http://localhost:3000`) |
| `FRONTEND_URL` | no | Public frontend URL used to build links in emails (post and unsubscribe links in new-post emails); set it in production |
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
| `BACKEND_URL` | no | Backend origin the same-origin proxy forwards `/api/*` to; also what server-side code (sitemap, RSS) resolves against when `NEXT_PUBLIC_API_URL` is a relative path |
| `NEXT_PUBLIC_SITE_URL` | no | Public site URL, used to build the absolute links in `sitemap.xml` and `rss.xml` |

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
| Profile | `GET /auth/users/:id` (public profile), `PUT /auth/me` (update your own name/bio/photo) |
| Following | `POST /auth/users/:id/follow`, `GET /auth/me/follows`, `POST /blogs/topics/:tag/follow`, `GET /blogs/following` |
| Email | `POST /auth/users/:id/subscribe`, `POST /auth/unsubscribe` (signed token from the email link) |
| Blogs | `GET /blogs` (optional `?author=`, `?tag=`, `?sort=popular`), `GET /blogs/:slugOrId`, `GET /blogs/search`, `GET /blogs/topics`, `GET /blogs/recommend`, `GET /blogs/mine`, `GET /blogs/bookmarks`, `GET|DELETE /blogs/history`, `POST /blogs/create`, `PUT /blogs/:id`, `DELETE /blogs/:id` |
| Engagement | `POST|DELETE /blogs/:id/clap`, `POST /blogs/:id/like` (legacy; one clap), `POST /blogs/:id/share`, `POST /blogs/:id/bookmark`, `GET|POST /blogs/:id/highlights`, `DELETE /blogs/:id/highlights/:highlightId`, `GET|POST /blogs/:id/comments`, `PUT|DELETE /blogs/:id/comments/:commentId` (replies via `parentComment`) |
| Lists | `GET /lists/mine`, `GET /lists/user/:userId`, `POST /lists`, `GET|PUT|DELETE /lists/:id`, `POST /lists/:id/items` |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read-all`, `POST /notifications/:id/read` |

A post's `status` (`draft`/`published`) and `publishedAt` control visibility — see the `Blog` schema in Swagger for details. A published post with a future `publishedAt` is scheduled and stays hidden until then; only its author can see a draft or a not-yet-due scheduled post.

---

## Testing

```bash
cd backend
npm test          # Jest + Supertest against an in-memory MongoDB
```

Coverage includes the auth lifecycle, profile updates and photos, blog CRUD & authorization, draft/scheduled visibility and publish-date ordering, view counting, threaded comments and moderation, claps, likes, shares, bookmarks, named lists, reading history, highlights, follows and the Following feed, notifications, email subscriptions and new-post announcements, slug resolution, and HTML sanitization including embeds. CI runs lint + tests on every push/PR (`.github/workflows/ci.yml`).

## Scripts

**Backend:** `npm run dev` · `npm start` · `npm test` · `npm run lint`
**Frontend:** `npm run dev` · `npm run build` · `npm start` · `npm run lint`

## Project structure

```
amr-blog/
├── backend/
│   ├── config/         # db, cloudinary, env validation
│   ├── controllers/    # auth, blog, lists, highlights, notifications
│   ├── middlewares/    # auth (required/optional), validation, rate limiting
│   ├── models/         # User, Blog, ReadingList, Highlight, Notification
│   ├── routes/         # /auth, /blogs, /lists, /notifications
│   ├── utils/          # tokens, OTP, slugify, sanitize + embed allowlist, blog visibility,
│   │                   # email templates, notifications, new-post announcements, backfills
│   └── tests/          # Jest + Supertest
└── frontend/
    └── src/
        ├── app/          # App Router pages (home, blog/[id], write, write/mine,
        │                 # bookmarks, lists/[id], history, notifications,
        │                 # author/[id], tag/[tag], settings, unsubscribe, auth,
        │                 # rss.xml + per-author/topic feeds, sitemap.ts)
        ├── components/   # editor, feed, article, comments, highlights, lists,
        │                 # notifications, profile, UI primitives
        ├── context/      # AuthContext, FollowsContext
        └── lib/          # api client, types, formatting, code highlighting, TOC,
                          # embeds, sanitizing, highlight marking, RSS
```

## License

[MIT](./LICENSE) © 2026 Amanuel Mandefrow
