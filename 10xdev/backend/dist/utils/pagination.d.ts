import { Request } from 'express';
import type { CardFeatureQueryParams } from '../types/cardfeature';
export declare function extractPaginationParams(req: Request): {
    page: number;
    limit: number;
};
export declare function buildQueryParams(req: Request, extraParams?: Partial<CardFeatureQueryParams>): CardFeatureQueryParams;
export declare function buildPaginatedResponse(result: any, params: CardFeatureQueryParams, extraData?: any): any;
//# sourceMappingURL=pagination.d.ts.map