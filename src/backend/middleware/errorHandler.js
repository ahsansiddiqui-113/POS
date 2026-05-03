"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
const validators_1 = require("../utils/validators");
class AppError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(error, _req, res, _next) {
    logger_1.logger.error('Error caught by handler:', error);
    if (error instanceof validators_1.ValidationException) {
        res.status(400).json({
            error: 'Validation failed',
            details: error.errors,
        });
        return;
    }
    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            error: error.message,
            details: error.details,
        });
        return;
    }
    if (error instanceof SyntaxError) {
        res.status(400).json({
            error: 'Invalid request body',
        });
        return;
    }
    // Database errors
    if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(409).json({
            error: 'Duplicate entry or constraint violation',
            details: error.message,
        });
        return;
    }
    // Default error
    res.status(500).json({
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
}
exports.errorHandler = errorHandler;
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map