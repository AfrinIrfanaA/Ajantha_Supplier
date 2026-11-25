# AJANTHA TEXTILES

Supplier management for a small shop: suppliers, purchases, payments, ledger, settings, users, backup and export.

## Stack

- Frontend: React, TypeScript, Tailwind CSS, React Router
- Backend: Node.js, Express, TypeScript
- Database: MongoDB Atlas
- Auth: JWT (httpOnly cookie + Bearer token), bcrypt, role-based access

## Setup

1. Copy `.env.example` to `.env` in the project root.
2. Set `MONGODB_URI` (MongoDB Atlas connection string) and `JWT_SECRET`.


4. Install and run:

```
cd backend
npm install
npm run dev

cd ../frontend
npm install
npm run dev
```

Open http://localhost:5173

The first API start creates the owner account, payment methods, expense categories and shop settings.

## Deploy to Vercel and Render

The frontend is a Vercel static site and the API runs as a Render web service. The root `render.yaml` is a Render Blueprint for the API.

1. Push this repository to GitHub and create a Render Blueprint from it.
2. In Render, set the requested `MONGODB_URI`, `OWNER_EMAIL`, and `OWNER_PASSWORD` values. Render generates `JWT_SECRET`. `https://ajantha-supplier.vercel.app` is allowed by default; if you use a different Vercel site, set `CLIENT_ORIGIN` to that site's full origin. Multiple allowed origins can be comma-separated.
3. In Vercel, import the same repository and set the project root directory to `frontend`. Set `VITE_API_URL` to the Render API origin (for example, `https://ajantha-textiles-api.onrender.com`) and deploy.
4. In MongoDB Atlas, make sure the database user and network access rules allow connections from the Render service.

Use the Vercel HTTPS site for the installable mobile app. On Android, open it in Chrome and choose **Install app** (or **Add to Home screen**). On iPhone, open it in Safari, tap **Share**, then **Add to Home Screen**. The first supplied image is used as the login wordmark; the second is used as the app logo and home-screen icon. The PWA caches its static shell and images; signing in and loading supplier or financial data requires an API connection.

## Roles

- **Owner**: full access
- **Accountant**: suppliers, purchases, payments, ledger, dashboard, export (no users)
- **Staff**: view suppliers and details only
