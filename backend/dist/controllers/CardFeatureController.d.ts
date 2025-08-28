import { Request, Response } from 'express';
export declare class CardFeatureController {
    static create(req: Request, res: Response): Promise<void>;
    static getAll(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static search(req: Request, res: Response): Promise<void>;
    static getByTech(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getStats(req: Request, res: Response): Promise<void>;
    static bulkCreate(req: Request, res: Response): Promise<void>;
    static bulkDelete(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=CardFeatureController.d.ts.map