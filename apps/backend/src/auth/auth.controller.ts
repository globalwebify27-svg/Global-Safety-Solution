import { Controller, Post, Body, UnauthorizedException, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaClient } from '@repo/database';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}
