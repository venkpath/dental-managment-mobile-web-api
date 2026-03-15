import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomBytes } from 'crypto';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('CSRF')
@Controller('csrf')
export class CsrfController {
  @Public()
  @Get('token')
  @ApiOperation({ summary: 'Get CSRF token', description: 'Sets a CSRF cookie and returns the token value' })
  getToken(@Res({ passthrough: true }) res: Response): { token: string } {
    const token = randomBytes(32).toString('hex');
    res.cookie('csrf-token', token, {
      httpOnly: false,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return { token };
  }
}
