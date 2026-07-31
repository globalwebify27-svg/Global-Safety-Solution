import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Permissions('CREATE_TASK')
  create(@Body() createTaskDto: any) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @Permissions('READ_TASK')
  findAll(@Query('projectId') projectId?: string) {
    if (projectId) {
      return this.tasksService.findByProject(projectId);
    }
    return this.tasksService.findAll();
  }

  @Get(':id')
  @Permissions('READ_TASK')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @Permissions('UPDATE_TASK')
  update(@Param('id') id: string, @Body() updateTaskDto: any) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Post(':id/send-assignment')
  @Permissions('UPDATE_TASK')
  sendTaskAssignmentEmail(@Param('id') id: string, @Body('email') email?: string) {
    return this.tasksService.sendTaskAssignmentEmail(id, email);
  }

  @Delete(':id')
  @Permissions('DELETE_TASK')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
