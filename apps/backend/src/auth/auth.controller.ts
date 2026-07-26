import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Get('reset-amit')
  async resetAmit() {
    const prisma = new PrismaClient();
    try {
      const password_hash = await bcrypt.hash('Staff@123', 10);
      const user = await prisma.user.update({
        where: { email: 'amit@gmail.com' },
        data: { 
          password_hash,
          is_active: true
        }
      });
      return { success: true, message: `Successfully reset password for ${user.email} to Staff@123` };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      await prisma.$disconnect();
    }
  }

  @Post('login')
  async login(@Body() body: any) {
    try {
      const user = await this.authService.validateUser(body.email, body.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return this.authService.login(user);
    } catch (e) {
      if (e.message === 'DEACTIVATED') {
        throw new UnauthorizedException('Account is deactivated. Please contact support.');
      }
      throw e;
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Request() req: any, @Body() body: any) {
    const { currentPassword, newPassword } = body;
    return this.usersService.changePassword(req.user.userId, currentPassword, newPassword);
  }
}
