import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface UserProfile {
    name: string;
}
export interface BatchInvoice {
    extractedFields?: ExtractedFields;
    invoiceId: bigint;
    isDuplicate: boolean;
    invoiceNumber: string;
    batchId: bigint;
    vendorName: string;
    isAutoMapped: boolean;
}
export interface ExportData {
    columnMappings: Array<[string, string]>;
    invoiceData: Array<InvoiceProcessingResult>;
}
export type Time = bigint;
export interface ExcelTemplate {
    id: bigint;
    blob: ExternalBlob;
    userId: Principal;
    columnHeaders: Array<string>;
    filename: string;
    uploadDate: Time;
}
export interface InvoiceProcessingResult {
    status: {
        __kind__: "fail";
        fail: string;
    } | {
        __kind__: "success";
        success: null;
    };
    extractedFields?: ExtractedFields;
    invoiceId: bigint;
    vendorName: string;
}
export interface ProcessedInvoiceInput {
    blob: ExternalBlob;
    filename: string;
}
export interface Batch {
    status: BatchStatus;
    invoiceCount: bigint;
    userId: Principal;
    createdAt: Time;
    batchId: bigint;
}
export interface ExtractedFields {
    subtotalAmount: string;
    invoiceDate: string;
    invoiceNumber: string;
    totalAmount: string;
    gstTaxId: string;
    vendorName: string;
}
export interface VendorTemplate {
    user: Principal;
    fieldMappings: Array<[string, string]>;
    vendorName: string;
}
export enum BatchStatus {
    active = "active",
    archived = "archived"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addInvoiceToBatch(batchId: bigint, blob: ExternalBlob, filename: string): Promise<BatchInvoice | null>;
    archiveBatch(batchId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    autoApplyVendorTemplateForBatch(batchId: bigint, vendorName: string): Promise<bigint>;
    checkDuplicateInBatch(batchId: bigint, vendorName: string, invoiceNumber: string): Promise<boolean>;
    createBatch(): Promise<bigint>;
    createVendorTemplate(vendorName: string, fieldMappings: Array<[string, string]>): Promise<void>;
    deleteVendorTemplate(vendorName: string): Promise<void>;
    exportBatchData(batchId: bigint, columnHeaders: Array<string>): Promise<ExportData | null>;
    getBatchDetails(batchId: bigint): Promise<{
        batch: Batch;
        invoices: Array<BatchInvoice>;
    } | null>;
    getBatchInvoices(batchId: bigint): Promise<Array<BatchInvoice>>;
    getBatches(status: BatchStatus | null): Promise<Array<Batch>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getExcelTemplateDetails(templateId: bigint): Promise<ExcelTemplate | null>;
    getExcelTemplates(): Promise<Array<ExcelTemplate>>;
    getInvoiceDetails(invoiceId: bigint): Promise<InvoiceProcessingResult | null>;
    getInvoices(): Promise<Array<InvoiceProcessingResult>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVendorTemplate(vendorName: string): Promise<VendorTemplate | null>;
    isCallerAdmin(): Promise<boolean>;
    listVendorTemplates(): Promise<Array<VendorTemplate>>;
    prepareExportData(invoiceIds: Array<bigint>, columnMappings: Array<[string, string]>): Promise<ExportData | null>;
    processBatchSequentially(batchId: bigint, invoiceBlobs: Array<ProcessedInvoiceInput>): Promise<Array<BatchInvoice> | null>;
    processInvoice(blob: ExternalBlob, filename: string, _vendorName: string): Promise<InvoiceProcessingResult>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateBatchInvoiceMapping(batchId: bigint, invoiceId: bigint, fieldMappings: {
        subtotalAmount: string;
        invoiceDate: string;
        invoiceNumber: string;
        totalAmount: string;
        gstTaxId: string;
        vendorName: string;
    }): Promise<void>;
    updateVendorTemplate(vendorName: string, fieldMappings: Array<[string, string]>): Promise<void>;
    uploadExcelTemplate(blob: ExternalBlob, filename: string, columnHeaders: Array<string>): Promise<bigint>;
}
