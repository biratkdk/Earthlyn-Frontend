import { Injectable } from "@nestjs/common";
import { Server, Socket } from "socket.io";

@Injectable()
export class WebSocketService {
  private io?: Server;

  setServer(io: Server) {
    this.io = io;
  }

  async notifyOrderUpdate(userId: string, orderId: string, status: string) {
    this.io?.to(`user:${userId}`).emit("order-update", { orderId, status });
  }

  async notifyDeliveryUpdate(
    userId: string,
    orderId: string,
    status: string,
    trackingId?: string,
  ) {
    this.io
      ?.to(`user:${userId}`)
      .emit("delivery-update", { orderId, status, trackingId });
  }

  async notifyMessage(userId: string, message: unknown) {
    this.io?.to(`user:${userId}`).emit("new_message", message);
    this.io?.to(`user:${userId}`).emit("new-message", message);
  }

  joinUserRoom(socket: Socket, userId: string) {
    socket.join(`user:${userId}`);
  }

  leaveUserRoom(socket: Socket, userId: string) {
    socket.leave(`user:${userId}`);
  }
}
