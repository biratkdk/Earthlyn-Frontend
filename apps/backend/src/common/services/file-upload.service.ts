import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type { Multer } from "multer";

type UploadStorageDriver = "local" | "s3";
type UploadKind = "images" | "videos" | "documents";

@Injectable()
export class FileUploadService implements OnModuleInit {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadDir: string;
  private readonly storageDriver: UploadStorageDriver;
  private readonly s3Client?: S3Client;
  private readonly s3Bucket?: string;
  private readonly s3PublicBaseUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir =
      this.configService.get<string>("UPLOAD_DIR") ||
      process.env.UPLOAD_DIR ||
      path.join(process.cwd(), "public", "uploads");
    this.storageDriver = this.getStorageDriver();

    if (this.storageDriver === "s3") {
      this.s3Bucket = this.configService.get<string>("UPLOAD_S3_BUCKET");
      this.s3PublicBaseUrl = this.configService.get<string>(
        "UPLOAD_S3_PUBLIC_BASE_URL",
      );
      const endpoint = this.configService.get<string>("UPLOAD_S3_ENDPOINT");
      const region =
        this.configService.get<string>("UPLOAD_S3_REGION") || "auto";
      const accessKeyId = this.configService.get<string>(
        "UPLOAD_S3_ACCESS_KEY_ID",
      );
      const secretAccessKey = this.configService.get<string>(
        "UPLOAD_S3_SECRET_ACCESS_KEY",
      );

      if (
        !this.s3Bucket ||
        !this.s3PublicBaseUrl ||
        !accessKeyId ||
        !secretAccessKey
      ) {
        throw new Error(
          "S3 upload storage requires UPLOAD_S3_BUCKET, UPLOAD_S3_PUBLIC_BASE_URL, UPLOAD_S3_ACCESS_KEY_ID, and UPLOAD_S3_SECRET_ACCESS_KEY",
        );
      }

      this.s3Client = new S3Client({
        region,
        endpoint,
        forcePathStyle:
          this.configService.get<string>("UPLOAD_S3_FORCE_PATH_STYLE") ===
          "true",
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  async onModuleInit() {
    if (this.storageDriver !== "local") {
      return;
    }

    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error(
        "Failed to create upload directory",
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async uploadImage(file: Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Only image files are allowed");
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("File size exceeds 5MB limit");
    }

    try {
      return this.storeFile(file, "images");
    } catch {
      throw new BadRequestException("File upload failed");
    }
  }

  async uploadVideo(file: Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    if (!file.mimetype.startsWith("video/")) {
      throw new BadRequestException("Only video files are allowed");
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("File size exceeds 100MB limit");
    }

    try {
      return this.storeFile(file, "videos");
    } catch {
      throw new BadRequestException("File upload failed");
    }
  }

  async uploadDocument(file: Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const allowedTypes = ["application/pdf"];
    const isAllowed =
      file.mimetype.startsWith("image/") ||
      allowedTypes.includes(file.mimetype);
    if (!isAllowed) {
      throw new BadRequestException("Only image or PDF documents are allowed");
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("File size exceeds 10MB limit");
    }

    try {
      return this.storeFile(file, "documents");
    } catch {
      throw new BadRequestException("File upload failed");
    }
  }

  private getStorageDriver(): UploadStorageDriver {
    const rawDriver = (
      this.configService.get<string>("UPLOAD_STORAGE_DRIVER") ||
      process.env.UPLOAD_STORAGE_DRIVER ||
      "local"
    ).toLowerCase();

    if (rawDriver === "s3") {
      return "s3";
    }

    return "local";
  }

  private async storeFile(file: Multer.File, kind: UploadKind) {
    const extension = path.extname(file.originalname).toLowerCase();
    const fileName = `${crypto.randomBytes(16).toString("hex")}_${Date.now()}${extension}`;

    if (this.storageDriver === "s3") {
      return this.storeS3File(file, `${kind}/${fileName}`);
    }

    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);
    return `/uploads/${fileName}`;
  }

  private async storeS3File(file: Multer.File, key: string) {
    if (!this.s3Client || !this.s3Bucket || !this.s3PublicBaseUrl) {
      throw new Error("S3 upload storage is not initialized");
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return `${this.s3PublicBaseUrl.replace(/\/$/, "")}/${key}`;
  }
}
