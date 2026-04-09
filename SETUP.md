# 🛠 Oro App — Setup Guide

## Step 1: Fill in your details in `src/config.ts`

Open `src/config.ts` and replace the placeholder values:

```ts
appName: 'Oro',                          // Your app display name
botUsername: 'YourBotUsername',           // Your bot's username (without @)
botToken: 'YOUR_BOT_TOKEN_HERE',          // From @BotFather
appUrl: 'https://YOUR_DEPLOYMENT_URL',    // Where your app is hosted
```

---

## Step 2: Also update these files with your URL

| File                              | What to change                                |
| --------------------------------- | --------------------------------------------- |
| `package.json`                    | `"homepage"` → your deployment URL            |
| `public/tonconnect-manifest.json` | `"url"` and `"iconUrl"` → your deployment URL |
| `vite.config.ts`                  | PWA manifest `name`, `description` if needed  |

---

## Step 3: Deploy your app

### Option A — GitHub Pages (free)

```bash
# 1. Push your code to a GitHub repo
# 2. Run:
npm run deploy
```

Your app will be live at `https://<your-github-username>.github.io/<repo-name>`

### Option B — Vercel (free, recommended)

1. Go to https://vercel.com and import your GitHub repo
2. Set **Output Directory** to `dist`
3. Deploy — Vercel gives you a URL like `https://Oro.vercel.app`

---

## Step 4: Register your Mini App with BotFather

1. Open Telegram and search for **@BotFather**
2. Send `/newapp`
3. Select your bot (e.g. `@YourOroBot`)
4. Enter your app details:
   - **Title**: Oro
   - **Description**: Your app description
   - **Photo**: Upload a 640×360px image
   - **Demo GIF**: (optional)
   - **Web App URL**: Paste your deployment URL from Step 3
5. BotFather will confirm with a link like `https://t.me/YourOroBot/app`

---

## Step 5: Test it

- Open the link `https://t.me/YourOroBot/app` in Telegram
- Or add a menu button to your bot with `/setmenubutton` in BotFather

---

## Environment Variables (optional)

If you want to keep your bot token secure, create a `.env` file:

```env
VITE_BOT_TOKEN=123456789:ABCdef...
VITE_APP_URL=https://your-deployment-url.com
```

Then in `src/config.ts` use:

```ts
botToken: import.meta.env.VITE_BOT_TOKEN,
appUrl: import.meta.env.VITE_APP_URL,
```
