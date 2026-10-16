# Karera — Horse Racing Clone

A pari-mutuel horse racing game with centralized multi-player betting, built from scratch using captured assets and design references.

## Tech Stack

- **Frontend**: Vanilla TypeScript + Canvas 2D (Vite)
- **Backend**: Node.js + Express + WebSocket (server/)
- **Auth**: Phone-number login. Accounts, balances, and the house vault are stored in Supabase Postgres.
- **Assets**: Sprites and sounds load from the public Supabase Storage bucket `game-assets`.
- **Betting**: Centralized pari-mutuel pool via WebSocket. The server snapshots race state to Supabase when `SUPABASE_SERVICE_ROLE_KEY` is set.

## Quick Start

### 1. Install & Build Frontend

```bash
npm install
npm run build
```

### 2. Start the Betting Server

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:3001` (serves WebSocket + static files).

### 3. Start the Dev Frontend (optional, for development)

```bash
npm run dev
```

Vite dev server on `http://localhost:5173` — proxies WebSocket to the game server.

## Default Accounts

| Phone | Password | Role | Balance |
|-------|----------|------|---------|
| `09123456789` | `1234` | Player | ₱1,000.00 |
| `admin` | `admin123` | Admin | — |

Admins can create player accounts and load balances from the admin panel.

## How It Works

### Race Flow

1. **Login** → Phone + password authentication
2. **Bet** → Place WIN/PLACE/SHOW or FORECAST bets on horses
3. **Auto-start** → When 2+ horses have bets (from any players), a 60-second countdown begins
4. **Race** → Server locks the pool, house takes 10%, race simulation runs locally
5. **Payout** → Winners split the net pool pro-rata (pari-mutuel dividend)
6. **Next Race** → Return to betting for the next race number

### Betting Types

| Type | Description |
|------|-------------|
| WIN | Horse must finish 1st |
| PLACE | Horse must finish 1st or 2nd |
| SHOW | Horse must finish 1st, 2nd, or 3rd |
| FORECAST | Pick 1st AND 2nd in exact order |

### Pari-Mutuel Payout

- All WIN bets go into a single pool
- House takes 10% off the top at lock
- Net pool is split among winning bets pro-rata
- Dividend = (pool × 0.9) ÷ total winning bets
- WIN payout = stake × dividend

## Project Structure

```
horse-racing-clone/
├── public/
│   ├── css/              # Stylesheets + webfonts
│   ├── sounds/           # BGM, SFX, race bed
│   └── sprites/          # Horse sprites, backgrounds, UI
├── src/
│   └── game/
│       ├── engine.ts     # Game loop, canvas scaling, input
│       ├── network.ts    # WebSocket client
│       ├── audio.ts      # Sound management (BGM/SFX/race bed)
│       ├── auth.ts       # Phone login, wallet persistence
│       ├── parimutuel.ts # Pool logic (house take, dividends)
│       ├── constants.ts  # Game config, horse names, traps
│       ├── screens/
│       │   ├── login.ts  # Phone login overlay
│       │   ├── menu.ts   # Main menu (play, admin, logout)
│       │   ├── bet.ts    # Betting screen (server-driven)
│       │   ├── race.ts   # Race simulation + broadcast HUD
│       │   ├── admin.ts  # Admin panel (create users, load balances)
│       │   └── dialogs.ts
├── server/
│   ├── index.js          # Express + WebSocket server
│   └── raceManager.js    # Centralized race/bet state manager
├── docs/
│   ├── design-references/ # Screenshots, layout guides
│   └── research/          # Asset scraping data
└── scripts/
    └── download-assets.mjs # Asset download utility
```

## Environment

The browser uses the public Supabase URL and anon key (already the default in `src/game/supabase.ts`). Copy `.env.example` to `server/.env` and set `SUPABASE_SERVICE_ROLE_KEY` so the betting server can save race state. Never commit the service-role key or the database password.

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key for race snapshots |
| `PORT` | Server | Betting server port (default `3001`) |

## Features

- 12-frame gallop animation with crossfade blending
- Realistic horse movement with dust particles
- Broadcast HUD (timer, position, speed)
- Crowd + hoofbeat audio during races (no BGM overlap)
- Photo finish slow-mo
- Admin panel for user management
- Auto-start countdown (triggered by 2+ backed horses)
- Server-driven centralized betting with race numbers
- Filipino horse names (CAGAYAN KICK, BICOL TIGIDIG, CEBU GALOPO, etc.)
