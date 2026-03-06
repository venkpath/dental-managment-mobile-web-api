import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { LoginDto } from './dto/index.js';

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    clinic_id: string;
    branch_id: string | null;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.userService.findByEmail(dto.email, dto.clinic_id);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordValid = await this.passwordService.verify(dto.password, user.password_hash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      type: 'user',
      clinic_id: user.clinic_id,
      role: user.role,
      branch_id: user.branch_id,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        clinic_id: user.clinic_id,
        branch_id: user.branch_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }
}
