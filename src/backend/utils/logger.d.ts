declare class Logger {
    private logDir;
    private isDevelopment;
    constructor();
    private getLogFile;
    private formatMessage;
    private writeLog;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: any): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map