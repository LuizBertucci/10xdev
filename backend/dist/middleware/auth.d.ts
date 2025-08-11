import { Request, Response, NextFunction } from 'express';
import { UserRole, UserPublic } from '@/models/UserModel';
declare global {
    namespace Express {
        interface Request {
            user?: UserPublic;
        }
    }
}
export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    jti: string;
    iat: number;
    exp: number;
}
export declare class AuthMiddleware {
    private static JWT_SECRET;
    private static JWT_EXPIRES_IN;
    static generateToken(user: UserPublic): string;
    static verifyToken(token: string): JwtPayload;
    static authenticate: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    static requireRole(role: UserRole): (req: Request, res: Response, next: NextFunction) => any;
    static requireAdmin: (req: Request, res: Response, next: NextFunction) => any;
    static requireUser: (req: Request, res: Response, next: NextFunction) => any;
    static revokeToken(token: string): Promise<void>;
    static optional: (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=auth.d.ts.map