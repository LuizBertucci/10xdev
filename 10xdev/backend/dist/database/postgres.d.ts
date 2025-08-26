import { Pool } from 'pg';
import type { CardFeatureScreen } from '../types/cardfeature';
export declare const pool: Pool;
export interface Database {
    public: {
        Tables: {
            card_features: {
                Row: {
                    id: string;
                    title: string;
                    tech: string;
                    language: string;
                    description: string;
                    screens: CardFeatureScreen[];
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    tech: string;
                    language: string;
                    description: string;
                    screens: CardFeatureScreen[];
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    tech?: string;
                    language?: string;
                    description?: string;
                    screens?: CardFeatureScreen[];
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
    };
}
export declare const query: (text: string, params?: any[]) => Promise<import("pg").QueryResult<any>>;
//# sourceMappingURL=postgres.d.ts.map