import type { ChatMode, Profile } from "./types.js";

export interface Participant {
  socketId: string;
  mode: ChatMode;
  profile: Profile;
}

export interface Pairing {
  roomId: string;
  a: Participant;
  b: Participant;
}

/**
 * Tracks who is waiting to be matched (per mode) and who is currently paired.
 * Pure data structure with no Socket.IO dependency so it can be unit tested.
 */
export class Matchmaker {
  private queues: Record<ChatMode, Participant[]> = {
    chat: [],
    voice: [],
  };

  /** Maps a socket id to the id of the partner it is currently paired with. */
  private partners = new Map<string, string>();

  /** Maps a socket id to the shared room id of its current pairing. */
  private rooms = new Map<string, string>();

  /**
   * Adds a participant to the queue for its mode. If someone is already
   * waiting, the two are paired and the Pairing is returned. Otherwise the
   * participant waits and `null` is returned.
   */
  enqueue(participant: Participant): Pairing | null {
    this.remove(participant.socketId);

    const queue = this.queues[participant.mode];
    const waiting = queue.find((p) => p.socketId !== participant.socketId);

    if (!waiting) {
      queue.push(participant);
      return null;
    }

    this.queues[participant.mode] = queue.filter(
      (p) => p.socketId !== waiting.socketId,
    );

    const roomId = `${waiting.socketId}#${participant.socketId}`;
    this.partners.set(waiting.socketId, participant.socketId);
    this.partners.set(participant.socketId, waiting.socketId);
    this.rooms.set(waiting.socketId, roomId);
    this.rooms.set(participant.socketId, roomId);

    return { roomId, a: waiting, b: participant };
  }

  getPartner(socketId: string): string | undefined {
    return this.partners.get(socketId);
  }

  getRoom(socketId: string): string | undefined {
    return this.rooms.get(socketId);
  }

  /**
   * Breaks up the pairing (if any) that includes `socketId` and returns the
   * partner's socket id so it can be notified.
   */
  unpair(socketId: string): string | undefined {
    const partnerId = this.partners.get(socketId);
    if (partnerId === undefined) return undefined;

    this.partners.delete(socketId);
    this.partners.delete(partnerId);
    this.rooms.delete(socketId);
    this.rooms.delete(partnerId);
    return partnerId;
  }

  /** Removes a participant from any queue (used on disconnect / re-queue). */
  private dequeue(socketId: string): void {
    (Object.keys(this.queues) as ChatMode[]).forEach((mode) => {
      this.queues[mode] = this.queues[mode].filter(
        (p) => p.socketId !== socketId,
      );
    });
  }

  /** Fully removes a socket from queues and pairings. */
  remove(socketId: string): string | undefined {
    this.dequeue(socketId);
    return this.unpair(socketId);
  }

  waitingCount(mode: ChatMode): number {
    return this.queues[mode].length;
  }
}
