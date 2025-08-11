import { Request, Response } from 'express';
export declare class AuthController {
    static registrationValidation: import("express-validator").ValidationChain[];
    static loginValidation: import("express-validator").ValidationChain[];
    static register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static logout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static me(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static refreshToken(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=AuthController.d.ts.map