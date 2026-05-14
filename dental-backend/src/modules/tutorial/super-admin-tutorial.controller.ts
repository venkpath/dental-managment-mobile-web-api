import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { TutorialService } from './tutorial.service.js';
import { CreateTutorialDto, UpdateTutorialDto } from './dto/index.js';

@ApiTags('Super Admin · Tutorials')
@Controller('super-admins/tutorials')
export class SuperAdminTutorialController {
  constructor(private readonly service: TutorialService) {}

  @Get()
  @SuperAdmin()
  @ApiOperation({ summary: 'List all tutorials (unfiltered, includes unpublished)' })
  async list() {
    return this.service.listAllForAdmin();
  }

  @Post()
  @SuperAdmin()
  @ApiOperation({ summary: 'Register a tutorial after manually uploading the video to S3' })
  async create(@Body() dto: CreateTutorialDto) {
    return this.service.createTutorial(dto);
  }

  @Patch(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update tutorial metadata' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTutorialDto,
  ) {
    return this.service.updateTutorial(id, dto);
  }

  @Delete(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Delete tutorial (S3 object not removed; do that manually if desired)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteTutorial(id);
  }
}
