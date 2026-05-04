import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseUUIDPipe,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException, Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiHeader,
  ApiBadRequestResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { BranchService } from './branch.service.js';
import { BranchPrescriptionTemplateService } from './branch-prescription-template.service.js';
import {
  CreateBranchDto,
  UpdateBranchDto,
  UpdateBranchSchedulingDto,
  SaveTemplateConfigDto,
  PreviewTemplateDto,
} from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';

@ApiTags('Branches')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('branches')
export class BranchController {
  constructor(
    private readonly branchService: BranchService,
    private readonly templateService: BranchPrescriptionTemplateService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new branch for the current clinic' })
  @ApiCreatedResponse({ description: 'Branch created successfully' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchService.create(clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all branches for the current clinic' })
  @ApiOkResponse({ description: 'List of branches' })
  async findAll(@CurrentClinic() clinicId: string) {
    return this.branchService.findAll(clinicId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a branch by ID' })
  @ApiOkResponse({ description: 'Branch found' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchService.findOne(clinicId, id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a branch' })
  @ApiOkResponse({ description: 'Branch updated successfully' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(clinicId, id, dto);
  }

  @Get(':id/scheduling')
  @ApiOperation({ summary: 'Get scheduling settings for a branch' })
  @ApiOkResponse({ description: 'Branch scheduling settings with defaults applied' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async getSchedulingSettings(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchService.getSchedulingSettings(clinicId, id);
  }

  @Patch(':id/scheduling')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update scheduling settings for a branch (working hours, slot duration, etc.)' })
  @ApiOkResponse({ description: 'Scheduling settings updated' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  @ApiBadRequestResponse({ description: 'Invalid scheduling settings' })
  async updateSchedulingSettings(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchSchedulingDto,
  ) {
    return this.branchService.updateSchedulingSettings(clinicId, id, dto);
  }

  // ─────────── Prescription template (custom notepad) ───────────

  @Get(':id/prescription-template')
  @ApiOperation({ summary: 'Get the branch prescription notepad template (image + zone config)' })
  async getTemplate(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.getTemplate(clinicId, id);
  }

  @Post(':id/prescription-template/image')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload the branch notepad scan (PNG or JPEG, ≤8MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ description: 'Image uploaded; returns server-validated dimensions' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  async uploadTemplateImage(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templateService.uploadImage(clinicId, id, file);
  }

  @Patch(':id/prescription-template/config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Save zone coordinates + enable the template' })
  @ApiOkResponse({ description: 'Template config saved' })
  async saveTemplateConfig(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveTemplateConfigDto,
  ) {
    return this.templateService.saveConfig(clinicId, id, dto.config, dto.enabled);
  }

  @Delete(':id/prescription-template')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove the custom template — branch falls back to default layout' })
  async deleteTemplate(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.deleteTemplate(clinicId, id);
  }

  @Post(':id/prescription-template/preview')
  @ApiOperation({ summary: 'Render a sample prescription PDF using the posted config (does not persist)' })
  @ApiOkResponse({ description: 'application/pdf binary stream' })
  async previewTemplate(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewTemplateDto,
    @Res() res: Response,
  ) {
    const buffer = await this.templateService.generatePreview(
      clinicId,
      id,
      dto.config,
      dto.with_background ?? true,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="prescription-preview.pdf"');
    res.send(buffer);
  }

  @Get(':id/prescription-template/image/:filename')
  @ApiOperation({ summary: 'Serve the raw notepad image for the designer canvas' })
  async serveTemplateImage(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('filename') filename: string,
    @Query('t') _cacheBuster: string | undefined,
    @Res() res: Response,
  ) {
    // Verify the branch belongs to the requesting clinic before exposing the image.
    await this.branchService.findOne(clinicId, id);
    const filePath = this.templateService.resolveTemplateFile(id, filename);
    if (!filePath) throw new BadRequestException('Template image not found');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filePath);
  }
}
