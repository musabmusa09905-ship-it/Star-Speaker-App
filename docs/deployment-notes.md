# Deployment Notes

Heart of English Habit App is a Vite + React single page app. The production build is static and outputs to `dist/`.

## Required Environment Variables

Set these variables in the deployment platform before building:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the Supabase anon key only. Do not use or expose a `service_role` key in frontend builds.

## Build Commands

```bash
npm install
npm run build
```

Optional local preview:

```bash
npm run preview
```

## Static Hosting Requirements

The app uses client-side routing. Production hosting should serve `dist/index.html` for unknown app routes such as:

- `/home`
- `/practice`
- `/record`
- `/feedback`
- `/library`
- `/leaderboard`
- `/progress`
- `/profile`
- `/teacher/review`
- `/teacher/assign`
- `/teacher/tasks`
- `/teacher/weekly-focus`
- `/teacher/library`
- `/teacher/students`
- `/admin/users`
- `/admin/library`
- `/admin/relationships`

Hosts such as Netlify, Vercel, Cloudflare Pages, Render static sites, or a configured web server can support this with an SPA fallback rule.

## Recommended Target

Vercel is the recommended first deployment target for the current repo because it can build Vite apps directly from GitHub and the included `vercel.json` provides the SPA fallback rewrite for nested routes.

Vercel settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

The included `vercel.json` rewrites all app routes to `/index.html`, which keeps routes such as `/teacher/review` and `/admin/users` working on refresh.

Netlify is also suitable, but would need an equivalent SPA fallback rule such as `/* /index.html 200` in `_redirects` or `netlify.toml`.

## GitHub Pages Note

GitHub Pages project sites are usually served under a repository subpath, for example:

```text
https://USERNAME.github.io/heart-of-english-habit-app/
```

This app currently assumes it is deployed at the domain root, such as:

```text
https://app.example.com/
```

For GitHub Pages, use a custom domain at the root path if possible, or add a dedicated GitHub Pages basename/404 fallback routing setup before deploying to a repository subpath. Do not deploy real credentials in the repository.

## Supabase Production Safety

- Keep `.env.local` local only.
- Configure production environment variables in the hosting provider dashboard.
- Keep the `voice-submissions` bucket private.
- Use signed URLs for private recording playback.
- Keep Row Level Security enabled.
