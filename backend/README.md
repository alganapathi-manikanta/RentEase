# Rent Ease Backend

This folder contains a basic Express + MongoDB backend setup for Rent Ease.

## Setup

1. Go to the backend folder:
   cd backend

2. Install dependencies:
   npm install

3. Create a `.env` file from `.env.example` and update the values.

4. Start the server:
   npm run dev

For LAN testing, add the frontend origin currently in use to `CORS_ORIGINS`. The
frontend's development API helper follows the browser host when the configured API
URL uses localhost, so no LAN address is stored in application source.

For production, set `CORS_ORIGINS` to the exact HTTPS frontend origin(s), set
`FRONTEND_URL` to the public frontend URL for password-reset links, and configure
`MONGODB_URI`, `JWT_SECRET`, and `PORT` through the hosting environment. Do not use
wildcard CORS origins. If using local-disk uploads in production, set `UPLOAD_DIR` to
a persistent volume; otherwise use an object-storage upload provider that returns
absolute media URLs. When set, `CORS_ORIGINS` is the complete allowlist and takes
precedence over the legacy `CLIENT_URL`/`FRONTEND_URL` CORS fallback.

## Available endpoints

- `GET /api/health` - health check
- `POST /api/auth/register` - register a new user
- `POST /api/auth/login` - login a user
- `GET /api/auth/me` - current authenticated user
- `GET /api/properties` - public active property search
- `GET /api/properties/my` - authenticated landlord properties
- `POST /api/properties` - create a landlord property
- `PUT /api/properties/:id` - update an owned property
- `DELETE /api/properties/:id` - delete an owned property
- `GET|POST|DELETE /api/favorites/:propertyId` - tenant favorites
- `POST /api/uploads/image` and `/api/uploads/video` - landlord media uploads

## Example `.env`

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/rent-ease
JWT_SECRET=your_jwt_secret_here
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Existing property media URLs beginning with `http://localhost:5000/uploads/` are
returned as `/uploads/...` without changing stored MongoDB documents. New local
uploads and property media references are stored relatively; absolute cloud URLs are
preserved. No property or user migration is required.
