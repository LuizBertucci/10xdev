export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare const supabaseAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
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
export interface CardFeatureScreen {
    name: string;
    description: string;
    code: string;
}
export declare const supabaseTyped: import("@supabase/supabase-js").SupabaseClient<Database, "public", any>;
export declare const supabaseAdminTyped: import("@supabase/supabase-js").SupabaseClient<Database, "public", any>;
//# sourceMappingURL=supabase.d.ts.map