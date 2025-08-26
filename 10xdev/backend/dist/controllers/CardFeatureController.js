"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardFeatureController = void 0;
const models_1 = require("../models");
class CardFeatureController {
    static async create(req, res) {
        try {
            const data = req.body;
            if (!data.title || !data.tech || !data.language || !data.description || !data.screens) {
                res.status(400).json({
                    success: false,
                    error: 'Campos obrigatórios: title, tech, language, description, screens'
                });
                return;
            }
            if (!Array.isArray(data.screens) || data.screens.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'O campo screens deve ser um array com pelo menos um item'
                });
                return;
            }
            for (const screen of data.screens) {
                if (!screen.name || typeof screen.name !== 'string') {
                    res.status(400).json({
                        success: false,
                        error: 'Cada screen deve ter um campo "name" válido (string)'
                    });
                    return;
                }
                if (screen.description !== undefined && typeof screen.description !== 'string') {
                    res.status(400).json({
                        success: false,
                        error: 'O campo "description" deve ser uma string'
                    });
                    return;
                }
                if (screen.code !== undefined && typeof screen.code !== 'string') {
                    res.status(400).json({
                        success: false,
                        error: 'O campo "code" deve ser uma string'
                    });
                    return;
                }
            }
            const result = await models_1.CardFeatureModel.create(data);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            res.status(201).json({
                success: true,
                data: result.data,
                message: 'CardFeature criado com sucesso'
            });
        }
        catch (error) {
            console.error('Erro no controller create:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
    static async getAll(req, res) {
        try {
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const params = {
                page,
                limit,
                tech: req.query.tech,
                language: req.query.language,
                search: req.query.search,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            };
            const result = await models_1.CardFeatureModel.findAll(params);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            const totalPages = params.limit ? Math.ceil((result.count || 0) / params.limit) : 1;
            const currentPage = params.page || 1;
            res.status(200).json({
                success: true,
                data: result.data,
                count: result.count,
                totalPages,
                currentPage,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1
            });
        }
        catch (error) {
            console.error('Erro no controller getAll:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID é obrigatório'
                });
                return;
            }
            const result = await models_1.CardFeatureModel.findById(id);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            console.error('Erro no controller getById:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
    static async search(req, res) {
        try {
            const searchTerm = req.query.q;
            if (!searchTerm) {
                res.status(400).json({
                    success: false,
                    error: 'Parâmetro de busca "q" é obrigatório'
                });
                return;
            }
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const params = {
                page,
                limit,
                tech: req.query.tech,
                language: req.query.language,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            };
            const result = await models_1.CardFeatureModel.search(searchTerm, params);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            const totalPages = params.limit ? Math.ceil((result.count || 0) / params.limit) : 1;
            const currentPage = params.page || 1;
            res.status(200).json({
                success: true,
                data: result.data,
                count: result.count,
                searchTerm,
                totalPages,
                currentPage,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1
            });
        }
        catch (error) {
            console.error('Erro no controller search:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
    static async getByTech(req, res) {
        try {
            const { tech } = req.params;
            if (!tech) {
                res.status(400).json({
                    success: false,
                    error: 'Tecnologia é obrigatória'
                });
                return;
            }
            const page = req.query.page ? parseInt(req.query.page) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const params = {
                page,
                limit,
                language: req.query.language,
                search: req.query.search,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            };
            const result = await models_1.CardFeatureModel.findByTech(tech, params);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            const totalPages = params.limit ? Math.ceil((result.count || 0) / params.limit) : 1;
            const currentPage = params.page || 1;
            res.status(200).json({
                success: true,
                data: result.data,
                count: result.count,
                tech,
                totalPages,
                currentPage,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1
            });
        }
        catch (error) {
            console.error('Erro no controller getByTech:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
    static async update(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID é obrigatório'
                });
                return;
            }
            if (data.screens) {
                if (!Array.isArray(data.screens) || data.screens.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'O campo screens deve ser um array com pelo menos um item'
                    });
                    return;
                }
                for (const screen of data.screens) {
                    if (!screen.name?.trim()) {
                        res.status(400).json({
                            success: false,
                            error: 'Cada screen deve ter um campo "name" válido'
                        });
                        return;
                    }
                    if (screen.description !== undefined && typeof screen.description !== 'string' ||
                        screen.code !== undefined && typeof screen.code !== 'string') {
                        res.status(400).json({
                            success: false,
                            error: 'Os campos "description" e "code" devem ser strings'
                        });
                        return;
                    }
                }
            }
            const result = await models_1.CardFeatureModel.update(id, data);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: result.data,
                message: 'CardFeature atualizado com sucesso'
            });
        }
        catch (error) {
            console.error('Erro no controller update:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
    static async delete(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID é obrigatório'
                });
                return;
            }
            const result = await models_1.CardFeatureModel.delete(id);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'CardFeature removido com sucesso'
            });
        }
        catch (error) {
            console.error('Erro no controller delete:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
    static async getStats(req, res) {
        try {
            const result = await models_1.CardFeatureModel.getStats();
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            console.error('Erro no controller getStats:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
    static async bulkCreate(req, res) {
        try {
            const items = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Body deve ser um array com pelo menos um item'
                });
                return;
            }
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item?.title || !item?.tech || !item?.language || !item?.description || !item?.screens) {
                    res.status(400).json({
                        success: false,
                        error: `Item ${i + 1}: Campos obrigatórios: title, tech, language, description, screens`
                    });
                    return;
                }
                if (!Array.isArray(item?.screens) || item?.screens.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: `Item ${i + 1}: O campo screens deve ser um array com pelo menos um item`
                    });
                    return;
                }
            }
            const result = await models_1.CardFeatureModel.bulkCreate(items);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            res.status(201).json({
                success: true,
                data: result.data,
                count: result.count,
                message: `${result.count} CardFeatures criados com sucesso`
            });
        }
        catch (error) {
            console.error('Erro no controller bulkCreate:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
    static async bulkDelete(req, res) {
        try {
            const ids = req.body.ids;
            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Body deve conter um array "ids" com pelo menos um item'
                });
                return;
            }
            const result = await models_1.CardFeatureModel.bulkDelete(ids);
            if (!result.success) {
                res.status(result.statusCode || 400).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: result.data,
                message: `${result.data?.deletedCount} CardFeatures removidos com sucesso`
            });
        }
        catch (error) {
            console.error('Erro no controller bulkDelete:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
}
exports.CardFeatureController = CardFeatureController;
//# sourceMappingURL=CardFeatureController.js.map