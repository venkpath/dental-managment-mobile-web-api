import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../common/services/password.service.js';
import { SuperAdminJwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { SuperAdminService } from './super-admin.service.js';
import { LoginSuperAdminDto } from './dto/index.js';

export interface SuperAdminLoginResponse {
  access_token: string;
  super_admin: {
    id: string;
    name: string;
    email: string;
  };
}

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginSuperAdminDto): Promise<SuperAdminLoginResponse> {
    const admin = await this.superAdminService.findByEmail(dto.email);

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (admin.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordValid = await this.passwordService.verify(dto.password, admin.password_hash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: SuperAdminJwtPayload = {
      sub: admin.id,
      type: 'super_admin',
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      super_admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    };
  }
}
