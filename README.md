# BlameTV 📺

A YouTube-style video platform: watch, upload, import, comment, subscribe — with privacy, security and legal compliance built in.

## Quick start

```bash
npm install
npm run db:push     # create the SQLite database
npm run db:seed     # optional: sample users + videos
npm run dev         # http://localhost:3000
```

**Seeded accounts** (change these immediately in production):
- Admin: `admin@blametv.example` / `ChangeMe123!`
- Demo: `demo@blametv.example` / `ChangeMe123!`

The **first account ever registered automatically becomes an admin**.

## Features

### Watching (no account required)
- Home feed: personalized "Recommended" for signed-in users, Trending for anonymous visitors
- Category filtering, full-text search (title, description, tags)
- Watch page with player, views, likes/dislikes, description, tags
- "Up next" related videos powered by the recommendation engine
- Comments with threaded replies and comment likes

### Accounts & social
- Email/password registration with bcrypt hashing
- Channels: avatar, banner (animated supported), bio, video list
- Subscribe/unsubscribe, subscriber counts
- Watch history (private), playlists (create, add/remove videos), "Save" button on watch page
- In-app notifications (new comments, new subscribers)

### Creating
- **Upload file**: MP4/WebM/OGG/MOV with thumbnail, title, description, category, tags, visibility (Public/Unlisted/Private), upload progress bar
- **Import from link**: paste a YouTube / Vimeo / Dailymotion / Twitch / Streamable URL — streams in an embedded player, zero storage used
- Studio: per-video views/likes/comments, totals, subscriber count, publish/unpublish, delete

### Profile customization
- Static avatars/banners: JPG, PNG, WebP (max 5 MB)
- **Animated avatars**: GIF or animated WebP, **max 5 seconds** (validated server-side)
- **Animated banners**: GIF or animated WebP, **max 10 seconds** (validated server-side)
- Live preview in Settings

### Recommendation algorithm (transparent)
Score = trending gravity + personal affinity:
- **Trending**: `views / (ageHours + 2)^1.4` — fresh + popular wins
- **Tag affinity**: up to +4 based on tags of videos you watched/liked
- **Category affinity**: +0.5 per interaction in that category
- **Subscriptions**: +6 for subscribed channels
- **Already seen**: −8 so the feed stays fresh
- **Related videos**: shared tags ×3, same category +2, same channel +1.5, small trending boost

### Admin
- Site stats, report queue (resolve/dismiss/delete content), user role management

## Security

| Measure | Implementation |
|---|---|
| Password storage | bcrypt, cost 12 — never stored or returned in plain text |
| Sessions | JWT (HS256) in httpOnly, Secure (prod), SameSite=Lax cookie, 7-day expiry |
| Input validation | zod schemas on every API route |
| SQL injection | Prisma parameterized queries only |
| XSS | React escaping, no `dangerouslySetInnerHTML`, strict CSP |
| CSRF | SameSite cookies + JSON-only APIs |
| Rate limiting | Login (10/15min), register (5/hr), uploads (20/hr), comments (10/min), reports (10/hr) per user/IP |
| Upload safety | MIME whitelist, size caps, random filenames, path-traversal-proof file serving |
| Embed safety | URL allowlist (YouTube/Vimeo/Dailymotion/Twitch/Streamable only), CSP `frame-src` |
| Headers | CSP, X-Frame-Options: DENY, nosniff, Referrer-Policy, Permissions-Policy on every response |
| Authorization | Owner-only edit/delete; admin-only moderation; private/unlisted videos enforced server-side |

## Privacy

- Passwords are hashes — unreadable even to admins
- Emails and watch history are never exposed publicly or in APIs
- One cookie total (the session); no trackers, no ads, no third-party analytics
- **Data export**: Settings → "Export my data" downloads everything as JSON (GDPR-style)
- **Account deletion**: Settings → permanent, cascading delete of all content
- Watch history is private per user; studio analytics visible to the owner only

## Legal

- **Terms of Service** — `/legal/terms`
- **Privacy Policy** — `/legal/privacy`
- **Copyright / DMCA** — `/legal/dmca` (takedown + counter-notice process, repeat-infringer termination)
- **Community Guidelines** — `/legal/guidelines`
- **How BlameTV works** — `/about` (feature + algorithm explainer)
- Uploads require a rights-ownership confirmation checkbox
- Reporting flow for all videos and comments

All legal pages are templates with placeholder contacts (`legal@blametv.example`) — replace them with real ones before launching publicly.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4**
- **SQLite** via **Prisma** — swap `DATABASE_URL` for Postgres in production
- **jose** (JWT), **bcryptjs**, **zod**
- Zero paid services required

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file path (or Postgres URL in prod) |
| `SESSION_SECRET` | **Change to a long random string in production** |
| `MAX_UPLOAD_MB` | Max video upload size (default 200) |

## Production notes

1. Generate a strong `SESSION_SECRET` (`openssl rand -hex 32`).
2. Use Postgres instead of SQLite for multi-instance deployments.
3. Serve behind HTTPS (Secure cookie flag activates automatically).
4. For scale, move `uploads/` to object storage (S3/R2) — `src/lib/storage.ts` is the single integration point.
5. Update the contact addresses on all `/legal/*` pages.

## Project structure

```
src/
  app/
    api/          # REST API (auth, videos, comments, channels, me, admin, reports)
    watch/[id]/   # watch page
    channel/[username]/  # channel page
    upload/ studio/ history/ playlists/ settings/ admin/ about/
    legal/        # terms, privacy, dmca, guidelines
  components/     # Header, VideoCard, Comments, WatchActions, ...
  lib/            # db, auth, validation, rate-limit, storage, embed, media, recommend
prisma/
  schema.prisma   # data model
  seed.mjs        # sample data
```
