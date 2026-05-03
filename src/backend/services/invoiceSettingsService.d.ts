/// <reference types="node" />
/// <reference types="node" />
export interface InvoiceSettings {
    id: number;
    company_name?: string;
    logo_path?: string;
    address?: string;
    phone?: string;
    email?: string;
    bank_account?: string;
    bank_name?: string;
    bank_code?: string;
    terms_conditions?: string;
    payment_terms?: string;
    footer_text?: string;
    updated_at: string;
}
export declare class InvoiceSettingsService {
    private db;
    private logoDir;
    constructor();
    getInvoiceSettings(): InvoiceSettings;
    updateInvoiceSettings(data: {
        companyName?: string;
        address?: string;
        phone?: string;
        email?: string;
        bankAccount?: string;
        bankName?: string;
        bankCode?: string;
        termsConditions?: string;
        paymentTerms?: string;
        footerText?: string;
    }): InvoiceSettings;
    uploadLogo(fileBuffer: Buffer, fileName: string): string;
    removeLogo(): InvoiceSettings;
    generateInvoiceTemplate(saleId: number): string;
    validateSettings(): any;
}
export declare const invoiceSettingsService: InvoiceSettingsService;
//# sourceMappingURL=invoiceSettingsService.d.ts.map