"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Jest test setup — load .env.test if present
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
// Set test environment defaults
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest-only';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.REDIS_URL = '';
process.env.AI_SERVICE_URL = 'http://localhost:8000';
//# sourceMappingURL=setup.js.map