/**
 * Centralized socket configuration
 * All socket connections should use this file
 */

import { io } from "socket.io-client";
import API_CONFIG from "./apiConfig";

let sharedSocket = null;
let sharedToken = "";
let subscribersCount = 0;

const buildSocket = (token) =>
  io(API_CONFIG.MAIN_API.baseUrl, {
    auth: { token: `Bearer ${token}` },
    transports: ["websocket"],
  });

/**
 * Returns shared socket and increases active subscribers count.
 * It prevents unnecessary reconnects between pages/components.
 */
export function acquireSocketConnection(token) {
  if (!token) {
    console.warn("Socket connection requires a token");
    return null;
  }

  if (!sharedSocket || sharedToken !== token) {
    if (sharedSocket) {
      sharedSocket.disconnect();
    }
    sharedSocket = buildSocket(token);
    sharedToken = token;
    subscribersCount = 0;
  }

  subscribersCount += 1;
  return sharedSocket;
}

/**
 * Decreases subscribers count and disconnects shared socket
 * only when no consumer is left.
 */
export function releaseSocketConnection(socket) {
  if (!socket || !sharedSocket) return;

  if (socket !== sharedSocket) {
    socket.disconnect();
    return;
  }

  subscribersCount = Math.max(subscribersCount - 1, 0);
  if (subscribersCount > 0) return;

  sharedSocket.disconnect();
  sharedSocket = null;
  sharedToken = "";
}
