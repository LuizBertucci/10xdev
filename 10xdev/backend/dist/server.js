"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const middleware_1 = require("./middleware");
const routes_1 = require("./routes");
dotenv_1.default.config();
(0, middleware_1.uncaughtErrorHandler)();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));
app.use(middleware_1.corsMiddleware);
app.use(middleware_1.generalRateLimit);
app.use((0, compression_1.default)());
app.use(express_1.default.json({
    limit: '10mb',
    type: 'application/json'
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '10mb'
}));
app.use(middleware_1.validateContentType);
app.use(middleware_1.sanitizeInput);
const morganFormat = process.env.NODE_ENV === 'production'
    ? 'combined'
    : 'dev';
app.use((0, morgan_1.default)(morganFormat));
app.use((req, res, next) => {
    const requestId = crypto_1.default.randomUUID().replace(/-/g, '').substring(0, 9);
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
});
app.use('/api/card-features', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !req.path.includes('bulk')) {
        return (0, middleware_1.writeOperationsRateLimit)(req, res, next);
    }
    next();
});
app.use('/api/card-features/bulk', middleware_1.bulkOperationsRateLimit);
app.use('/api/card-features/search', middleware_1.searchRateLimit);
app.use('/api/card-features/stats', middleware_1.statsRateLimit);
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: '🚀 10xDev Backend API está rodando!',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            api: '/api',
            health: '/api/health',
            docs: '/api'
        }
    });
});
app.use('/api', routes_1.apiRoutes);
app.use(middleware_1.notFoundHandler);
app.use(middleware_1.errorHandler);
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});
const gracefulShutdown = (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Forcing shutdown after timeout.');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
exports.default = app;
//# sourceMappingURL=server.js.map