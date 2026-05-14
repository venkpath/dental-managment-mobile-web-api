import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { TutorialService } from './tutorial.service.js';
import { UpdateProgressDto } from './dto/index.js';

interface RequestUser {
  userId: string;
  clinicId: string;
  role: string;
  branchId: string | null;
}

@ApiTags('Tutorials')
@Controller('tutorials')
export class TutorialController {
  constructor(private readonly service: TutorialService) {}

  @Get()
  @ApiOperation({ summary: 'List tutorials visible to the current user (role-filtered)' })
  async list(@CurrentUser() user: RequestUser) {
    return this.service.listForUser(user.userId, user.role);
  }

  @Get(':id/stream-url')
  @ApiOperation({ summary: 'Get a short-lived signed video URL for a tutorial' })
  async getStreamUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getStreamUrl(id, user.userId, user.role);
  }

  @Post(':id/progress')
  @ApiOperation({ summary: 'Update watch progress / mark completed' })
  async updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.service.updateProgress(id, user.userId, user.role, dto);
  }
}
