import type { Role, UserStatus } from '@skillfinder/shared';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      role: Role;
      status: UserStatus;
      email: string;
      name: string;
    }

    interface Request {
      user?: AuthUser;
      requestId?: string;
      sessionId?: string;
    }
  }
}

export {};
