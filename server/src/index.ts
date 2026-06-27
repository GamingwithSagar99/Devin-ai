import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { Matchmaker, type Participant } from "./matchmaker.js";
import type {
  ClientToServerEvents,
  FindPayload,
  Profile,
  ServerToClientEvents,
} from "./types.js";

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "*";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: CLIENT_ORIGIN },
});

const matchmaker = new Matchmaker();

function broadcastOnlineCount(): void {
  io.emit("online-count", io.engine.clientsCount);
}

function sanitizeProfile(input: unknown): Profile {
  const raw = (input ?? {}) as Partial<Profile>;
  const name =
    typeof raw.name === "string" && raw.name.trim().length > 0
      ? raw.name.trim().slice(0, 40)
      : "Anonymous";
  const age =
    typeof raw.age === "number" && Number.isFinite(raw.age)
      ? Math.min(120, Math.max(13, Math.round(raw.age)))
      : null;
  const allowedGenders = ["male", "female", "other", "prefer-not-to-say"];
  const gender =
    typeof raw.gender === "string" && allowedGenders.includes(raw.gender)
      ? (raw.gender as Profile["gender"])
      : "";
  const interests = Array.isArray(raw.interests)
    ? raw.interests
        .filter((i): i is string => typeof i === "string")
        .map((i) => i.trim())
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return { name, age, gender, interests };
}

io.on("connection", (socket) => {
  broadcastOnlineCount();

  const tryMatch = (payload: FindPayload): void => {
    const mode = payload?.mode === "voice" ? "voice" : "chat";
    const participant: Participant = {
      socketId: socket.id,
      mode,
      profile: sanitizeProfile(payload?.profile),
    };

    const pairing = matchmaker.enqueue(participant);
    if (!pairing) {
      socket.emit("waiting");
      return;
    }

    socket.join(pairing.roomId);
    io.sockets.sockets.get(pairing.a.socketId)?.join(pairing.roomId);

    // The first peer that was already waiting initiates the WebRTC offer.
    io.to(pairing.a.socketId).emit("matched", {
      roomId: pairing.roomId,
      mode,
      partner: pairing.b.profile,
      initiator: true,
    });
    io.to(pairing.b.socketId).emit("matched", {
      roomId: pairing.roomId,
      mode,
      partner: pairing.a.profile,
      initiator: false,
    });
  };

  socket.on("find", (payload) => tryMatch(payload));

  socket.on("message", (payload) => {
    const partnerId = matchmaker.getPartner(socket.id);
    if (!partnerId) return;
    const text =
      typeof payload?.text === "string" ? payload.text.slice(0, 2000) : "";
    if (!text.trim()) return;
    io.to(partnerId).emit("message", { text, at: Date.now() });
  });

  socket.on("typing", (payload) => {
    const partnerId = matchmaker.getPartner(socket.id);
    if (!partnerId) return;
    io.to(partnerId).emit("typing", { typing: Boolean(payload?.typing) });
  });

  socket.on("signal", (payload) => {
    const partnerId = matchmaker.getPartner(socket.id);
    if (!partnerId) return;
    io.to(partnerId).emit("signal", { data: payload?.data });
  });

  const leavePartner = (): void => {
    const partnerId = matchmaker.unpair(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("partner-left");
    }
  };

  socket.on("next", () => {
    leavePartner();
  });

  socket.on("stop", () => {
    matchmaker.remove(socket.id);
    leavePartner();
  });

  socket.on("disconnect", () => {
    const partnerId = matchmaker.remove(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("partner-left");
    }
    broadcastOnlineCount();
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Random Chat server listening on port ${PORT}`);
});
