"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardFeatureRoutes = void 0;
const express_1 = require("express");
const CardFeatureController_1 = require("../controllers/CardFeatureController");
const router = (0, express_1.Router)();
exports.cardFeatureRoutes = router;
router.get('/stats', CardFeatureController_1.CardFeatureController.getStats);
router.get('/search', CardFeatureController_1.CardFeatureController.search);
router.post('/bulk', CardFeatureController_1.CardFeatureController.bulkCreate);
router.delete('/bulk', CardFeatureController_1.CardFeatureController.bulkDelete);
router.get('/tech/:tech', CardFeatureController_1.CardFeatureController.getByTech);
router.post('/', CardFeatureController_1.CardFeatureController.create);
router.get('/', CardFeatureController_1.CardFeatureController.getAll);
router.get('/:id', CardFeatureController_1.CardFeatureController.getById);
router.put('/:id', CardFeatureController_1.CardFeatureController.update);
router.delete('/:id', CardFeatureController_1.CardFeatureController.delete);
//# sourceMappingURL=cardFeatureRoutes.js.map