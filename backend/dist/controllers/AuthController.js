"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const express_validator_1 = require("express-validator");
const UserModel_1 = require("@/models/UserModel");
const auth_1 = require("@/middleware/auth");
class AuthController {
    static registrationValidation = [
        (0, express_validator_1.body)('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email is required'),
        (0, express_validator_1.body)('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
        (0, express_validator_1.body)('first_name')
            .optional()
            .isLength({ min: 2, max: 50 })
            .withMessage('First name must be between 2 and 50 characters'),
        (0, express_validator_1.body)('last_name')
            .optional()
            .isLength({ min: 2, max: 50 })
            .withMessage('Last name must be between 2 and 50 characters'),
        (0, express_validator_1.body)('role')
            .optional()
            .isIn(['admin', 'user'])
            .withMessage('Role must be either admin or user')
    ];
    static loginValidation = [
        (0, express_validator_1.body)('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email is required'),
        (0, express_validator_1.body)('password')
            .notEmpty()
            .withMessage('Password is required')
    ];
    static async register(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            const { email, password, first_name, last_name, role } = req.body;
            const userData = {
                email,
                password,
                first_name,
                last_name,
                role: role || 'user'
            };
            const user = await UserModel_1.UserModel.create(userData);
            const token = auth_1.AuthMiddleware.generateToken(user);
            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user,
                    token,
                    token_type: 'Bearer'
                }
            });
        }
        catch (error) {
            console.error('Registration error:', error);
            if (error.message === 'User with this email already exists') {
                return res.status(409).json({
                    success: false,
                    message: error.message,
                    error: 'USER_ALREADY_EXISTS'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Internal server error during registration',
                error: 'REGISTRATION_FAILED'
            });
        }
    }
    static async login(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            const { email, password } = req.body;
            const user = await UserModel_1.UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                    error: 'INVALID_CREDENTIALS'
                });
            }
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'User account is disabled',
                    error: 'USER_DISABLED'
                });
            }
            const isValidPassword = await UserModel_1.UserModel.validatePassword(user, password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                    error: 'INVALID_CREDENTIALS'
                });
            }
            const publicUser = UserModel_1.UserModel.toPublic(user);
            const token = auth_1.AuthMiddleware.generateToken(publicUser);
            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: publicUser,
                    token,
                    token_type: 'Bearer'
                }
            });
        }
        catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during login',
                error: 'LOGIN_FAILED'
            });
        }
    }
    static async logout(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                try {
                    await auth_1.AuthMiddleware.revokeToken(token);
                }
                catch (error) {
                    console.error('Error revoking token during logout:', error);
                }
            }
            return res.status(200).json({
                success: true,
                message: 'Logout successful'
            });
        }
        catch (error) {
            console.error('Logout error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during logout',
                error: 'LOGOUT_FAILED'
            });
        }
    }
    static async me(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    error: 'AUTHENTICATION_REQUIRED'
                });
            }
            const user = await UserModel_1.UserModel.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                    error: 'USER_NOT_FOUND'
                });
            }
            return res.status(200).json({
                success: true,
                message: 'User profile retrieved successfully',
                data: {
                    user: UserModel_1.UserModel.toPublic(user)
                }
            });
        }
        catch (error) {
            console.error('Get profile error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'GET_PROFILE_FAILED'
            });
        }
    }
    static async refreshToken(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    error: 'AUTHENTICATION_REQUIRED'
                });
            }
            const user = await UserModel_1.UserModel.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
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
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                try {
                    await auth_1.AuthMiddleware.revokeToken(token);
                }
                catch (error) {
                    console.error('Error revoking old token during refresh:', error);
                }
            }
            const publicUser = UserModel_1.UserModel.toPublic(user);
            const newToken = auth_1.AuthMiddleware.generateToken(publicUser);
            return res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    user: publicUser,
                    token: newToken,
                    token_type: 'Bearer'
                }
            });
        }
        catch (error) {
            console.error('Token refresh error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during token refresh',
                error: 'TOKEN_REFRESH_FAILED'
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map