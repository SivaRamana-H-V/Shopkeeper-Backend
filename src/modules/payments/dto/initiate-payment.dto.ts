import { IsDecimal, IsNotEmpty } from 'class-validator';

export class InitiatePaymentDto {
  @IsDecimal({ decimal_digits: '0,2' })
  @IsNotEmpty()
  amount: string;
}
