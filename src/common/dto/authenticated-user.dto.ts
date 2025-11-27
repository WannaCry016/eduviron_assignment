export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  fieldMasks: string[];
}
