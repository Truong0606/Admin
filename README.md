# GlucoDia Admin Dashboard

React + TypeScript admin console for the GlucoDia backend admin APIs, styled with Tailwind CSS.

## Features

- Admin login with persisted session storage
- Dashboard overview and refresh actions
- User listing, status updates, and deletion
- Pending doctor verification queue
- System config listing, detail fetch, and update flow
- Category create, detail fetch, update, delete, and restore
- Article create, detail fetch, update, publish toggle, delete, and restore

## API Configuration

The app uses `https://glucare-api.vercel.app` by default.

To override it locally, create a `.env` file with:

```env
VITE_API_BASE_URL=https://your-api-host
```

For Vercel, set the same `VITE_API_BASE_URL` variable in the project Environment Variables settings.

## Development

```bash
npm run dev
```

The VS Code task `Admin Dashboard Dev Server` also starts the Vite dev server.

## Production Build

```bash
npm run build
```

The current implementation was validated successfully with the production build.

## Deploy To Vercel

This project is ready for static deployment on Vercel.

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrites: configured in `vercel.json` so deep links like `/users` or `/articles` resolve to the React app

Recommended Vercel setup:

```text
Environment Variable
VITE_API_BASE_URL=https://glucare-api.vercel.app
```

If you deploy against another backend, change that environment variable in Vercel before the first production build.
