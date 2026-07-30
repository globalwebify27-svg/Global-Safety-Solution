import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Permissions('CREATE_PROJECT')
  create(@Body() createProjectDto: any) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @Permissions('READ_PROJECT')
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id/dashboard')
  @Permissions('READ_PROJECT')
  getProjectDashboard(@Param('id') id: string) {
    return this.projectsService.getProjectDashboard(id);
  }

  @Get(':id')
  @Permissions('READ_PROJECT')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id/stage')
  @Permissions('UPDATE_PROJECT')
  updateStage(
    @Param('id') id: string,
    @Body('stage') stage: string,
    @Body('remarks') remarks?: string,
  ) {
    return this.projectsService.updateStage(id, stage, remarks);
  }

  @Patch(':id')
  @Permissions('UPDATE_PROJECT')
  update(@Param('id') id: string, @Body() updateProjectDto: any) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @Permissions('DELETE_PROJECT')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
