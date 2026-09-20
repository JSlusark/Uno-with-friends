# Project Details — Transcendence (UNO)

> Created as part of the 42 school common core by grial, ilazar, jslusark, and wlucke.

## 1. What This Project Does

**Transcendence** is a real-time multiplayer **UNO** card game delivered as a single-page web application. Up to four players create or join a game room, play UNO against each other in real time, chat, and track their statistics on a leaderboard.

The game implements the full UNO rule set — matching by color or number, plus the special action cards (Skip, Reverse, Draw Two, Wild, and Wild Draw Four) — including edge cases such as stacking draw cards, choosing a wild color, and handling players who leave mid-game.

### Key features

- **User accounts & security** — register/login with email, username, and password; bcrypt password hashing, rate limiting, input validation, and JWT tokens stored in HttpOnly cookies.
- **Profiles & stats** — avatar upload, creation date, wins, total games, win rate, global leaderboard rank, match history with opponents/avatars/dates, and experience badges.
- **Global leaderboard** — players ranked by wins and games played, with a tie-breaker; unranked (0-game) users appear at position 0.
- **Game room system** — create a named room or join an existing one; 2–4 players per room; a 30-second grace timer lets a disconnected player rejoin before they are dropped; many invalid-interaction edge cases are handled with friendly error messages.
- **UNO game engine** — a custom-built engine enforces all rules, ends the game when a hand is emptied, saves results to the database, and does not count players who leave before completion.
- **In-room chat** — room event notifications, player messages, and full room chat history kept in memory for the life of the room.
- **Interactive UI** — responsive React interface with animations and real-time updates, plus a Phaser-rendered game canvas.
- **HTTPS everywhere** — TLS terminated by NGINX; all traffic between browser and backend is encrypted.
- **Full Docker environment** — four services (`nginx`, `db`, `api`, `web`) connected over a shared bridge network.

## 2. How It Is Built

### Architecture

```
Browser ──HTTPS──▶ NGINX ──proxy──▶ Fastify API (:3000)
                         │
                         ├──proxy──▶ Vite Dev Server (:5173)
                         │
                         └──WSS──▶ Socket.IO (via /socket.io/)
                                    │
                                    └──▶ PostgreSQL (:5432)
```

- **`nginx`** (NGINX 1.27-alpine) — the only service exposed to the host (HTTPS on 8443, HTTP→HTTPS redirect on 80). Terminates TLS, proxies `/api/` and `/socket.io/` to the API, everything else to the web app, and serves static avatars.
- **`db`** (PostgreSQL 16-alpine) — stores users, profiles, games, and leaderboard placements. Only the API talks to it.
- **`api`** (Fastify 5 + TypeScript) — authentication, the UNO game engine, room management, and real-time communication over Socket.IO.
- **`web`** (React 19 + Vite 7) — the SPA, including the Phaser 3 game canvas.

### Backend (`apps/api`)

- **`src/server.ts`** — bootstraps Fastify, registers plugins and routes, and starts Socket.IO.
- **`src/gamelogic/`** — the custom UNO engine:
  - `Card.ts`, `Deck.ts` — card model and deck generation/shuffling.
  - `Table.ts` — shared game state: draw pile, discard pile, turn order, direction, pending draws, current color.
  - `GameMaster.ts` — rule enforcement: move validation, effects of special cards (reverse, skip, +2, +4), turn advancement.
  - `Game.ts` — match lifecycle: player setup, finish/interrupt, and delegating actions to `GameMaster`.
  - `Player.ts` — player model and hand.
- **`src/gameManager/`** — room lifecycle (create/join/leave), chat, online-player tracking, drop timers and reconnection, and the transformation of server state into safe frontend payloads.
- **`src/socket/`** — Socket.IO setup, authentication middleware (JWT via cookie/handshake/header), and connection/game/room handlers.
- **`src/plugins/`** — Prisma, auth (JWT), rate-limit, and multipart (avatar upload) Fastify plugins.
- **`src/routes/`** — REST endpoints for auth, users, and profiles.
- **`prisma/`** — schema, migrations, and seed data.

### Frontend (`apps/web`)

- **`src/app/`** — app shell, React Router v7 routes, auth context/guard, and pages (home, login/signup, profile, game).
- **`src/gameCanvas/`** — the Phaser 3 engine layer, fully decoupled from React:
  - `scenes/` — `Boot`, `Preloader` (asset loading with a progress bar), `MainMenu`, `GameScene` (active gameplay), `GameOver`.
  - `managers/` — `AssetLoader`, `BoardManager`, `InputManager`, `RenderManager`, `UIManager`.
  - `models/Render.ts`, `types/`, `gameTypes.ts` — rendering model and shared types.
- **`src/socket/` & `src/network/`** — a singleton Socket.IO client and thin wrappers for game actions (`play_card`, `draw_card`, `select_wild_color`).
- **`src/events/EventBus.ts`** — bridges socket events to both React and Phaser.
- **`src/shared/`** — reusable animated UI components, primitives, and hooks (Tailwind + shadcn-style components).

### DevOps & tooling

- **Docker Compose** — four services on a shared bridge network, with health checks and named volumes.
- **Makefile** — one-command setup (`make`) that generates `.env`, self-signed TLS certificates, builds and starts all containers, runs Prisma migrations, and seeds the database.
- **Prisma** — ORM with migrations and a seed script for test users and game history.
- **Tests** — a Bash-based end-to-end test suite (`tests/`) covering auth, security, roles, sockets, friends, lobbies, games, chat, and notifications.

## 3. Skills & Tasks to Highlight for the Marketing Developer (Video & Playable Ads) Role

This section maps work done in this project to the requirements of the Goodgame Studios **Marketing Developer: Video & Playable Ads** posting.

### 3.1 Web game development in Phaser 3 (a framework named in the job ad)

- **What was done:** Built the entire interactive game canvas of the UNO game with Phaser 3 — five scenes (`Boot`, `Preloader`, `MainMenu`, `GameScene`, `GameOver`) plus five managers (`AssetLoader`, `BoardManager`, `InputManager`, `RenderManager`, `UIManager`) that handle loading, board layout, input, rendering, and HUD.
- **Why:** The job explicitly lists Phaser among the acceptable web game frameworks ("PlayCanvas, Three.js, Babylon.js, Cocos, PixiJS, or Phaser"). This project is hands-on, shipped Phaser work that can be opened in a browser — exactly the kind of interactive work the posting asks candidates to link.
- **How:** The Phaser engine was kept fully decoupled from React: a `<PhaserGame>` component mounts the canvas, and a shared `EventBus` (Phaser's EventEmitter) forwards socket `room_state` events to both React and Phaser. Rendering, input, and card layout were separated into dedicated managers so each scene stays lean.
- **Result:** A playable, 60fps, browser-rendered card game with drag/click interaction and animated feedback — direct evidence of the HTML5 game-stack ability the role demands.

### 3.2 TypeScript + JavaScript + HTML5/CSS engineering

- **What was done:** The entire codebase — backend, frontend, and game engine — is written in TypeScript, with React/JSX for UI and HTML5 canvas rendering for the game. CSS/Tailwind and animated components (`shared/`, shadcn-style primitives) provide the presentation layer.
- **Why:** The posting requires "Strong JavaScript/TypeScript, HTML5, and CSS" as a core requirement. Strong typing was used deliberately to model the card game domain safely (card values, colors, room states, socket payloads).
- **How:** Shared TypeScript types (`gameTypes.ts`, `roomTypes.ts`, and the backend's `gamelogic/` models) keep frontend, canvas, and backend in agreement; the build is compiled with `tsc -b` and bundled by Vite.
- **Result:** A large, maintainable, type-safe web game that compiles cleanly across three layers (React UI, Phaser canvas, Fastify API) — evidence of production-grade web-game engineering.

### 3.3 Fast-loading, self-contained asset pipeline

- **What was done:** Built a centralised asset pipeline with an `AssetLoader` manager and a `Preloader` scene that loads all game art (card sheets, table, backgrounds) up front and reports progress through a loading bar before gameplay begins.
- **Why:** Playable ads must be "fast-loading and self-contained" with strict single-file and size budgets. The habits required to do that — preloading all assets, keeping the asset set minimal, and not depending on network fetches at runtime — were practised here.
- **How:** Assets are bundled through Vite and served from a single origin (NGINX), with game assets colocated under `public/assets/game_assets/` and a dedicated loader that caches them for the session. Game scenes consume preloaded textures rather than fetching on demand.
- **Result:** The game boots through a controlled loading sequence to an immediately playable state, demonstrating the asset-discipline mindset that transfers directly to building and packaging network-compliant playables.

### 3.4 "Feel" and casual-mechanic satisfaction (animation & feedback)

- **What was done:** Implemented gameplay feedback with Phaser tweens and animations — for example, an animated "Wait for your turn" toast when a player interacts out of turn, card movement/placement animations, and a turn indicator HUD managed by `UIManager`.
- **Why:** The posting rewards "an eye for what makes a casual mechanic satisfying" and wants ad mechanics that convert. Juicy, immediate feedback is what makes a playable ad loop compelling enough to tap through to install.
- **How:** Phaser tween animations were used for transitions and gated interactions; `InputManager` disables drag/drop during opponents' turns and triggers the animated feedback instead, keeping the experience responsive without breaking the rules.
- **Result:** A polished, responsive game feel where every action gives immediate visual confirmation — the same craft needed to make a short playable ad engaging in its first seconds.

### 3.5 Node.js build automation & delivery tooling

- **What was done:** Built the whole delivery pipeline: a `Makefile` with one-command setup, Docker Compose orchestration of four services, Prisma migrations + seed, self-signed TLS generation, Vite production builds, and a Bash end-to-end test suite.
- **Why:** The posting lists "Node.js for build scripts and build automation" as a big plus. Packaging and finalising playables for networks is, at its core, build automation — repeatedly producing a compliant, shippable artifact.
- **How:** `make` generates environment config, builds and starts all containers, runs migrations, and seeds data; npm scripts drive dev/build/lint/preview; the test suite automates verification of the whole system.
- **Result:** A reproducible, one-command-from-clone-to-running-app build, proving the automation skills needed to script the packaging of playable ad units per network spec.

### 3.6 AI-assisted production workflow

- **What was done:** AI tools were used throughout the project for brainstorming, debugging partner code, and documentation — all human-reviewed and tested before merge.
- **Why:** The posting explicitly welcomes AI tools and asks candidates to say where they used them ("Comfort using AI tools in the production workflow (welcome and encouraged)").
- **How:** AI was applied to research solutions, understand and fix code the author didn't own, and finalise documentation; every AI-generated change was reviewed and tested by a human.
- **Result:** A documented, effective AI-assisted workflow that matches the studio's culture and can be pointed to concretely when asked where AI was used in production.

### 3.7 Real-time state synchronisation (full-stack credibility)

- **What was done:** Implemented real-time multiplayer over Socket.IO with server-authoritative game state — the API is the source of truth, and the frontend renders only the transformed, privacy-filtered state it is given (opponents' cards render as card backs only).
- **Why:** A playable ad is a self-contained simulation of a game, so understanding how game state flows between an authoritative engine and a render layer is directly transferable to making an ad play correctly with no network.
- **How:** A `Game`/`GameMaster`/`Table` engine computes every legal move server-side; socket events (`room_state`, `play_card`, `draw_card`) broadcast changes; the frontend's `EventBus` fans state out to React and Phaser.
- **Result:** A cheat-resistant, synchronised multiplayer game — evidence of solid game-loop and state-management fundamentals that underpin any interactive ad build.

### 3.8 Delivery constraints & packaging discipline

- **What was done:** Shipped the game under real infrastructure constraints: single HTTPS origin, TLS termination at the edge, minimal exposed surface (only NGINX is reachable), and strict separation between static assets, API, and database.
- **Why:** The posting requires knowledge of "single-file, no-network, MRAID, and size constraints of the major ad networks, and how to hit them without killing the experience." Working within container, network, and security budgets exercises the same discipline.
- **How:** Docker Compose isolates services, NGINX routes all traffic through one origin, and the build produces a bundled, versioned frontend rather than runtime fetches.
- **Result:** A production-shaped deliverable that respects boundary, size, and network constraints — the same engineering discipline required to package a playable that passes a network's MRAID and file-size checks.


  - name: Uno with friends
    role: Full-stack real-time multiplayer UNO game (React + Phaser 3)
    url: github.com/JSlusark/Uno
    tasks:
      - Led agile sprints across a 4-developer team shipping a TLS-encrypted real-time multiplayer UNO game (React 19, TypeScript, Phaser 3, Fastify, Socket.IO, PostgreSQL) containerised with Docker Compose behind an NGINX reverse proxy.
      - Built a responsive React UI mounting a decoupled Phaser 3 canvas via a custom EventBus, isolating game logic from the React layer and syncing state through Socket.IO in real time.
      - Crafted the gameplay feel with Phaser tween animations for card plays and an animated "wait your turn" feedback loop, plus an AssetLoader/Preloader pipeline that loads all assets up front for a fast, self-contained boot.
      - Developed a server-authoritative UNO rules engine (turn order, skip/reverse/+2/+4, wild-colour selection, mid-game player-leave edge cases) — the same game-loop fundamentals a playable ad needs to play correctly offline.
      - Automated the full delivery pipeline (Makefile, Docker Compose, Prisma migrations + seed, Vite production builds, bash end-to-end test suite) and used AI tools for brainstorming, debugging and documentation, human-reviewed before merge.