"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtDenylistModel = void 0;
const nanoid_1 = require("nanoid");
const supabase_1 = require("@/database/supabase");
class JwtDenylistModel {
    static async addToken(jti, exp) {
        try {
            const newEntry = {
                id: (0, nanoid_1.nanoid)(),
                jti,
                exp: new Date(exp * 1000).toISOString(),
            };
            const { data, error } = await supabase_1.supabaseAdminTyped
                .from('jwt_denylist')
                .insert(newEntry)
                .select('*')
                .single();
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('Error adding token to denylist:', error);
            throw error;
        }
    }
    static async isTokenDenied(jti) {
        try {
            const { data, error } = await supabase_1.supabaseAdminTyped
                .from('jwt_denylist')
                .select('id')
                .eq('jti', jti)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return false;
                }
                throw new Error(`Database error: ${error.message}`);
            }
            return true;
        }
        catch (error) {
            console.error('Error checking if token is denied:', error);
            throw error;
        }
    }
    static async cleanupExpiredTokens() {
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabase_1.supabaseAdminTyped
                .from('jwt_denylist')
                .delete()
                .lt('exp', now)
                .select('id');
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            return data.length;
        }
        catch (error) {
            console.error('Error cleaning up expired tokens:', error);
            throw error;
        }
    }
    static async findAll(page = 1, limit = 100) {
        try {
            const offset = (page - 1) * limit;
            const { count, error: countError } = await supabase_1.supabaseAdminTyped
                .from('jwt_denylist')
                .select('*', { count: 'exact', head: true });
            if (countError) {
                throw new Error(`Database error: ${countError.message}`);
            }
            const { data, error } = await supabase_1.supabaseAdminTyped
                .from('jwt_denylist')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            return {
                tokens: data,
                total: count || 0
            };
        }
        catch (error) {
            console.error('Error finding all tokens:', error);
            throw error;
        }
    }
}
exports.JwtDenylistModel = JwtDenylistModel;
//# sourceMappingURL=JwtDenylistModel.js.map