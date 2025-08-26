"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.validateContentType = exports.uncaughtErrorHandler = exports.asyncErrorHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    console.error('Error:', {
        message: err.message,
        url: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
    const errorMappings = [
        { patterns: ['violates', 'JSON'], statusCode: 400, message: 'Dados inválidos' },
        { patterns: ['unauthorized', 'não autorizado'], statusCode: 401 },
        { patterns: ['forbidden', 'proibido'], statusCode: 403 },
        { patterns: ['not found', 'não encontrado'], statusCode: 404 },
        { patterns: ['connect', 'connection'], statusCode: 503, message: 'Erro de conexão' }
    ];
    for (const { patterns, statusCode, message } of errorMappings) {
        if (patterns.some(pattern => err.message?.includes(pattern))) {
            error.statusCode = statusCode;
            if (message)
                error.message = message;
            break;
        }
    }
    const isDev = process.env.NODE_ENV === 'development';
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Erro interno do servidor',
        ...(isDev && { stack: err.stack, details: error })
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
    const logAndExit = (type, error) => {
        console.error(`${type} 💥 Shutting down...`, {
            error: error.message || error,
            timestamp: new Date().toISOString()
        });
        process.exit(1);
    };
    process.on('uncaughtException', (err) => logAndExit('UNCAUGHT EXCEPTION!', err));
    process.on('unhandledRejection', (reason) => logAndExit('UNHANDLED REJECTION!', reason));
};
exports.uncaughtErrorHandler = uncaughtErrorHandler;
const validateContentType = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
        res.status(400).json({
            success: false,
            error: 'Content-Type deve ser application/json'
        });
        return;
    }
    next();
};
exports.validateContentType = validateContentType;
const sanitizeInput = (req, res, next) => {
    const dangerousKeys = ['$', '__proto__', 'constructor'];
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null)
            return obj;
        if (Array.isArray(obj))
            return obj.map(sanitizeObject);
        const sanitized = { ...obj };
        Object.keys(sanitized).forEach(key => {
            if (dangerousKeys.some(danger => key.startsWith(danger) || key.includes(danger))) {
                delete sanitized[key];
            }
            else if (typeof sanitized[key] === 'object') {
                sanitized[key] = sanitizeObject(sanitized[key]);
            }
        });
        return sanitized;
    };
    ['body', 'query'].forEach(prop => {
        if (req[prop])
            req[prop] = sanitizeObject(req[prop]);
    });
    next();
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=errorHandler.js.map