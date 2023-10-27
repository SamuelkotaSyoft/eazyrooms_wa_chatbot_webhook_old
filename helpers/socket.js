import { io } from "socket.io-client";

export const socket = io("https://eazyrooms-live-chat-service.onrender.com", {
  autoConnect: false,
});

socket.connect();
socket.emit("join", { locationId: `wa-webhook` });
