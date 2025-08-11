"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const nanoid_1 = require("nanoid");
const supabase_1 = require("@/database/supabase");
class UserModel {
    static async findById(id) {
        try {
            const { data, error } = await supabase_1.supabaseAdminTyped
                .from('users')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`Database error: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }
    static async findByEmail(email) {
        try {
            const { data, error } = await supabase_1.supabaseAdminTyped
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw new Error(`Database error: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }
    static async create(userData) {
        try {
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }
            const saltRounds = 12;
            const password_hash = await bcryptjs_1.default.hash(userData.password, saltRounds);
            const newUser = {
                id: (0, nanoid_1.nanoid)(),
                email: userData.email.toLowerCase(),
                password_hash,
                role: userData.role || 'user',
                first_name: userData.first_name || undefined,
                last_name: userData.last_name || undefined,
                is_active: userData.is_active !== undefined ? userData.is_active : true,
            };
            const { data, error } = await supabase_1.supabaseAdminTyped
                .from('users')
                .insert(newUser)
                .select('*')
                .single();
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            return this.toPublic(data);
        }
        catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
    static async update(id, userData) {
        try {
            const updateData = {
                updated_at: new Date().toISOString()
            };
            if (userData.email) {
                updateData.email = userData.email.toLowerCase();
            }
            if (userData.password) {
                const saltRounds = 12;
                updateData.password_hash = await bcryptjs_1.default.hash(userData.password, saltRounds);
            }
            if (userData.role) {
                updateData.role = userData.role;
            }
            if (userData.first_name !== undefined) {
                updateData.first_name = userData.first_name;
            }
            if (userData.last_name !== undefined) {
                updateData.last_name = userData.last_name;
            }
            if (userData.is_active !== undefined) {
                updateData.is_active = userData.is_active;
            }
            const { data, error } = await supabase_1.supabaseAdminTyped
                .from('users')
                .update(updateData)
                .eq('id', id)
                .select('*')
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('User not found');
                }
                throw new Error(`Database error: ${error.message}`);
            }
            return this.toPublic(data);
        }
        catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
    static async delete(id) {
        try {
            const { error } = await supabase_1.supabaseAdminTyped
                .from('users')
                .delete()
                .eq('id', id);
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            return true;
        }
        catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
    static async validatePassword(user, password) {
        try {
            return await bcryptjs_1.default.compare(password, user.password_hash);
        }
        catch (error) {
            console.error('Error validating password:', error);
            return false;
        }
    }
    static async findAll(page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const { count, error: countError } = await supabase_1.supabaseAdminTyped
                .from('users')
                .select('*', { count: 'exact', head: true });
            if (countError) {
                throw new Error(`Database error: ${countError.message}`);
            }
            const { data, error } = await supabase_1.supabaseAdminTyped
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }
            return {
                users: data.map(user => this.toPublic(user)),
                total: count || 0
            };
        }
        catch (error) {
            console.error('Error finding all users:', error);
            throw error;
        }
    }
    static toPublic(user) {
        const { password_hash, ...publicUser } = user;
        return publicUser;
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=UserModel.js.map