# ReliefHub

A full-stack, real-time emergency response and disaster management platform. Citizens report incidents from the field, an Emergency Operations Center (EOC) monitors and triages them on a live map, rescue teams accept and action jobs, and hospitals/shelters publish live capacity — all updated instantly via WebSockets.

---

## Live Demo

| | |
|---|---|
| **Live App** | [https://relief-hub-one.vercel.app](https://relief-hub-one.vercel.app) |
| **Backend API** | [https://reliefhub-bit3.onrender.com/api](https://reliefhub-bit3.onrender.com/api) |

> **Note:** The backend runs on Render's free tier. The first request after a period of inactivity may take **30–50 seconds** to respond due to a cold start. Subsequent requests are fast.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Setup Instructions](#setup-instructions)
6. [Environment Variables](#environment-variables)
7. [API Routes](#api-routes)
8. [AI / Mock-AI Mode](#ai--mock-ai-mode)
9. [Deployment Notes](#deployment-notes)

---

## Project Overview

ReliefHub connects every actor in a disaster-response chain through a single, role-aware web app:

| Role | What they do |
|---|---|
| `citizen` | Report incidents (flood, fire, earthquake, medical, structural, other), view the live map, chat with the AI assistant for safety guidance |
| `eoc` | Monitor all incidents on the live map, update statuses, manage the verification queue, issue broadcast alerts, view facility capacity, query the AI assistant for situation summaries |
| `rescue_team` | Browse available jobs, accept dispatched incidents, advance job status through to resolved |
| `hospital` / `shelter` | Register their facility, update live bed/capacity counts, toggle operational status |
| `volunteer` / `ngo` | View the live map and receive safety guidance from the chatbot |
| `admin` | Full access across all EOC and user-management capabilities |

---

## Features

All features listed below are genuinely implemented in the codebase.

### Authentication & Users
- JWT-based auth with short-lived access tokens (15 min) and long-lived refresh tokens (7 days), stored in HTTP-only cookies
- Role-based access control — eight roles enforced at the route and controller level
- Verification document upload (base64 data URI) for non-citizen accounts; EOC staff approve/reject from the Verification Queue
- `GET /api/auth/me` returns the current user's profile

### Incident Reporting
- Citizens submit incident reports with a title, description, category, and a map-picked or GPS-detected location
- AI triage runs on every submission: severity + category classification, a ≤20-word actionable summary, a deterministic resource dispatch plan (ambulances, boats, teams, ETA), and a confidence score
- Automatic duplicate detection: if a new report lands within 500 m of an existing open report and its text shares ≥35% word overlap (Jaccard similarity), it is auto-merged and its status set to `merged`
- Full incident timeline log — every status change is stamped with actor, note, and timestamp
- Status lifecycle: `reported → acknowledged → dispatched → in_progress → resolved` (plus `merged`, `rejected`)
- EOC and rescue teams can update status; optimistic updates are rolled back on failure

### Live Map
- Interactive Leaflet map showing all incidents as emoji markers colour-coded by severity
- Critical incidents show an animated ping pulse ring
- New markers animate in with a drop-in effect
- Facility markers (🏥 hospitals, 🏠 shelters) overlaid on the same map
- Picker mode for citizens to pin an incident location when reporting

### Real-time Updates (Socket.IO)
- `incident:new` — new incident is prepended to every connected client's cache instantly
- `incident:update` — status/assignment changes propagate to all clients without a page reload
- `facility:new` / `facility:update` — capacity changes appear live
- `alert:new` / `alert:dismissed` — broadcast alerts appear and disappear in real time

### Broadcast Alerts
- EOC/admin can issue alerts with severity `info | warning | critical`
- Active alerts appear in a persistent `BroadcastBar` at the top of every dashboard
- Alerts can be dismissed; dismissed alerts are removed from all clients instantly via socket

### Facility Management
- Hospitals and shelters register their facility with name, type, location, total capacity, and contact phone
- Live capacity stepper with debounced auto-save (800 ms)
- Operational status toggle: `operational | full | closed`
- Capacity bar (green → amber → red) auto-colors at 70% and 90%
- `occupancyPercent` virtual populated on every facility document

### AI Assistant (Chatbot)
- Role-aware responses: citizen/volunteer/NGO get safety guidance; EOC/rescue get natural-language incident search; hospital/shelter get coordination guidance
- Citizens: keyword matching for common disaster keywords (flood, fire, earthquake, medical) with instant replies; falls back to Groq LLM for anything unmatched; always appends nearest open shelter with distance (km) when browser location is available
- EOC/rescue: parses severity, category, and status keywords from plain English and queries the live database
- Three-tier fallback: keyword rule → Groq API → hardcoded safe message

### Verification Queue
- EOC staff see a list of all users with `pending` document status
- Lazy-loaded document preview per user
- Approve or reject with an optional review note; toast confirmation on each action

### EOC Dashboard
- Sidebar list of all active incidents filtered and sorted by severity
- Sub-navigation with tab animations: Live Map / Facilities / Rescue Teams / Verification Queue
- Severity and status chip filters
- Click any incident to fly the map to its coordinates

### Rescue Console
- "Available" tab: incidents in `acknowledged` status with no assigned team
- "My Jobs" tab: incidents assigned to the current rescue team member, including jobs resolved in the last 8 hours
- Accept job (sets status to `dispatched`), advance to `in_progress`, then `resolved`
- Embedded per-card map toggle

---

## Tech Stack

### Backend

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | HTTP server and routing |
| `mongoose` | ^9.9.4 | MongoDB ODM with GeoJSON + 2dsphere index support |
| `socket.io` | ^4.8.3 | Real-time WebSocket events |
| `jsonwebtoken` | ^9.0.3 | Access and refresh token signing/verification |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `cookie-parser` | ^1.4.7 | HTTP-only cookie parsing for refresh tokens |
| `cors` | ^2.8.6 | Cross-origin resource sharing |
| `dotenv` | ^17.4.2 | Environment variable loading |
| `express-async-handler` | ^1.2.0 | Async route error forwarding |
| `zod` | ^3.24.4 | Request body validation |
| `@google/generative-ai` | ^0.24.1 | Gemini SDK (imported but Groq is the active AI provider) |
| `nodemon` | ^3.1.14 | Dev server auto-restart |

### Frontend

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.8 | UI library |
| `react-dom` | ^19.2.8 | DOM renderer |
| `react-router-dom` | ^7.18.3 | Client-side routing |
| `@tanstack/react-query` | ^5.102.8 | Server state management, caching, and optimistic updates |
| `axios` | ^1.20.0 | HTTP client with interceptors for token refresh |
| `socket.io-client` | ^4.8.3 | Real-time WebSocket connection |
| `leaflet` | ^1.9.4 | Interactive map engine |
| `react-leaflet` | ^5.0.0 | React bindings for Leaflet |
| `tailwindcss` | ^3.4.19 | Utility-first CSS framework |
| `postcss` | ^8.5.28 | CSS processing |
| `autoprefixer` | ^10.5.5 | Vendor prefix injection |
| `vite` | ^8.2.2 | Build tool and dev server |
| `@vitejs/plugin-react` | ^6.1.0 | Vite React plugin |

---

## Folder Structure

```
ReliefHub/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── aiController.js         # /api/ai/* handlers
│   │   │   ├── alertController.js      # /api/alerts/* handlers
│   │   │   ├── authController.js       # /api/auth/* handlers
│   │   │   ├── facilityController.js   # /api/facilities/* handlers
│   │   │   ├── incidentController.js   # /api/incidents/* handlers
│   │   │   └── userController.js       # /api/users/* handlers
│   │   ├── middleware/
│   │   │   ├── auth.js                 # protect() + authorize() middlewares
│   │   │   └── errorHandler.js         # notFound + global error handler
│   │   ├── models/
│   │   │   ├── Alert.js
│   │   │   ├── Facility.js
│   │   │   ├── Incident.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── aiRoutes.js
│   │   │   ├── alertRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── facilityRoutes.js
│   │   │   ├── incidentRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── services/
│   │   │   ├── aiService.js            # Groq triage + keyword mock + resource rules
│   │   │   ├── chatService.js          # Role-aware chatbot replies
│   │   │   ├── duplicateService.js     # Geo + Jaccard duplicate detection
│   │   │   └── socketService.js        # Socket.IO init + getIO()
│   │   ├── utils/
│   │   │   ├── generateTokens.js       # JWT access + refresh token helpers
│   │   │   └── geo.js                  # Haversine distance helper
│   │   └── server.js                   # Express app + MongoDB connection + HTTP server
│   ├── .env                            # Local secrets (not committed)
│   ├── .env.example                    # Template for contributors
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── api/
│   │   │   ├── alerts.js               # useActiveAlerts, useIssueAlert, useDismissAlert
│   │   │   ├── axios.js                # Axios instance + token refresh interceptor
│   │   │   ├── facilities.js           # useFacilities, useMyFacility, useCreateFacility, useUpdateCapacity
│   │   │   ├── incidents.js            # useIncidents, useMyIncidents, useCreateIncident, useUpdateIncidentStatus
│   │   │   └── users.js                # useDirectory, useVerificationDocument, useReviewDocument
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── BroadcastBar.jsx        # Active alert banner across all dashboards
│   │   │   ├── Button.jsx
│   │   │   ├── ChatbotWidget.jsx       # Floating AI assistant FAB + panel
│   │   │   ├── ErrorBanner.jsx         # Inline form error message
│   │   │   ├── ErrorBoundary.jsx       # React error boundary
│   │   │   ├── ErrorRetry.jsx          # Query failure state with retry button
│   │   │   ├── FacilityDirectory.jsx   # Facility list with capacity bars
│   │   │   ├── Input.jsx
│   │   │   ├── Loader.jsx
│   │   │   ├── MapView.jsx             # Leaflet map, incident + facility markers
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx      # Role-aware route guard
│   │   │   ├── ReportIncidentForm.jsx  # Citizen incident report modal
│   │   │   ├── RescueTeamsPanel.jsx    # Rescue team availability panel
│   │   │   └── StatusBadge.jsx         # Animated status pill
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # Auth state, login/logout, token refresh
│   │   │   └── ToastContext.jsx        # Global toast notifications
│   │   ├── hooks/
│   │   │   └── useSocket.js            # Socket.IO connection + query cache wiring
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── citizen/
│   │   │   │   ├── CitizenDashboard.jsx  # Live map + report FAB
│   │   │   │   └── MyReports.jsx         # Citizen's own incident list
│   │   │   ├── eoc/
│   │   │   │   ├── EOCDashboard.jsx      # Live map, incident sidebar, sub-nav tabs
│   │   │   │   └── VerificationQueue.jsx # Document review queue
│   │   │   ├── facility/
│   │   │   │   └── FacilityPortal.jsx    # Registration + capacity editor
│   │   │   └── rescue/
│   │   │       └── RescueConsole.jsx     # Available jobs + my jobs tabs
│   │   ├── utils/
│   │   │   └── constants.js            # Shared helpers: timeAgo, severity maps
│   │   ├── App.css
│   │   ├── App.jsx                     # Router + QueryClientProvider + AuthProvider
│   │   ├── index.css                   # Tailwind directives + custom keyframes
│   │   └── main.jsx
│   ├── .env                            # Local secrets (not committed)
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- A running MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- A [Groq API key](https://console.groq.com/keys) (optional — the app falls back to keyword-based mock AI without one)

### Backend

```bash
cd backend
npm install
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

Start the server:

```bash
# Development (auto-restart on file changes via nodemon)
npm run dev

# Production
npm start
```

The server starts on port `5000` by default (override with `PORT` in `.env`).

### Frontend

```bash
cd frontend
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

Set `VITE_API_URL` in `.env` to your backend's API base path (e.g. `http://localhost:5000/api`).

Available scripts:

```bash
# Development server (Vite HMR)
npm run dev

# Production build (output to dist/)
npm run build

# Preview the production build locally
npm run preview

# Lint
npm run lint
```

The dev server starts on `http://localhost:5173` by default.

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Purpose | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string (local or Atlas) | `mongodb://localhost:27017/reliefhub` |
| `JWT_ACCESS_SECRET` | Secret key for signing access tokens | 32+ random characters |
| `JWT_ACCESS_EXPIRES` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | 32+ random characters |
| `JWT_REFRESH_EXPIRES` | Refresh token lifespan | `7d` |
| `GROQ_API_KEY` | Groq API key for AI triage and chatbot | `gsk_...` |
| `DEMO_MODE` | Set to `true` to force keyword-only mock AI (skips Groq even if the key is present) | `false` |
| `CLIENT_URL` | Exact origin of the frontend — used for CORS and Socket.IO | `http://localhost:5173` |
| `PORT` | HTTP server port (optional, defaults to `5000`) | `5000` |

Generate secure secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend — `frontend/.env`

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL (must include `/api`) | `http://localhost:5000/api` |

---

## API Routes

All routes are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new user |
| `POST` | `/api/auth/login` | Public | Login, receive access + refresh tokens |
| `POST` | `/api/auth/refresh` | Public | Exchange a refresh token for a new access token |
| `POST` | `/api/auth/logout` | Public | Clear the refresh token cookie |
| `GET` | `/api/auth/me` | Any logged-in role | Return the current user's profile |

### Incidents — `/api/incidents`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/incidents` | Any logged-in role | Create an incident (triggers AI triage + duplicate detection) |
| `GET` | `/api/incidents` | Any logged-in role | List incidents; `?mine=true` filters to the current user's reports |
| `GET` | `/api/incidents/:id` | Any logged-in role | Get a single incident by ID |
| `PATCH` | `/api/incidents/:id/status` | `eoc`, `admin`, `rescue_team` | Update incident status and append a timeline entry |

### Facilities — `/api/facilities`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/facilities` | Any logged-in role | List all facilities |
| `GET` | `/api/facilities/mine` | `hospital`, `shelter` | Get the current user's registered facility |
| `POST` | `/api/facilities` | `eoc`, `admin`, `hospital`, `shelter` | Register a new facility |
| `PATCH` | `/api/facilities/:id/capacity` | `eoc`, `admin`, `hospital`, `shelter` | Update live capacity and/or status |

### Alerts — `/api/alerts`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/alerts/active` | Any logged-in role | List all currently active broadcast alerts |
| `POST` | `/api/alerts` | `eoc`, `admin` | Issue a new broadcast alert |
| `PATCH` | `/api/alerts/:id/dismiss` | `eoc`, `admin` | Dismiss (deactivate) an alert |

### AI — `/api/ai`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ai/situation-summary` | `eoc`, `admin` | Aggregate count of open incidents by severity |
| `POST` | `/api/ai/classify` | Any logged-in role | Preview AI classification for a draft report |
| `POST` | `/api/ai/chat` | Any logged-in role | Role-aware chatbot: safety advice (citizen) or incident search (EOC/rescue) |

### Users — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/directory` | `eoc`, `admin` | List all non-citizen users with document status |
| `GET` | `/api/users/:id/document` | `eoc`, `admin` | Retrieve a user's uploaded verification document |
| `PATCH` | `/api/users/:id/verify-document` | `eoc`, `admin` | Approve or reject a user's verification document |

---

## AI / Mock-AI Mode

The AI pipeline in `backend/src/services/aiService.js` has three layers:

### 1. Groq (live AI)
When `GROQ_API_KEY` is set and `DEMO_MODE` is not `true`, every incident submission calls the Groq API (`openai/gpt-oss-120b` model) to classify the report's category, severity, and confidence, and generate a ≤20-word triage summary. The request has an 8-second timeout.

### 2. Keyword mock (automatic fallback)
If the Groq key is missing, `DEMO_MODE=true`, or the Groq call fails for any reason (network error, timeout, bad response), `analyzeIncident` silently falls back to `mockAnalyze`. This function:
- Matches the report text against keyword rules for flood, fire, earthquake/structural, and medical categories
- Escalates severity to `critical` if the text contains "trapped", "stranded", or mentions ≥15 affected people
- Calculates a deterministic confidence score based on whether a keyword matched and how many words the report contains (max 95 — never claims full certainty from keywords alone)

### 3. Resource recommendation (always deterministic)
Regardless of which classifier ran, `computeResourceRecommendation` overlays a fixed dispatch plan from a hard-coded rule table keyed by `(category, severity)`. This is intentional — letting an LLM freely generate resource quantities (e.g. "3 ambulances") is a safety risk in a real dispatch context. The table specifies exact resource types, quantities, and ETA in minutes for all 24 combinations of category × severity.

### Chatbot fallback chain
`backend/src/services/chatService.js` follows the same pattern for the chatbot:
1. Instant keyword-rule reply for common disaster terms (zero latency)
2. Groq LLM for anything not matched by keywords
3. Hardcoded safe fallback message if Groq fails

To force mock mode without an API key, set `DEMO_MODE=true` in `backend/.env`.

---

## Deployment

- Backend deployed on Render (root directory: `backend`)
- Frontend deployed on Vercel (root directory: `frontend`)
- Backend requires `CLIENT_URL` set to the deployed frontend's exact URL (for CORS + Socket.IO)
- Frontend requires `VITE_API_URL` set to the backend's URL + `/api`

See `.env.example` in each folder for the full list of required environment variables.
