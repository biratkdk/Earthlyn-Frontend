import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import {
  decryptText,
  encryptText,
  getEncryptionKey,
} from "../common/utils/crypto";
import { WebSocketService } from "../websocket/websocket.service";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";
import { SAFE_USER_SELECT, type SafeUser } from "../common/prisma-selects";

type ConversationMessageRow = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  otherUserId: string;
};

@Injectable()
export class MessagingService {
  private encryptionKey: Buffer;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Optional() private webSocketService?: WebSocketService,
  ) {
    const rawKey = this.configService.get<string>("MESSAGE_ENCRYPTION_KEY");
    if (!rawKey) {
      throw new Error("MESSAGE_ENCRYPTION_KEY is not configured");
    }
    this.encryptionKey = getEncryptionKey(rawKey);
  }

  async sendMessage(createMessageDto: CreateMessageDto) {
    const receiver = await this.prisma.user.findUnique({
      where: { id: createMessageDto.receiverId },
      select: { id: true, isActive: true },
    });

    if (!receiver || !receiver.isActive) {
      throw new NotFoundException("Receiver not found");
    }

    const message = await this.prisma.message.create({
      data: {
        senderId: createMessageDto.senderId,
        receiverId: createMessageDto.receiverId,
        content: encryptText(createMessageDto.content, this.encryptionKey),
      },
      include: {
        sender: { select: SAFE_USER_SELECT },
        receiver: { select: SAFE_USER_SELECT },
      },
    });

    const payload = {
      ...message,
      content: createMessageDto.content,
    };

    await this.webSocketService?.notifyMessage(message.receiverId, payload);
    await this.webSocketService?.notifyMessage(message.senderId, payload);

    return payload;
  }

  async getConversation(
    userId: string,
    otherUserId: string,
    paginationQuery?: PaginationQuery,
  ) {
    const pagination = getPaginationParams({
      pageSize: 50,
      ...paginationQuery,
    });
    const where = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    };
    const [messages, totalItems] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.message.count({ where }),
    ]);
    const items = messages.map((m) => ({
      ...m,
      content: decryptText(m.content, this.encryptionKey),
    }));

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async getUserConversations(
    userId: string,
    paginationQuery?: PaginationQuery,
  ) {
    const pagination = getPaginationParams({
      pageSize: 50,
      ...paginationQuery,
    });
    const [latestMessages, totalRows] = await Promise.all([
      this.prisma.$queryRaw<ConversationMessageRow[]>(Prisma.sql`
        WITH ranked_messages AS (
          SELECT
            id,
            sender_id AS "senderId",
            receiver_id AS "receiverId",
            content,
            is_read AS "isRead",
            read_at AS "readAt",
            created_at AS "createdAt",
            CASE
              WHEN sender_id = ${userId} THEN receiver_id
              ELSE sender_id
            END AS "otherUserId",
            ROW_NUMBER() OVER (
              PARTITION BY CASE
                WHEN sender_id = ${userId} THEN receiver_id
                ELSE sender_id
              END
              ORDER BY created_at DESC, id DESC
            ) AS "messageRank"
          FROM messages
          WHERE sender_id = ${userId} OR receiver_id = ${userId}
        )
        SELECT
          id,
          "senderId",
          "receiverId",
          content,
          "isRead",
          "readAt",
          "createdAt",
          "otherUserId"
        FROM ranked_messages
        WHERE "messageRank" = 1
        ORDER BY "createdAt" DESC, id DESC
        LIMIT ${pagination.take}
        OFFSET ${pagination.skip}
      `),
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM (
          SELECT DISTINCT
            CASE
              WHEN sender_id = ${userId} THEN receiver_id
              ELSE sender_id
            END AS other_user_id
          FROM messages
          WHERE sender_id = ${userId} OR receiver_id = ${userId}
        ) conversations
      `),
    ]);

    const totalItems = Number(totalRows[0]?.total ?? 0);
    const otherUserIds = latestMessages.map((message) => message.otherUserId);
    const participantIds = Array.from(
      new Set(
        latestMessages.flatMap((message) => [
          message.senderId,
          message.receiverId,
        ]),
      ),
    );
    const users = participantIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: participantIds } },
          select: SAFE_USER_SELECT,
        })
      : [];
    const userById = new Map<string, SafeUser>(
      users.map((user) => [user.id, user]),
    );
    const unreadCounts = otherUserIds.length
      ? await this.prisma.message.groupBy({
          by: ["senderId"],
          where: {
            senderId: { in: otherUserIds },
            receiverId: userId,
            isRead: false,
          },
          _count: { _all: true },
        })
      : [];
    const unreadCountBySender = new Map(
      unreadCounts.map((row) => [row.senderId, row._count._all]),
    );
    const conversations = latestMessages.map((message) => ({
      ...message,
      content: decryptText(message.content, this.encryptionKey),
      sender: userById.get(message.senderId) ?? null,
      receiver: userById.get(message.receiverId) ?? null,
      unreadCount: unreadCountBySender.get(message.otherUserId) || 0,
    }));

    return buildPaginatedResponse(conversations, totalItems, pagination);
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { receiverId: true },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.receiverId !== userId) {
      throw new ForbiddenException(
        "Not authorized to mark this message as read",
      );
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markConversationAsRead(userId: string, otherUserId: string) {
    return this.prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markConversationAsUnread(userId: string, otherUserId: string) {
    return this.prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: true,
      },
      data: {
        isRead: false,
        readAt: null,
      },
    });
  }
}

