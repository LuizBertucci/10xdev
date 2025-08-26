"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardFeatureModel = void 0;
const supabase_1 = require("../database/supabase");
const crypto_1 = require("crypto");
class CardFeatureModel {
    static tableName = 'card_features';
    static transformToResponse(row) {
        return {
            id: row.id,
            title: row.title,
            tech: row.tech,
            language: row.language,
            description: row.description,
            screens: row.screens,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    static buildQuery(params = {}) {
        let query = supabase_1.supabaseTyped
            .from(this.tableName)
            .select('*', { count: 'exact' });
        if (params.tech && params.tech !== 'all') {
            query = query.ilike('tech', params.tech);
        }
        if (params.language && params.language !== 'all') {
            query = query.ilike('language', params.language);
        }
        if (params.search) {
            query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,tech.ilike.%${params.search}%`);
        }
        const sortBy = params.sortBy || 'created_at';
        const sortOrder = params.sortOrder || 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        if (params.page && params.limit) {
            const from = (params.page - 1) * params.limit;
            const to = from + params.limit - 1;
            query = query.range(from, to);
        }
        return query;
    }
    static async create(data) {
        try {
            const insertData = {
                id: (0, crypto_1.randomUUID)(),
                title: data.title,
                tech: data.tech,
                language: data.language,
                description: data.description,
                screens: data.screens,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const { data: result, error } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .insert(insertData)
                .select()
                .single();
            if (error) {
                console.error('Erro ao criar CardFeature:', error);
                return {
                    success: false,
                    error: error.message,
                    statusCode: 400
                };
            }
            return {
                success: true,
                data: this.transformToResponse(result),
                statusCode: 201
            };
        }
        catch (error) {
            console.error('Erro interno ao criar CardFeature:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
    static async findById(id) {
        try {
            const { data, error } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return {
                        success: false,
                        error: 'CardFeature não encontrado',
                        statusCode: 404
                    };
                }
                return {
                    success: false,
                    error: error.message,
                    statusCode: 400
                };
            }
            return {
                success: true,
                data: this.transformToResponse(data),
                statusCode: 200
            };
        }
        catch (error) {
            console.error('Erro interno ao buscar CardFeature:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
    static async findAll(params = {}) {
        try {
            const query = this.buildQuery(params);
            const { data, error, count } = await query;
            if (error) {
                return {
                    success: false,
                    error: error.message,
                    statusCode: 400
                };
            }
            const transformedData = data?.map(row => this.transformToResponse(row)) || [];
            return {
                success: true,
                data: transformedData,
                count: count || 0,
                statusCode: 200
            };
        }
        catch (error) {
            console.error('Erro interno ao listar CardFeatures:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
    static async search(searchTerm, params = {}) {
        try {
            const searchParams = { ...params, search: searchTerm };
            return await this.findAll(searchParams);
        }
        catch (error) {
            console.error('Erro interno ao buscar CardFeatures:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
    static async findByTech(tech, params = {}) {
        try {
            const techParams = { ...params, tech };
            return await this.findAll(techParams);
        }
        catch (error) {
            console.error('Erro interno ao buscar CardFeatures por tech:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
    static async update(id, data) {
        try {
            const existingCheck = await this.findById(id);
            if (!existingCheck.success) {
                return existingCheck;
            }
            const updateData = {
                ...data,
                updated_at: new Date().toISOString()
            };
            const { data: result, error } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                return {
                    success: false,
                    error: error.message,
                    statusCode: 400
                };
            }
            return {
                success: true,
                data: this.transformToResponse(result),
                statusCode: 200
            };
        }
        catch (error) {
            console.error('Erro interno ao atualizar CardFeature:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
    static async delete(id) {
        try {
            const existingCheck = await this.findById(id);
            if (!existingCheck.success) {
                return {
                    success: false,
                    error: existingCheck.error || 'Erro ao verificar CardFeature',
                    statusCode: existingCheck.statusCode || 404
                };
            }
            const { error } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .delete()
                .eq('id', id);
            if (error) {
                return {
                    success: false,
                    error: error.message,
                    statusCode: 400
                };
            }
            return {
                success: true,
                data: null,
                statusCode: 200
            };
        }
        catch (error) {
            console.error('Erro interno ao deletar CardFeature:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
    static async getStats() {
        try {
            const { count: total, error: countError } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .select('*', { count: 'exact', head: true });
            if (countError) {
                return {
                    success: false,
                    error: countError.message,
                    statusCode: 400
                };
            }
            const { data: techData, error: techError } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .select('tech');
            if (techError) {
                return {
                    success: false,
                    error: techError.message,
                    statusCode: 400
                };
            }
            const { data: languageData, error: languageError } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .select('language');
            if (languageError) {
                return {
                    success: false,
                    error: languageError.message,
                    statusCode: 400
                };
            }
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { count: recentCount, error: recentError } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sevenDaysAgo.toISOString());
            if (recentError) {
                return {
                    success: false,
                    error: recentError.message,
                    statusCode: 400
                };
            }
            const byTech = techData?.reduce((acc, item) => {
                acc[item.tech] = (acc[item.tech] || 0) + 1;
                return acc;
            }, {}) || {};
            const byLanguage = languageData?.reduce((acc, item) => {
                acc[item.language] = (acc[item.language] || 0) + 1;
                return acc;
            }, {}) || {};
            return {
                success: true,
                data: {
                    total: total || 0,
                    byTech,
                    byLanguage,
                    recentCount: recentCount || 0
                },
                statusCode: 200
            };
        }
        catch (error) {
            console.error('Erro interno ao buscar estatísticas:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
    static async bulkCreate(items) {
        try {
            const insertData = items.map(item => ({
                id: (0, crypto_1.randomUUID)(),
                title: item.title,
                tech: item.tech,
                language: item.language,
                description: item.description,
                screens: item.screens,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));
            const { data, error } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .insert(insertData)
                .select();
            if (error) {
                return {
                    success: false,
                    error: error.message,
                    statusCode: 400
                };
            }
            const transformedData = data?.map(row => this.transformToResponse(row)) || [];
            return {
                success: true,
                data: transformedData,
                count: transformedData.length,
                statusCode: 201
            };
        }
        catch (error) {
            console.error('Erro interno ao criar CardFeatures em lote:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
    static async bulkDelete(ids) {
        try {
            const { error, count } = await supabase_1.supabaseTyped
                .from(this.tableName)
                .delete({ count: 'exact' })
                .in('id', ids);
            if (error) {
                return {
                    success: false,
                    error: error.message,
                    statusCode: 400
                };
            }
            return {
                success: true,
                data: { deletedCount: count || 0 },
                statusCode: 200
            };
        }
        catch (error) {
            console.error('Erro interno ao deletar CardFeatures em lote:', error);
            return {
                success: false,
                error: 'Erro interno do servidor',
                statusCode: 500
            };
        }
    }
}
exports.CardFeatureModel = CardFeatureModel;
//# sourceMappingURL=CardFeatureModel.js.map