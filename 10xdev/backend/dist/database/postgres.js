"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
}
const getConnectionConfig = () => {
    const url = new URL(databaseUrl);
    if (process.env.DATABASE_SSL !== 'true') {
        url.searchParams.set('sslmode', 'disable');
    }
    return {
        connectionString: url.toString(),
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true, require: true } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    };
};
exports.pool = new pg_1.Pool(getConnectionConfig());
exports.pool.on('connect', (client) => { });
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
const query = async (text, params) => {
    const client = await exports.pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    }
    finally {
        client.release();
    }
};
exports.query = query;
process.on('SIGINT', () => {
    exports.pool.end();
});
process.on('SIGTERM', () => {
    exports.pool.end();
});
//# sourceMappingURL=postgres.js.map