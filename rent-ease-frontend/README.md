# Rent Ease — Frontend

A React + Tailwind CSS frontend for Rent Ease, a property rental/sale platform with
separate Tenant and Landlord experiences, a Three.js 3D room viewer, and a Recharts-based
expense calculator.

The frontend supports both a standalone localStorage demo mode and the Express/
MongoDB API. Configure `VITE_API_URL` to use the backend; all application API requests
share one Axios client and uploaded media paths are resolved independently of the
browser's host.

## 1. Requirements

- [Node.js](https://nodejs.org) v18 or newer (v20 recommended)
- npm (comes with Node)

## 2. Setup

Open this folder in VS Code, then in the integrated terminal (`` Ctrl+` ``):

```bash
npm install
npm run dev
```

Vite will print a local URL, typically:

```
http://localhost:5173
```

Open that in your browser. The app opens automatically if your terminal supports it.

## 3. Trying it out

- Go to **Register**, create a **Landlord** account, and add a property (fill in room
  dimensions and click **Generate 3D Room** to see the Three.js viewer).
- Log out, register a **Tenant** account, and search/filter properties, save favorites,
  and open a listing's **Expense Calculator**.
- Toggle dark mode from the navbar (sun/moon icon).
- Without `VITE_API_URL`, development uses standalone localStorage demo mode. With
  the variable configured, authentication, properties, and wishlists use the backend.

## 4. Project structure

```
src/
  components/     Navbar, Footer, PropertyCard, Sidebar, Room3D, MediaUpload, ...
  context/        AuthContext (login/register/roles), AppDataContext (properties/favorites/expenses)
  data/           Seed/mock property data (no real photos or videos, per spec)
  pages/          Landing, Login, Register, Search, Property Details, Expense Calculator...
  pages/tenant/   Tenant Dashboard, Favorites
  pages/landlord/ Landlord Dashboard, Add Property, Manage Properties, Reports
  utils/api.js    Pre-wired Axios instance pointed at VITE_API_URL
```

## 5. Connecting the backend

1. Copy `.env.example` to `.env`. For local development use
   `VITE_API_URL=http://localhost:5000/api`.
2. Start the backend from the parent `backend/` folder with `npm install` and `npm run dev`.
3. Vite binds to the local network for LAN testing. When opened from a LAN address,
   the development API helper maps a configured loopback API host to that same browser
   host; add the exact frontend origin to the backend's `CORS_ORIGINS`.
4. For production, set `VITE_API_URL` in the frontend hosting/build environment to
   `https://<production-backend-domain>/api` (or `/api` when a reverse proxy exposes
   the API on the frontend origin). It must not contain a developer-machine address.
5. Configure the backend `CORS_ORIGINS` with exact frontend origin(s), and `FRONTEND_URL`
   with the public frontend URL for password-reset links. Keep local uploads on persistent
   storage or use a cloud upload provider.

New local media references are stored as `/uploads/<filename>`. Existing MongoDB
localhost upload URLs are normalized in API responses without a database migration;
absolute production/cloud URLs are preserved.

## 6. Notes

- No sample property photos or videos are bundled — upload areas start empty and only
  show media once you actually add files, per the original spec.
- Colors, spacing, and component classes live in `tailwind.config.js` and
  `src/index.css` (`.btn-primary`, `.card`, `.input`, etc.) — the brand palette
  (`#2563EB` / `#10B981` / `#F97316`) is defined there as `primary` / `secondary` / `accent`.
