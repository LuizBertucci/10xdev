export interface JwtDenylistEntry {
    id: string;
    jti: string;
    exp: string;
    created_at: string;
}
export declare class JwtDenylistModel {
    static addToken(jti: string, exp: number): Promise<JwtDenylistEntry>;
    static isTokenDenied(jti: string): Promise<boolean>;
    static cleanupExpiredTokens(): Promise<number>;
    static findAll(page?: number, limit?: number): Promise<{
        tokens: JwtDenylistEntry[];
        total: number;
    }>;
}
//# sourceMappingURL=JwtDenylistModel.d.ts.map