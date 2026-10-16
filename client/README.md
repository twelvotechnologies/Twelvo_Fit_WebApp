# Gym ERP Frontend (React + Vite)

A modern, high-aesthetic Gym Management ERP dashboard built with **React**, **Vite**, **TypeScript**, and custom **Vanilla CSS** featuring glassmorphism and real-time backend synchronization.

---

## 🌟 Key Features

- **Direct Backend Proxy**: Vite dev server proxies `/api` to `http://localhost:3000` for seamless API integration with zero CORS friction.
- **Live Health & Latency Monitor**: Real-time ping badge showing backend status (`Express UP`) and latency in milliseconds.
- **Real-Time Member Management**:
  - Full CRUD operations connected directly to the backend's Prisma ORM.
  - Search members by name or email.
  - Status filter (`ACTIVE`, `INACTIVE`, `EXPIRED`, `SUSPENDED`).
  - Add Member Modal with validation and custom duration calculations.
  - Delete action with confirmation and toast feedback.
- **Metric Analytics**: Cards for Total Members, Active Passes, Expired/Suspended count, and Estimated Monthly MRR.
- **Integrated Swagger Shortcut**: 1-click header link directly to `http://localhost:3000/api-docs`.
- **Modern Design**: Dark obsidian & midnight slate theme, Google Fonts (`Outfit` & `Inter`), neon athletic accents, and micro-animations.

---

## 🛠️ Quick Start

```bash
cd client

# Install dependencies
npm install

# Run Vite development server
npm run dev

# Build for production
npm run build
```

Open your browser at **`http://localhost:5173`**.
Ensure your backend is running on `http://localhost:3000` (`npm run dev` inside `server/`).
