import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Multer } from "multer";
import { ProductService } from "./product.service";
import { FileUploadService } from "../common/services/file-upload.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { Roles, UserRole } from "../common/decorators/roles.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateProductReviewDto } from "./dto/create-product-review.dto";
import type { AuthenticatedRequest } from "../common/types/authenticated-request";
import type {
  CreateProductInput,
  ProductCatalogQuery,
  ProductMineQuery,
} from "./product.service";

@Controller("products")
export class ProductController {
  constructor(
    private productService: ProductService,
    private fileUploadService: FileUploadService,
  ) {}

  @Get()
  async findAll(@Query() query: ProductCatalogQuery) {
    return this.productService.findAllPublic(query);
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async findMine(
    @Req() req: AuthenticatedRequest,
    @Query() query: ProductMineQuery,
  ) {
    if (req.user.role === UserRole.ADMIN) {
      return this.productService.findAll(undefined, query);
    }

    return this.productService.findBySellerUserId(req.user.id, query);
  }

  @Get("recommendations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  async recommendations(
    @Req() req: AuthenticatedRequest,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = Number.parseInt(limit || "6", 10);
    return this.productService.findRecommendationsForBuyer(
      req.user.id,
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 6,
    );
  }

  @Get("categories")
  async categories() {
    return this.productService.findPublicCategories();
  }

  @Get(":id/reviews")
  async reviews(@Param("id") id: string) {
    return this.productService.getReviews(id);
  }

  @Post(":id/reviews")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  async createReview(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.productService.createReview(id, req.user.id, dto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const product = await this.productService.findPublicById(id);
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const payload: CreateProductInput = { ...createProductDto };
    if (req.user.role === UserRole.ADMIN && createProductDto.sellerId) {
      payload.sellerId = createProductDto.sellerId;
    } else {
      payload.sellerUserId = req.user.id;
    }
    return this.productService.create(payload);
  }

  @Post(":id/upload-image")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(
    @Param("id") id: string,
    @UploadedFile() file: Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    // Verify ownership
    const product = await this.productService.findOne(id);
    if (!product) {
      throw new ForbiddenException("Product not found");
    }
    if (
      req.user.role !== UserRole.ADMIN &&
      product.seller?.userId !== req.user.id
    ) {
      throw new ForbiddenException(
        "Not authorized to upload image for this product",
      );
    }

    // Upload file
    const imageUrl = await this.fileUploadService.uploadImage(file);

    // Update product with image URL
    const updated = await this.productService.update(id, { imageUrl });
    return { imageUrl, product: updated };
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      const product = await this.productService.findOne(id);
      if (!product || product.seller?.userId !== req.user.id) {
        throw new ForbiddenException("Not authorized");
      }
    }
    return this.productService.update(id, updateProductDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  async delete(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    if (req.user.role !== UserRole.ADMIN) {
      const product = await this.productService.findOne(id);
      if (!product || product.seller?.userId !== req.user.id) {
        throw new ForbiddenException("Not authorized");
      }
    }
    return this.productService.delete(id);
  }
}

