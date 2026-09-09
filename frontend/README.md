# ReliefHub — Frontend

AI-powered emergency response platform. Built with React + Vite + Tailwind CSS.

## Stack

- React 19, React Router v7
- TanStack Query v5 (data fetching + caching)
- Axios (API client with token refresh interceptor)
- React-Leaflet + Leaflet (live incident map)
- Socket.IO Client (real-time incident/alert updates)
- Tailwind CSS v3 (dark command-center theme)

## Getting started

```bash
cp .env.example .env   # set VITE_API_URL
npm install
npm run dev
```

## Environment variables

| Variable       | Description                          | Default                        |
|----------------|--------------------------------------|--------------------------------|
| VITE_API_URL   | Backend API base URL (include /api)  | http://localhost:5000/api      |
