import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../types";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? undefined;

/**
 * Connects to the Socket.IO server. In development the Vite proxy forwards
 * `/socket.io` to the backend, so no explicit URL is needed. In production set
 * `VITE_SERVER_URL` if the backend lives on a different origin.
 */
export function createSocket(): AppSocket {
  return io(SERVER_URL, { autoConnect: true });
}
