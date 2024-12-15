import { IsArray, IsIn, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export const REQUIRED_KYC_DOCUMENT_TYPES = [
  "GOVT_ID",
  "BUSINESS_LICENSE",
  "BANK_STATEMENT",
] as const;

export type KycDocumentType = (typeof REQUIRED_KYC_DOCUMENT_TYPES)[number];

class KycDocumentDto {
  @IsIn(REQUIRED_KYC_DOCUMENT_TYPES)
  @IsString()
  docType: KycDocumentType;

  @IsString()
  url: string;
}

export class SubmitKycDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KycDocumentDto)
  documents: KycDocumentDto[];
}
