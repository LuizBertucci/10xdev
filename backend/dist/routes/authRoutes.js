"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const AuthController_1 = require("@/controllers/AuthController");
const UsersController_1 = require("@/controllers/UsersController");
const auth_1 = require("@/middleware/auth");
const router = (0, express_1.Router)();
exports.authRoutes = router;
router.post('/register', AuthController_1.AuthController.registrationValidation, AuthController_1.AuthController.register);
router.post('/login', AuthController_1.AuthController.loginValidation, AuthController_1.AuthController.login);
router.post('/logout', auth_1.AuthMiddleware.authenticate, AuthController_1.AuthController.logout);
router.get('/me', auth_1.AuthMiddleware.authenticate, AuthController_1.AuthController.me);
router.post('/refresh', auth_1.AuthMiddleware.authenticate, AuthController_1.AuthController.refreshToken);
router.get('/users', auth_1.AuthMiddleware.authenticate, auth_1.AuthMiddleware.requireAdmin, UsersController_1.UsersController.listValidation, UsersController_1.UsersController.list);
router.get('/users/:id', auth_1.AuthMiddleware.authenticate, auth_1.AuthMiddleware.requireAdmin, UsersController_1.UsersController.getById);
router.put('/users/:id', auth_1.AuthMiddleware.authenticate, auth_1.AuthMiddleware.requireAdmin, UsersController_1.UsersController.updateValidation, UsersController_1.UsersController.update);
router.delete('/users/:id', auth_1.AuthMiddleware.authenticate, auth_1.AuthMiddleware.requireAdmin, UsersController_1.UsersController.delete);
//# sourceMappingURL=authRoutes.js.map