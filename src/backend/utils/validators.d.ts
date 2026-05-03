export interface ValidationError {
    field: string;
    message: string;
}
export declare class ValidationException extends Error {
    errors: ValidationError[];
    constructor(errors: ValidationError[]);
}
export declare function validateEmail(email: string): boolean;
export declare function validateUsername(username: string): boolean;
export declare function validatePassword(password: string): boolean;
export declare function validateSKU(sku: string): boolean;
export declare function validateBarcode(barcode: string): boolean;
export declare function validatePrice(price: number): boolean;
export declare function validateQuantity(quantity: number): boolean;
export declare function validateProductInput(data: any): ValidationError[];
export declare function validateLoginInput(data: any): ValidationError[];
export declare function validateSaleInput(data: any): ValidationError[];
//# sourceMappingURL=validators.d.ts.map