"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScreens = validateScreens;
exports.validateCardFeatureData = validateCardFeatureData;
exports.sendErrorResponse = sendErrorResponse;
exports.sendSuccessResponse = sendSuccessResponse;
exports.sendValidationError = sendValidationError;
exports.validatePartialCardFeatureData = validatePartialCardFeatureData;
function validateScreens(screens, context = '') {
    const prefix = context ? `${context}: ` : '';
    if (!Array.isArray(screens) || screens.length === 0) {
        return `${prefix}Screens field must be an array with at least one item`;
    }
    for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];
        if (!screen?.name?.trim()) {
            return `${prefix}Screen ${i + 1} must have a valid "name" field`;
        }
    }
    return null;
}
function validateCardFeatureData(data, context = '') {
    const prefix = context ? `${context}: ` : '';
    if (!data?.title?.trim() || !data?.tech?.trim() || !data?.language?.trim() || !data?.description?.trim()) {
        return `${prefix}Required fields: title, tech, language, description, screens`;
    }
    if (!data.screens) {
        return `${prefix}Screens field is required`;
    }
    return validateScreens(data.screens, context);
}
function sendErrorResponse(res, error, operation, statusCode) {
    const status = statusCode || (error?.statusCode) || 500;
    const message = error?.error || error?.message || 'Internal server error';
    console.error(`Error in ${operation}:`, error);
    res.status(status).json({
        success: false,
        error: message
    });
}
function sendSuccessResponse(res, data, message, statusCode = 200) {
    const response = {
        success: true,
        data
    };
    if (message) {
        response.message = message;
    }
    res.status(statusCode).json(response);
}
function sendValidationError(res, error) {
    res.status(400).json({
        success: false,
        error
    });
}
function validatePartialCardFeatureData(data, context = '') {
    if (data.screens) {
        return validateScreens(data.screens, context);
    }
    return null;
}
//# sourceMappingURL=validation.js.map