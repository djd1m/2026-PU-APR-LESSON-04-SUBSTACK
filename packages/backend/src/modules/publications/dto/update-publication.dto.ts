import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { CreatePublicationDto } from './create-publication.dto';

export class UpdatePublicationDto extends PartialType(CreatePublicationDto) {
  @IsOptional()
  @IsBoolean()
  paid_enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  paid_price_monthly?: number;
}
