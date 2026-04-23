# Organoid Simulation App

React + Vite frontend with an Express + Socket.IO backend (single server).

## Stack
- Node.js 20, TypeScript
- Vite 6 (middleware-mode, mounted on Express)
- Express 4 + Socket.IO 4
- Firebase, Recharts, D3, Tailwind v4, Motion

## Dev
- Workflow `Server` runs `npm run dev` (`tsx server.ts`), serving on `0.0.0.0:5000`.
- Vite is configured with `allowedHosts: true` for the Replit iframe proxy.

## Build / Deploy
- Build: `npm run build` (vite build + esbuild bundles `server.ts` to `dist/server.cjs`)
- Start: `npm run start` (`node dist/server.cjs`)
- Deployment target: `vm` (Socket.IO needs persistent server).

## Auth
- API endpoints gated by `APP_PASSWORD` env (defaults to `organoid2026`).

## Recent fixes
- Removed duplicate `TelemetryEvent` import in `src/App.tsx`.
- Server port changed from 3000 → 5000 (with `PORT` env override).
