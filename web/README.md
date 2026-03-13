# Inkblot Web Foundation

Production-ready foundation for the Inkblot interactive 3D website.

## Stack

- Astro + TypeScript
- React islands
- Three.js via React Three Fiber + Drei
- Tailwind CSS v4
- GSAP, Zod

## Local Development

```bash
npm install
npm run dev
```

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

- `LEAD_WEBHOOK_URL`: optional ops webhook for manual-review lead routing.

## Current Scope

- Premium homepage structure with conversion-first messaging
- 3D hero scene as React island
- Design token system in global styles

## Next Build Steps

1. Add strategy-call qualification form
2. Add CRM integration worker
3. Add analytics and observability
4. Expand multi-page information architecture
5. Add capability-based 3D quality tiers
# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
