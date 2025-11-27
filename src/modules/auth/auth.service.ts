import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(payload: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.validateUser(payload.username, payload.password);
    const expiresIn = (this.configService.get<string>('auth.jwtExpiration') ??
      '4h') as SignOptions['expiresIn'];

    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        fieldMasks: user.fieldMasks,
      },
      {
        secret: this.configService.getOrThrow<string>('auth.jwtSecret'),
        expiresIn,
      },
    );

    return {
      accessToken: token,
      expiresIn,
    };
  }
}
