"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortBy = exports.SortOrder = exports.SupportedLanguage = exports.SupportedTech = void 0;
var SupportedTech;
(function (SupportedTech) {
    SupportedTech["REACT"] = "React";
    SupportedTech["NODEJS"] = "Node.js";
    SupportedTech["PYTHON"] = "Python";
    SupportedTech["JAVASCRIPT"] = "JavaScript";
    SupportedTech["VUE"] = "Vue.js";
    SupportedTech["ANGULAR"] = "Angular";
    SupportedTech["DJANGO"] = "Django";
    SupportedTech["FASTAPI"] = "FastAPI";
    SupportedTech["EXPRESS"] = "Express";
})(SupportedTech || (exports.SupportedTech = SupportedTech = {}));
var SupportedLanguage;
(function (SupportedLanguage) {
    SupportedLanguage["TYPESCRIPT"] = "typescript";
    SupportedLanguage["JAVASCRIPT"] = "javascript";
    SupportedLanguage["PYTHON"] = "python";
    SupportedLanguage["HTML"] = "html";
    SupportedLanguage["CSS"] = "css";
    SupportedLanguage["JSON"] = "json";
    SupportedLanguage["YAML"] = "yaml";
    SupportedLanguage["SQL"] = "sql";
})(SupportedLanguage || (exports.SupportedLanguage = SupportedLanguage = {}));
var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "aesc";
    SortOrder["DESC"] = "desc";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
var SortBy;
(function (SortBy) {
    SortBy["TITLE"] = "title";
    SortBy["TECH"] = "tech";
    SortBy["LANGUAGE"] = "language";
    SortBy["CREATED_AT"] = "created_at";
    SortBy["UPDATED_AT"] = "updated_at";
})(SortBy || (exports.SortBy = SortBy = {}));
//# sourceMappingURL=cardfeature.js.map