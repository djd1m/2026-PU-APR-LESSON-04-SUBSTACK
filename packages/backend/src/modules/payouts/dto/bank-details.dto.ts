import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/**
 * DTO for saving an author's bank account details.
 * All fields are stored in the Payout.bank_account JSON blob.
 */
export class BankDetailsDto {
  @ApiProperty({
    description: 'Name of the bank',
    example: 'Сбербанк',
  })
  @IsString()
  bankName: string;

  @ApiProperty({
    description: 'Bank Identification Code (БИК) — exactly 9 digits',
    example: '044525225',
  })
  @IsString()
  @Length(9, 9, { message: 'BIK must be exactly 9 characters' })
  bik: string;

  @ApiProperty({
    description: 'Bank account number — exactly 20 digits',
    example: '40817810099910004312',
  })
  @IsString()
  @Length(20, 20, { message: 'Account number must be exactly 20 characters' })
  accountNumber: string;

  @ApiPropertyOptional({
    description: 'Individual taxpayer number (ИНН) — 10 or 12 digits',
    example: '7707083893',
  })
  @IsOptional()
  @IsString()
  inn?: string;
}
