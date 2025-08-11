export type UserRole = 'admin' | 'user';
export interface User {
    id: string;
    email: string;
    password_hash: string;
    role: UserRole;
    first_name?: string;
    last_name?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface CreateUserData {
    email: string;
    password: string;
    role?: UserRole;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
}
export interface UpdateUserData {
    email?: string;
    password?: string;
    role?: UserRole;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
}
export interface UserPublic {
    id: string;
    email: string;
    role: UserRole;
    first_name?: string;
    last_name?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export declare class UserModel {
    static findById(id: string): Promise<User | null>;
    static findByEmail(email: string): Promise<User | null>;
    static create(userData: CreateUserData): Promise<UserPublic>;
    static update(id: string, userData: UpdateUserData): Promise<UserPublic>;
    static delete(id: string): Promise<boolean>;
    static validatePassword(user: User, password: string): Promise<boolean>;
    static findAll(page?: number, limit?: number): Promise<{
        users: UserPublic[];
        total: number;
    }>;
    static toPublic(user: User): UserPublic;
}
//# sourceMappingURL=UserModel.d.ts.map