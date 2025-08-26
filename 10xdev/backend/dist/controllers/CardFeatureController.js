"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardFeatureController = void 0;
const models_1 = require("../models");
const validation_1 = require("../utils/validation");
const pagination_1 = require("../utils/pagination");
class CardFeatureController {
    static async create(req, res) {
        try {
            const data = req.body;
            const validationError = (0, validation_1.validateCardFeatureData)(data);
            if (validationError) {
                (0, validation_1.sendValidationError)(res, validationError);
                return;
            }
            const result = await models_1.CardFeatureModel.create(data);
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'create CardFeature', result.statusCode);
                return;
            }
            (0, validation_1.sendSuccessResponse)(res, result.data, 'CardFeature created successfully', 201);
        }
        catch (error) {
            (0, validation_1.sendErrorResponse)(res, error, 'controller create');
        }
    }
    static async getAll(req, res) {
        try {
            const params = (0, pagination_1.buildQueryParams)(req);
            const result = await models_1.CardFeatureModel.findAll(params);
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'get all CardFeatures', result.statusCode);
                return;
            }
            res.status(200).json((0, pagination_1.buildPaginatedResponse)(result, params));
        }
        catch (error) {
            console.error('Error in controller getAll:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                (0, validation_1.sendValidationError)(res, 'ID is required');
                return;
            }
            const result = await models_1.CardFeatureModel.findById(id);
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'get CardFeature by ID', result.statusCode);
                return;
            }
            (0, validation_1.sendSuccessResponse)(res, result.data);
        }
        catch (error) {
            (0, validation_1.sendErrorResponse)(res, error, 'controller getById');
        }
    }
    static async search(req, res) {
        try {
            const searchTerm = req.query.q;
            if (!searchTerm) {
                (0, validation_1.sendValidationError)(res, 'Search parameter "q" is required');
                return;
            }
            const params = (0, pagination_1.buildQueryParams)(req);
            const result = await models_1.CardFeatureModel.search(searchTerm, params);
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'search CardFeatures', result.statusCode);
                return;
            }
            res.status(200).json((0, pagination_1.buildPaginatedResponse)(result, params, { searchTerm }));
        }
        catch (error) {
            console.error('Error in controller search:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    static async getByTech(req, res) {
        try {
            const { tech } = req.params;
            if (!tech) {
                (0, validation_1.sendValidationError)(res, 'Technology is required');
                return;
            }
            const params = (0, pagination_1.buildQueryParams)(req);
            const result = await models_1.CardFeatureModel.findByTech(tech, params);
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'get CardFeatures by tech', result.statusCode);
                return;
            }
            res.status(200).json((0, pagination_1.buildPaginatedResponse)(result, params, { tech }));
        }
        catch (error) {
            console.error('Error in controller getByTech:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            if (!id) {
                (0, validation_1.sendValidationError)(res, 'ID is required');
                return;
            }
            const validationError = (0, validation_1.validatePartialCardFeatureData)(data);
            if (validationError) {
                (0, validation_1.sendValidationError)(res, validationError);
                return;
            }
            const result = await models_1.CardFeatureModel.update(id, data);
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'update CardFeature', result.statusCode);
                return;
            }
            (0, validation_1.sendSuccessResponse)(res, result.data, 'CardFeature updated successfully');
        }
        catch (error) {
            (0, validation_1.sendErrorResponse)(res, error, 'controller update');
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                (0, validation_1.sendValidationError)(res, 'ID is required');
                return;
            }
            const result = await models_1.CardFeatureModel.delete(id);
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'delete CardFeature', result.statusCode);
                return;
            }
            (0, validation_1.sendSuccessResponse)(res, null, 'CardFeature removed successfully');
        }
        catch (error) {
            (0, validation_1.sendErrorResponse)(res, error, 'controller delete');
        }
    }
    static async getStats(req, res) {
        try {
            const result = await models_1.CardFeatureModel.getStats();
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'get CardFeature statistics', result.statusCode);
                return;
            }
            (0, validation_1.sendSuccessResponse)(res, result.data);
        }
        catch (error) {
            (0, validation_1.sendErrorResponse)(res, error, 'controller getStats');
        }
    }
    static async bulkCreate(req, res) {
        try {
            const items = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                (0, validation_1.sendValidationError)(res, 'Body must be an array with at least one item');
                return;
            }
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item) {
                    (0, validation_1.sendValidationError)(res, `Item ${i + 1} is null or undefined`);
                    return;
                }
                const validationError = (0, validation_1.validateCardFeatureData)(item, `Item ${i + 1}`);
                if (validationError) {
                    (0, validation_1.sendValidationError)(res, validationError);
                    return;
                }
            }
            const result = await models_1.CardFeatureModel.bulkCreate(items);
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'bulk create CardFeatures', result.statusCode);
                return;
            }
            (0, validation_1.sendSuccessResponse)(res, result.data, `${result.count} CardFeatures created successfully`, 201);
        }
        catch (error) {
            (0, validation_1.sendErrorResponse)(res, error, 'controller bulkCreate');
        }
    }
    static async bulkDelete(req, res) {
        try {
            const ids = req.body.ids;
            if (!Array.isArray(ids) || ids.length === 0) {
                (0, validation_1.sendValidationError)(res, 'Body must contain an "ids" array with at least one item');
                return;
            }
            const result = await models_1.CardFeatureModel.bulkDelete(ids);
            if (!result.success) {
                (0, validation_1.sendErrorResponse)(res, result, 'bulk delete CardFeatures', result.statusCode);
                return;
            }
            (0, validation_1.sendSuccessResponse)(res, result.data, `${result.data?.deletedCount} CardFeatures removed successfully`);
        }
        catch (error) {
            (0, validation_1.sendErrorResponse)(res, error, 'controller bulkDelete');
        }
    }
}
exports.CardFeatureController = CardFeatureController;
//# sourceMappingURL=CardFeatureController.js.map