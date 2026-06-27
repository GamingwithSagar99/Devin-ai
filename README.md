# Random Chat

An Omegle-style web app where random people are matched to talk to each other via
**text chat** or **voice call**. Each user has an editable profile (name, age,
gender, interests).

## Tech stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + Socket.IO (matchmaking + WebRTC signaling)
- **Voice:** WebRTC peer-to-peer (microphone), signaled through the server
- **Profile:** stored in the browser via `localStorage` (no account required for v1)

## Project layout

```
server/   Node + Socket.IO matchmaking & signaling server
client/   React + Vite single-page app
```

## Getting started

Install dependencies for both packages:

```bash
npm install --prefix server
npm install --prefix client
```

Run the backend (defaults to port 3001):

```bash
npm run dev --prefix server
```

Run the frontend (defaults to port 5173, proxies `/socket.io` to the backend):

```bash
npm run dev --prefix client
```

Open http://localhost:5173 in two different browsers/tabs to get matched.

## How matchmaking works

1. A user picks a mode (**chat** or **voice**) and clicks *Start*.
2. The server puts them in a waiting queue for that mode.
3. When another user is waiting in the same mode, the two are paired into a room.
4. Text messages and WebRTC signaling data are relayed between the pair.
5. *Next* leaves the current partner and re-enters the queue; *Stop* ends the session.

## Environment variables

### Server (`server/.env`)

| Variable       | Default | Description                          |
| -------------- | ------- | ------------------------------------ |
| `PORT`         | `3001`  | Port the Socket.IO server listens on |
| `CLIENT_ORIGIN`| `*`     | Allowed CORS origin for the client   |

### Client (`client/.env`)

| Variable        | Default            | Description                                |
| --------------- | ------------------ | ------------------------------------------ |
| `VITE_SERVER_URL` | (same origin/proxy) | Socket.IO server URL in production builds |
