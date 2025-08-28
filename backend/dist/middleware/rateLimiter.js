"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRateLimit = exports.searchRateLimit = exports.bulkOperationsRateLimit = exports.writeOperationsRateLimit = exports.generalRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        success: false,
        error: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
});
exports.writeOperationsRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        error: 'Muitas operações de escrita. Tente novamente mais tarde.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return !['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    }
});
exports.bulkOperationsRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Limite de operações em lote excedido. Tente novamente em 1 hora.',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.searchRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Muitas buscas. Tente novamente em 5 minutos.',
        retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.statsRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'Muitas consultas de estatísticas. Tente novamente em 10 minutos.',
        retryAfter: '10 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimiter.js.map