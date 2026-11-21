This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Deploy Wilder League

Cloudflare Workers serves `wilderleague.com` and `www.wilderleague.com` through the `wilderleague-game` Worker. Supabase holds accounts, casts, votes, and Big Pudding usage limits.

With Node 24 installed, run the following from the project root. The Cloudflare build uses the project's public `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Set those in the build environment or in the checkout's `.env.local`. The deployed Worker receives its private keys from Cloudflare secrets.

```sh
npm ci
node --import tsx --test tests/*.test.ts
npm run build:cloudflare
npm run deploy:cloudflare
```

Cloudflare runs the monthly title refresh on the first of the month at 08:00 UTC.

The root domain redirects to `www`. A production response from `/api/preview/me` includes `X-WilderLeague-Host: cloudflare-workers`.
