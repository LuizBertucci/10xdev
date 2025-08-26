import { Response } from 'express';
import type { CreateCardFeatureRequest, CardFeatureScreen } from '../types/cardfeature';
export declare function validateScreens(screens: CardFeatureScreen[], context?: string): string | null;
export declare function validateCardFeatureData(data: CreateCardFeatureRequest, context?: string): string | null;
export declare function sendErrorResponse(res: Response, error: any, operation: string, statusCode?: number): void;
export declare function sendSuccessResponse(res: Response, data: any, message?: string, statusCode?: number): void;
export declare function sendValidationError(res: Response, error: string): void;
export declare function validatePartialCardFeatureData(data: Partial<CreateCardFeatureRequest>, context?: string): string | null;
//# sourceMappingURL=validation.d.ts.map