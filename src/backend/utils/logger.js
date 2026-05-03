"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (LogLevel = {}));
class Logger {
    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.logDir = path_1.default.join(os_1.default.homedir(), 'AppData', 'Local', 'POSApp', 'logs');
        if (!fs_1.default.existsSync(this.logDir)) {
            fs_1.default.mkdirSync(this.logDir, { recursive: true });
        }
    }
    getLogFile() {
        const date = new Date().toISOString().split('T')[0];
        return path_1.default.join(this.logDir, `pos-${date}.log`);
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level}] ${message}${dataStr}`;
    }
    writeLog(level, message, data) {
        const formatted = this.formatMessage(level, message, data);
        // Console output
        const consoleMethod = level === LogLevel.ERROR
            ? console.error
            : level === LogLevel.WARN
                ? console.warn
                : console.log;
        if (this.isDevelopment || level === LogLevel.ERROR) {
            consoleMethod(formatted);
        }
        // File output
        try {
            fs_1.default.appendFileSync(this.getLogFile(), formatted + '\n');
        }
        catch (error) {
            console.error('Failed to write log file:', error);
        }
    }
    debug(message, data) {
        this.writeLog(LogLevel.DEBUG, message, data);
    }
    info(message, data) {
        this.writeLog(LogLevel.INFO, message, data);
    }
    warn(message, data) {
        this.writeLog(LogLevel.WARN, message, data);
    }
    error(message, error) {
        this.writeLog(LogLevel.ERROR, message, error);
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map