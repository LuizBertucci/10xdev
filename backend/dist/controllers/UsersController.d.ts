import { Request, Response } from 'express';
export declare class UsersController {
    static updateValidation: import("express-validator").ValidationChain[];
    static listValidation: import("express-validator").ValidationChain[];
    static list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=UsersController.d.ts.map