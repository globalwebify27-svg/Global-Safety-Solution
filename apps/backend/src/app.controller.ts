import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('diagnose-paths')
  async diagnosePaths() {
    const fs = require('fs');
    const path = require('path');
    const results: any = {
      platform: process.platform,
      cwd: process.cwd(),
      env: process.env.PERSISTENT_UPLOAD_DIR,
      homeExists: fs.existsSync('/home/u745630191'),
      homeFiles: [],
      uploadsExists: fs.existsSync('/home/u745630191/persistent_uploads'),
      uploadsFiles: []
    };
    try {
      if (results.homeExists) {
        results.homeFiles = fs.readdirSync('/home/u745630191');
      }
    } catch (e: any) { results.homeError = e.message; }
    try {
      if (results.uploadsExists) {
        results.uploadsFiles = fs.readdirSync('/home/u745630191/persistent_uploads');
      }
    } catch (e: any) { results.uploadsError = e.message; }
    return results;
  }
}
