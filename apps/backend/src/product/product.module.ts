import { FileUploadService } from "../common/services/file-upload.service";
import { Module } from "@nestjs/common";
import { ProductService } from "./product.service";
import { ProductController } from "./product.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [ProductService, FileUploadService],
  controllers: [ProductController],
})
export class ProductModule {}
