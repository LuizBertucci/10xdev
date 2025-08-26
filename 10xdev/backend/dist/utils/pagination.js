"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPaginationParams = extractPaginationParams;
exports.buildQueryParams = buildQueryParams;
exports.buildPaginatedResponse = buildPaginatedResponse;
function extractPaginationParams(req) {
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    return { page, limit };
}
function buildQueryParams(req, extraParams = {}) {
    const { page, limit } = extractPaginationParams(req);
    return {
        page,
        limit,
        ...(req.query.tech && { tech: req.query.tech }),
        ...(req.query.language && { language: req.query.language }),
        ...(req.query.search && { search: req.query.search }),
        ...(req.query.sortBy && { sortBy: req.query.sortBy }),
        ...(req.query.sortOrder && { sortOrder: req.query.sortOrder }),
        ...extraParams
    };
}
function buildPaginatedResponse(result, params, extraData = {}) {
    const totalPages = params.limit ? Math.ceil((result.count || 0) / params.limit) : 1;
    const currentPage = params.page || 1;
    return {
        success: true,
        data: result.data,
        count: result.count,
        totalPages,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        ...extraData
    };
}
//# sourceMappingURL=pagination.js.map