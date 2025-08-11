"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const UserModel_1 = require("@/models/UserModel");
const JwtDenylistModel_1 = require("@/models/JwtDenylistModel");
class AuthMiddleware {
    static JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    static JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    static generateToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            jti: Math.random().toString(36).substr(2, 9)
        };
        const options = {
            expiresIn: this.JWT_EXPIRES_IN,
        };
        return jwt.sign(payload, this.JWT_SECRET, options);
    }
    static verifyToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token expired');
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    static authenticate = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({
                    success: false,
                    message: 'No token provided',
                    error: 'MISSING_TOKEN'
                });
            }
            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No token provided',
                    error: 'MISSING_TOKEN'
                });
            }
            const decoded = AuthMiddleware.verifyToken(token);
            const isDenied = await JwtDenylistModel_1.JwtDenylistModel.isTokenDenied(decoded.jti);
            if (isDenied) {
                return res.status(401).json({
                    success: false,
                    message: 'Token has been revoked',
                    error: 'TOKEN_REVOKED'
                });
            }
            const user = await UserModel_1.UserModel.findById(decoded.userId);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found',
                    error: 'USER_NOT_FOUND'
                });
            }
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'User account is disabled',
                    error: 'USER_DISABLED'
                });
            }
            req.user = UserModel_1.UserModel.toPublic(user);
            next();
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || 'Authentication failed',
                error: 'AUTHENTICATION_FAILED'
            });
        }
    };
    static requireRole(role) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    error: 'AUTHENTICATION_REQUIRED'
                });
            }
            if (req.user.role !== role) {
                return res.status(403).json({
                    success: false,
                    message: `${role} role required`,
                    error: 'INSUFFICIENT_PERMISSIONS'
                });
            }
            next();
        };
    }
    static requireAdmin = (req, res, next) => {
        return AuthMiddleware.requireRole('admin')(req, res, next);
    };
    static requireUser = (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
        }
        if (req.user.role !== 'user' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'User or admin role required',
                error: 'INSUFFICIENT_PERMISSIONS'
            });
        }
        next();
    };
    static async revokeToken(token) {
        try {
            const decoded = AuthMiddleware.verifyToken(token);
            await JwtDenylistModel_1.JwtDenylistModel.addToken(decoded.jti, decoded.exp);
        }
        catch (error) {
            throw new Error('Failed to revoke token');
        }
    }
    static optional = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next();
        }
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;
        if (!token) {
            return next();
        }
        AuthMiddleware.authenticate(req, res, (error) => {
            if (error) {
                delete req.user;
            }
            next();
        });
    };
}
exports.AuthMiddleware = AuthMiddleware;
//# sourceMappingURL=auth.js.map