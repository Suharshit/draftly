This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Trigger.dev Setup

This project is configured for Trigger.dev v4 (`@trigger.dev/sdk/v3` package API).

1. Set `TRIGGER_SECRET_KEY` in `.env.local`.
2. Start Trigger.dev dev worker:

```bash
pnpm trigger:dev
```

3. Trigger the sample task from app code or HTTP:

```bash
curl -X POST http://localhost:3000/api/trigger/hello \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"from local test\"}"
```

Task source files live in `src/trigger/` and Trigger.dev config is in `trigger.config.ts`.

## AI design agent (local)

1. Set `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`, and optionally `GOOGLE_GENERATIVE_AI_MODEL`
   (default `gemini-3.5-flash`; Gemini 2.x and 3.x models both work).
2. Run `pnpm prisma migrate dev` so the `AiSession` and `AiMessage` tables exist.
3. Run `pnpm dev` and `pnpm trigger:dev` together. The worker reads `.env.local` only when it starts, so restart it
   after changing the model or any key.
4. In production, set `CRON_SECRET` in the Vercel project so the daily AI session cleanup in `vercel.json` can
   authenticate.

`docs.md` → **AI** explains sessions, turns, and how generation works.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
