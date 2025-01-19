import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AUTH_SESSION_COOKIE, getCookieValue } from "../auth/auth-cookie";
import { WebSocketService } from "./websocket.service";

type AuthenticatedSocket = Socket & {
  data: {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  };
};

function getSocketCorsOrigin() {
  const rawOrigin = process.env.CORS_ORIGIN || "*";
  if (rawOrigin === "*") {
    return process.env.NODE_ENV === "production" ? false : true;
  }

  return rawOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function extractToken(client: Socket) {
  return getCookieValue(client.handshake.headers.cookie, AUTH_SESSION_COOKIE);
}

@WebSocketGateway({
  cors: {
    origin: getSocketCorsOrigin(),
    credentials: true,
  },
})
@Injectable()
export class NotificationGateway implements OnGatewayInit {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly webSocketService: WebSocketService,
  ) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server);
  }

  handleConnection(client: AuthenticatedSocket) {
    const token = extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      client.join(`user:${payload.sub}`);
    } catch {
      this.logger.warn(`Rejected unauthenticated websocket ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.data.user?.id) {
      client.leave(`user:${client.data.user.id}`);
    }
  }

  @SubscribeMessage("join")
  handleJoin(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { event: "error", data: { message: "Unauthorized" } };
    }

    client.join(`user:${userId}`);
    return { event: "joined", data: { userId } };
  }

  @SubscribeMessage("send_message")
  async handleMessage(
    @MessageBody() _data: { recipientId: string; message: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const sender = client.data.user;
    if (!sender) {
      return { event: "error", data: { message: "Unauthorized" } };
    }

    this.logger.warn(`Blocked raw socket message from user ${sender.id}`);
    return {
      event: "error",
      data: {
        message: "Send messages through the persisted messaging endpoint.",
      },
    };
  }

  async broadcastTicketUpdate(ticketId: string, update: unknown) {
    this.server.emit(`ticket:${ticketId}`, update);
  }

  async notifyUser(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit("notification", notification);
  }
}

