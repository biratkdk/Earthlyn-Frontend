import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Multer } from "multer";
import { SellerKycService } from "./seller-kyc.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import {
  KycDocumentType,
  REQUIRED_KYC_DOCUMENT_TYPES,
  SubmitKycDto,
} from "./dto/submit-kyc.dto";
import { FileUploadService } from "../common/services/file-upload.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import type { KycRequestQuery } from "./seller-kyc.service";

@Controller("seller/kyc")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN)
export class SellerKycController {
  constructor(
    private readonly service: SellerKycService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post("submit")
  async submitDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitKycDto,
  ) {
    return this.service.submitKycDocuments(user.id, dto);
  }

  @Post("submit-files")
  @UseInterceptors(FilesInterceptor("documents", 3))
  async submitDocumentFiles(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files: Multer.File[],
    @Body("docTypes") rawDocTypes?: string | string[],
  ) {
    const docTypes = this.parseDocTypes(rawDocTypes);

    if (!files?.length) {
      throw new BadRequestException("At least one document file is required");
    }

    if (files.length !== docTypes.length || docTypes.some((type) => !type)) {
      throw new BadRequestException("Each document file requires a docType");
    }

    const uploadedDocuments = await Promise.all(
      files.map(async (file, index) => ({
        docType: docTypes[index],
        url: await this.fileUploadService.uploadDocument(file),
      })),
    );

    return this.service.submitKycDocuments(user.id, {
      documents: uploadedDocuments,
    });
  }

  private parseDocTypes(rawDocTypes?: string | string[]): KycDocumentType[] {
    const docTypes = (
      Array.isArray(rawDocTypes) ? rawDocTypes : [rawDocTypes]
    ).filter((type): type is string => Boolean(type));

    const invalidType = docTypes.find(
      (type) => !REQUIRED_KYC_DOCUMENT_TYPES.includes(type as KycDocumentType),
    );

    if (invalidType) {
      throw new BadRequestException(
        `Invalid KYC document type: ${invalidType}`,
      );
    }

    return docTypes as KycDocumentType[];
  }

  @Get("status")
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getKycStatus(user.id);
  }
}

@Controller("admin/kyc")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class KycAdminController {
  constructor(private readonly service: SellerKycService) {}

  @Get()
  async getRequests(@Query() query: KycRequestQuery) {
    return this.service.getKycRequests(query);
  }

  @Get("pending")
  async getPending(@Query() query: PaginationQuery) {
    return this.service.getPendingKycRequests(query);
  }

  @Get(":sellerId")
  async getDetail(@Param("sellerId") sellerId: string) {
    return this.service.getKycRequestDetail(sellerId);
  }

  @Post(":sellerId/approve")
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param("sellerId") sellerId: string,
  ) {
    return this.service.approveKyc(user.id, sellerId);
  }

  @Post(":sellerId/reject")
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("sellerId") sellerId: string,
    @Body("reason") reason?: string,
  ) {
    return this.service.rejectKyc(user.id, sellerId, reason);
  }
}
