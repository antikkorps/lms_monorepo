// Authentication types

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  tenantId: string | null;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  tenantId: string | null;
  avatarUrl: string | null;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

export type Role =
  | 'super_admin'
  | 'tenant_admin'
  | 'manager'
  | 'instructor'
  | 'learner';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

export type RolePermissions = Record<Role, Permission[]>;

// Session context attached to API requests
export interface SessionContext {
  user: AuthenticatedUser;
  tenantId: string | null;
  requestId: string;
}
