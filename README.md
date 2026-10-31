# VaultDesk: workspace facilities & meeting-room booking

A facilities app for a coworking / campus operator: a live **room calendar** for every building, booking with
no double-booking, **manager approvals** for big rooms, **maintenance** tickets that can take a room out of
service, and email confirmations, reminders and decisions sent in the background.

**Stack:** Django 5 · Django REST Framework · JWT auth · PostgreSQL · Celery + Redis · React 18 (Vite) ·
Zustand · Bun · Docker Compose · GitHub Actions CI

---

## Features

- **Calendar**: rooms × hours grid per building, with a live "now" line. Click an empty slot to book it, click a booking for details or to cancel. Header stats: rooms in use now, bookings today (pending, out of service), next free room.
- **Buildings** sidebar filter, kept in the URL (`?building=2`) so it survives refresh and can be shared
- **Rooms** list with type and capacity filters, amenities, approval badges; room page with a day availability bar
- **Booking rules**: opening hours, no past times, 30 min–12 h, attendees ≤ capacity, room not out of service, **no overlaps**
- **Race-safe**: two people booking the same slot at the same moment can't both win (`SELECT … FOR UPDATE`)
- **Approvals**: rooms flagged `requires_approval` create *pending* bookings that hold the slot; managers approve or decline
- **Room management** (managers): add rooms, edit them, switch "needs approval" on or off, hide a room without losing its history
- **Maintenance**: anyone can report an issue; managers move it open → in progress → resolved; "blocks booking" issues take the room out of service
- **Emails via Celery**: confirmation, reminder 30 min before, request received, declined, cancelled
- JWT auth with token refresh (one shared refresh for parallel 401s); member vs manager roles
- Search box filters rooms everywhere; sidebar badges for upcoming bookings, open issues and pending approvals
- 52 backend tests + 13 frontend tests, run in CI against real PostgreSQL

## Frontend state: what lives where

| State | Where | Why |
|---|---|---|
| Logged-in user, session | Zustand `authStore` | Needed everywhere; no Provider, components pick slices with selectors |
| Sidebar badge counts | Zustand `summaryStore` | Any page can call `refresh()` after an action; reloads itself on login/logout |
| Search text | Zustand `uiStore` | Shared by the top bar and the pages |
| Selected building | URL `?building=` | Survives refresh, works with back/forward, shareable |
| Server data (rooms, bookings) | `useApi` hook per page | Fetched where it's used; stale requests are cancelled |
| Form inputs | `useState` in the form | Local to one component |

## Architecture

```
React (Vite)  ──/api──▶  Django + DRF  ──▶  PostgreSQL
                              │
                              └──▶ Redis ──▶ Celery worker ──▶ email
```

Each Django app is split by responsibility:

| File | Job |
|---|---|
| `models.py` | Tables, constraints and indexes |
| `serializers.py` | Validate input and shape JSON output (no business rules) |
| `selectors.py` | Read queries (`select_related` to avoid N+1) |
| `services.py` | Write-side business rules (create/cancel booking, transactions, locking) |
| `views.py` | Thin HTTP layer: validate → call service/selector → respond |
| `pricing.py` / `notifications.py` | Pluggable policies behind interfaces |
| `dependencies.py` | The one place that picks concrete implementations |

### SOLID in this codebase

- **S**ingle responsibility: `BookingService` only holds booking rules. Pricing, notifying, querying and HTTP each live in their own module.
- **O**pen/closed: new pricing (peak hours, member discounts) = a new `PricingPolicy` class; `BookingService` doesn't change.
- **L**iskov: any notifier (`CeleryBookingNotifier`, the tests' `FakeNotifier`) can replace another.
- **I**nterface segregation: small interfaces (`PricingPolicy.price_for`, `BookingNotifier.booking_confirmed/cancelled`).
- **D**ependency inversion: `BookingService` receives pricing and notifier in its constructor; `dependencies.py` wires the real ones.

## Database schema

```
auth_user 1──* bookings_booking *──1 spaces_space *──1 spaces_location
     │                │ reviewed_by          │
     └──────* maintenance_issue *────────────┘
```

- `Location`: name (unique), city, address, opens_at, closes_at · check closes_at > opens_at
- `Space`: location FK, name, kind (desk/meeting_room/classroom/auditorium/quiet_room/cabin), capacity, hourly_price (Decimal), amenities (JSON list), requires_approval, is_active · unique (location, name)
- `Booking`: user FK, space FK (PROTECT), title, attendees, start_at, end_at, status (pending/confirmed/rejected/cancelled), total_price, reviewed_by FK · checks end_at > start_at, attendees ≥ 1 · indexes (space, start_at), (user, -start_at), (status, start_at)
- `Issue`: space FK, reported_by FK, title, description, priority, status, blocks_booking, resolved_at · index (status, space)

All times are stored in UTC and shown in Asia/Kolkata.

## API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register/` | – | Create account |
| POST | `/api/auth/token/` | – | Login → access + refresh JWT |
| POST | `/api/auth/token/refresh/` | – | New access token |
| GET | `/api/auth/me/` | ✔ | Current user |
| GET | `/api/locations/` | – | All centres (cached 5 min) |
| GET | `/api/spaces/?location=&kind=&min_capacity=` | – | Active spaces, paginated |
| GET | `/api/spaces/{id}/` | – | One space |
| POST | `/api/spaces/` | manager | Add a room (visible to everyone at once) |
| PATCH | `/api/spaces/{id}/` | manager | Edit a room, turn approval on/off, hide/show it |
| GET | `/api/spaces/{id}/availability/?date=YYYY-MM-DD` | – | Booked times that day |
| GET | `/api/calendar/?date=&location=` | – | Rooms per building with that day's bookings + header stats |
| GET | `/api/bookings/` | ✔ | My bookings, paginated |
| POST | `/api/bookings/` | ✔ | `{space_id, start_at, end_at, title, attendees}` → 201 / 400 / 409 |
| POST | `/api/bookings/{id}/cancel/` | ✔ | Cancel my booking |
| GET | `/api/approvals/` | manager | Pending requests |
| POST | `/api/bookings/{id}/approve/` · `/reject/` | manager | Decide a request |
| GET / POST | `/api/issues/?status=&location=` | ✔ | List / report maintenance issues |
| PATCH | `/api/issues/{id}/status/` | manager | open / in_progress / resolved |
| GET | `/api/summary/` | ✔ | Sidebar badge counts |
| GET | `/api/health/` | – | App + database check |

Errors are always `{"detail": "...", "code": "..."}` (e.g. `slot_unavailable` with HTTP 409).

---

## Run it

### Option 1: quick start (SQLite, no Redis needed)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo --reset   # 2 buildings, 10 rooms, a week of bookings, issues
                                     # logins: demo (member) / manager (staff), password VaultDesk@123
python manage.py runserver 8020
```

```bash
cd frontend
bun install                     # Bun is the package manager (lockfile: bun.lock)
bun run dev                     # http://localhost:5173 (proxies /api to :8020)
```

Without Redis, Celery tasks run inline and emails print to the backend console.

### Option 2: with your local PostgreSQL

1. Install PostgreSQL, then create a user and database (psql or pgAdmin):
   ```sql
   CREATE USER vaultdesk WITH PASSWORD 'vaultdesk';
   CREATE DATABASE vaultdesk OWNER vaultdesk;
   ```
2. Copy `backend/.env.example` to `backend/.env` and set
   `DATABASE_URL=postgres://vaultdesk:vaultdesk@localhost:5432/vaultdesk`
3. `python manage.py migrate && python manage.py seed_demo`, then run as above.

### Option 3: everything in Docker

```bash
docker compose up --build
```
Open http://localhost:8080. This starts PostgreSQL, Redis, Django (gunicorn), a Celery worker and nginx
serving React. Admin: http://localhost:8080/admin (create a user with
`docker compose exec backend python manage.py createsuperuser`).

### Tests

```bash
cd backend && python manage.py test
cd frontend && bun run test
```

## CI

`.github/workflows/ci.yml` runs on every push and pull request:
1. **backend:** system checks, `makemigrations --check` (fails if a model change has no migration), tests on PostgreSQL
2. **frontend:** `bun install --frozen-lockfile`, tests, production build
3. **docker:** builds all images

## Project structure

```
backend/
  config/            settings (env-driven), urls, celery, wsgi
  apps/core/         shared base model, error types + DRF error handler, health check
  apps/accounts/     register / me (JWT via simplejwt)
  apps/spaces/       Location + Space models, selectors, API, seed_demo command
  apps/bookings/     Booking model, services (create/cancel/approve/reject), selectors, calendar stats,
                     pricing, notifications, tasks, API, tests
  apps/maintenance/  Issue model, selectors (out-of-service), services, API, tests
frontend/src/
  api/               fetch client (JWT + shared refresh) and endpoint functions
  stores/            Zustand stores: auth (session), summary (sidebar badges), ui (search) + tests
  auth/              ProtectedRoute (reads the auth store)
  layout/            AppShell (layout route + Outlet context), IconRail, Sidebar, Topbar
  hooks/             useApi (fetch + cancel stale requests), useBuilding (state in the URL)
  components/        calendar/ (Timeline, StatCards, BookingDetails), Modal, BookingForm, SpaceCard, icons, ...
  pages/             Calendar, Rooms, RoomDetail, MyBookings, Maintenance, Approvals, Auth (lazy-loaded)
  utils/             time.js and timeline.js: pure helpers with unit tests
```

## AI usage

Built with help from an AI coding assistant. Every file was reviewed, tests were written for the business
rules, and the app was exercised end to end in the browser. That run caught a real bug (a notification
failure returned HTTP 500 after the booking was saved), which is now fixed and covered by a test.
