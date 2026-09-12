# Wave

> Create your station. Find your people.

Wave is a lightweight community radio-station social app. Create public or private stations, discover communities, join conversations, and build a place for your people.

Made by Atharva Phadnis.

## Stack

- Next.js 16 + React for the responsive web interface
- Node.js + Express for the API server
- SQLite via better-sqlite3 for persistent local data
- WebSockets via `ws` for station-scoped chat, typing, and presence
- Electron + electron-builder for a self-contained Windows desktop build

## Local development

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev:all
```

Open `http://localhost:3000`. The API and WebSocket server runs at `http://127.0.0.1:3001` and stores the SQLite database in `./data/wave.sqlite`.

For production:

```bash
pnpm build
pnpm server
pnpm start
```

Optional environment variables are documented in `.env.example`. Set `SESSION_SECRET` in production. Never commit `.env`, `data/`, uploads, or generated builds.

## Windows EXE

Build the desktop package with:

```bash
pnpm dist:win
```

The installer and portable artifacts are written to `dist/`. The packaged application includes its runtime and does not require users to install Node.js or manually start the server. The app stores its local database in the configured Wave data directory.

## Security notes

Passwords are bcrypt-hashed. Sessions use random HTTP-only cookies with hashed server-side tokens. Station discovery only returns public stations, station membership and admin actions are checked server-side, SQL uses prepared statements, chat history is bounded, and user content is rendered as text rather than HTML.

## License

MIT — see `LICENSE`.
