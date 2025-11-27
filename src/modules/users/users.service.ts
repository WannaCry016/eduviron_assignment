import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { ROLE_POLICIES } from '../auth/role-policies';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultSuperAdmin();
  }

  findByUsername(username: string) {
    return this.usersRepository.findOne({ where: { username } });
  }

  private async ensureDefaultSuperAdmin() {
    const username = 'super.admin';
    const existing = await this.findByUsername(username);
    if (existing) {
      return;
    }

    const password = this.configService.get<string>(
      'auth.defaultAdminPassword',
      'ChangeMe123!',
    );

    const policy = ROLE_POLICIES[UserRole.SUPER_ADMIN];
    const passwordHash = await bcrypt.hash(password, 10);

    await this.usersRepository.save({
      username,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      permissions: policy.permissions,
      fieldMasks: policy.fieldMasks,
    });

    this.logger.warn(
      `Created default super admin user "${username}". Change the password immediately.`,
    );
  }
}

