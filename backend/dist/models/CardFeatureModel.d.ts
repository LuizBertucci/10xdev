import type { CardFeatureResponse, CardFeatureQueryParams, ModelResult, ModelListResult, CreateCardFeatureRequest } from '@/types/cardfeature';
export declare class CardFeatureModel {
    private static tableName;
    private static transformToResponse;
    private static buildQuery;
    static create(data: CreateCardFeatureRequest): Promise<ModelResult<CardFeatureResponse>>;
    static findById(id: string): Promise<ModelResult<CardFeatureResponse>>;
    static findAll(params?: CardFeatureQueryParams): Promise<ModelListResult<CardFeatureResponse>>;
    static search(searchTerm: string, params?: CardFeatureQueryParams): Promise<ModelListResult<CardFeatureResponse>>;
    static findByTech(tech: string, params?: CardFeatureQueryParams): Promise<ModelListResult<CardFeatureResponse>>;
    static update(id: string, data: Partial<CreateCardFeatureRequest>): Promise<ModelResult<CardFeatureResponse>>;
    static delete(id: string): Promise<ModelResult<null>>;
    static getStats(): Promise<ModelResult<{
        total: number;
        byTech: Record<string, number>;
        byLanguage: Record<string, number>;
        recentCount: number;
    }>>;
    static bulkCreate(items: CreateCardFeatureRequest[]): Promise<ModelListResult<CardFeatureResponse>>;
    static bulkDelete(ids: string[]): Promise<ModelResult<{
        deletedCount: number;
    }>>;
}
//# sourceMappingURL=CardFeatureModel.d.ts.map