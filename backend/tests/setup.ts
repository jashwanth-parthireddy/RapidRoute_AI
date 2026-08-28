// Jest test setup — load .env.test if present
import dotenv from 'dotenv'
dotenv.config({ path: '.env.test' })

// Set test environment defaults
process.env.NODE_ENV       = 'test'
process.env.JWT_SECRET     = 'test-secret-key-for-jest-only'
process.env.DATABASE_URL   = process.env.TEST_DATABASE_URL || ''
process.env.REDIS_URL      = ''
process.env.AI_SERVICE_URL = 'http://localhost:8000'
