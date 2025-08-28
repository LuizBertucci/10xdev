"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.validateContentType = exports.uncaughtErrorHandler = exports.asyncErrorHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    if (err.message?.includes('violates')) {
        error.message = 'Dados inválidos fornecidos';
        error.statusCode = 400;
    }
    if (err.message?.includes('connect') || err.message?.includes('connection')) {
        error.message = 'Erro de conexão com o banco de dados';
        error.statusCode = 503;
    }
    if (err.message?.includes('JSON')) {
        error.message = 'Formato JSON inválido';
        error.statusCode = 400;
    }
    if (err.message?.includes('not found') || err.message?.includes('não encontrado')) {
        error.statusCode = 404;
    }
    if (err.message?.includes('unauthorized') || err.message?.includes('não autorizado')) {
        error.statusCode = 401;
    }
    if (err.message?.includes('forbidden') || err.message?.includes('proibido')) {
        error.statusCode = 403;
    }
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Erro interno do servidor',
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: error
        })
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: `Rota ${req.originalUrl} não encontrada`,
        method: req.method,
        timestamp: new Date().toISOString()
    });
};
exports.notFoundHandler = notFoundHandler;
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncErrorHandler = asyncErrorHandler;
const uncaughtErrorHandler = () => {
    process.on('uncaughtException', (err) => {
        console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
            name: err.name,
            message: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
        });
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('UNHANDLED REJECTION! 💥 Shutting down...', {
            reason,
            promise,
            timestamp: new Date().toISOString()
        });
        process.exit(1);
    });
};
exports.uncaughtErrorHandler = uncaughtErrorHandler;
const validateContentType = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (!req.is('application/json')) {
            res.status(400).json({
                success: false,
                error: 'Content-Type deve ser application/json'
            });
            return;
        }
    }
    next();
};
exports.validateContentType = validateContentType;
const sanitizeInput = (req, res, next) => {
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null)
            return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => sanitizeObject(item));
        }
        const sanitized = { ...obj };
        Object.keys(sanitized).forEach(key => {
            if (key.startsWith('$') || key.includes('__proto__') || key.includes('constructor')) {
                delete sanitized[key];
            }
            else if (typeof sanitized[key] === 'object') {
                sanitized[key] = sanitizeObject(sanitized[key]);
            }
        });
        return sanitized;
    };
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=errorHandler.js.map