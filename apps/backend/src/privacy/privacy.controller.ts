import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { PrivacyService } from "./privacy.service";
import { CreatePrivacySettingsDto } from "./dto/create-privacy-settings.dto";
import { JwtGuard } from "../common/guards/jwt.guard";
import type { PaginationQuery } from "../common/pagination";

@Controller("privacy")
@UseGuards(JwtGuard)
export class PrivacyController {
  constructor(private service: PrivacyService) {}

  @Get("settings")
  async getSettings(@Request() req) {
    return this.service.getPrivacySettings(req.user.id);
  }

  @Post("settings")
  async updateSettings(@Request() req, @Body() dto: CreatePrivacySettingsDto) {
    return this.service.updatePrivacySettings(req.user.id, dto);
  }

  @Post("export")
  async requestDataExport(@Request() req) {
    return this.service.requestDataExport(req.user.id);
  }

  @Get("exports")
  async getDataExports(@Request() req, @Query() query: PaginationQuery) {
    return this.service.getDataExports(req.user.id, query);
  }

  @Get("exports/:exportId/download")
  async downloadDataExport(
    @Request() req,
    @Param("exportId") exportId: string,
  ) {
    return this.service.downloadDataExport(req.user.id, exportId);
  }

  @Post("delete-account")
  async requestAccountDeletion(@Request() req) {
    return this.service.requestAccountDeletion(req.user.id);
  }

  @Post("cancel-deletion")
  async cancelDeletionRequest(@Request() req) {
    return this.service.cancelDeletionRequest(req.user.id);
  }
}
