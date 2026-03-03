import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: User): User {
    return user;
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(user.id, dto);
  }
}
