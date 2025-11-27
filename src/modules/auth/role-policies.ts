import { UserRole } from '../users/entities/user.entity';

type Policy = {
  permissions: string[];
  fieldMasks: string[];
};

export const ROLE_POLICIES: Record<UserRole, Policy> = {
  [UserRole.SUPER_ADMIN]: {
    permissions: [
      'reports:read',
      'reports:pending:view',
      'reports:monitoring',
    ],
    fieldMasks: [],
  },
  [UserRole.SCHOOL_ADMIN]: {
    permissions: ['reports:read', 'reports:pending:view'],
    fieldMasks: [],
  },
  [UserRole.FINANCE_ANALYST]: {
    permissions: ['reports:read', 'reports:pending:view'],
    fieldMasks: ['student.guardianEmail'],
  },
  [UserRole.DEVELOPER]: {
    permissions: ['reports:monitoring'],
    fieldMasks: ['student.guardianEmail', 'student.guardianPhone'],
  },
};
