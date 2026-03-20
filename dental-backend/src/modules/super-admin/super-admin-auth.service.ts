import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../common/services/password.service.js';
import { JwtPayload, SuperAdminJwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { PrismaService } from '../../database/prisma.service.js';
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
    private readonly prisma: PrismaService,
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

  async impersonate(clinicId: string) {
    // Find the clinic and its admin user
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const adminUser = await this.prisma.user.findFirst({
      where: { clinic_id: clinicId, role: 'Admin' },
    });
    if (!adminUser) throw new NotFoundException('No admin user found for this clinic');

    const payload: JwtPayload = {
      sub: adminUser.id,
      type: 'user',
      clinic_id: clinicId,
      role: adminUser.role,
      branch_id: adminUser.branch_id,
    };

    return {
      access_token: await this.jwtService.signAsync(payload, { expiresIn: '2h' }),
      clinic: { id: clinic.id, name: clinic.name },
      user: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
    };
  }
}
