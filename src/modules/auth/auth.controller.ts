import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  @Get('me')
  getMe(@CurrentUser() user: User): User {
    return user;
  }
}
