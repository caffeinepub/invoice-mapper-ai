import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type {
  ExcelTemplate,
  InvoiceProcessingResult,
  VendorTemplate,
  ExtractedFields,
  ExportData,
  UserProfile,
  ExternalBlob,
  Batch,
  BatchInvoice,
  BatchStatus,
  ProcessedInvoiceInput,
} from "../backend";

// ============================================================================
// INVOICE QUERIES
// ============================================================================

export function useGetInvoices() {
  const { actor, isFetching } = useActor();
  return useQuery<InvoiceProcessingResult[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInvoices();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetInvoiceDetails(invoiceId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<InvoiceProcessingResult | null>({
    queryKey: ["invoice", invoiceId?.toString()],
    queryFn: async () => {
      if (!actor || !invoiceId) return null;
      return actor.getInvoiceDetails(invoiceId);
    },
    enabled: !!actor && !isFetching && !!invoiceId,
  });
}

export function useProcessInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blob,
      filename,
      vendorName,
    }: {
      blob: ExternalBlob;
      filename: string;
      vendorName: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.processInvoice(blob, filename, vendorName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// ============================================================================
// EXCEL TEMPLATE QUERIES
// ============================================================================

export function useGetExcelTemplates() {
  const { actor, isFetching } = useActor();
  return useQuery<ExcelTemplate[]>({
    queryKey: ["excel-templates"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getExcelTemplates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetExcelTemplateDetails(templateId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ExcelTemplate | null>({
    queryKey: ["excel-template", templateId?.toString()],
    queryFn: async () => {
      if (!actor || !templateId) return null;
      return actor.getExcelTemplateDetails(templateId);
    },
    enabled: !!actor && !isFetching && !!templateId,
  });
}

export function useUploadExcelTemplate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blob,
      filename,
      columnHeaders,
    }: {
      blob: ExternalBlob;
      filename: string;
      columnHeaders: string[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.uploadExcelTemplate(blob, filename, columnHeaders);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excel-templates"] });
    },
  });
}

// ============================================================================
// VENDOR TEMPLATE QUERIES
// ============================================================================

export function useListVendorTemplates() {
  const { actor, isFetching } = useActor();
  return useQuery<VendorTemplate[]>({
    queryKey: ["vendor-templates"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listVendorTemplates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetVendorTemplate(vendorName: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<VendorTemplate | null>({
    queryKey: ["vendor-template", vendorName],
    queryFn: async () => {
      if (!actor || !vendorName) return null;
      return actor.getVendorTemplate(vendorName);
    },
    enabled: !!actor && !isFetching && !!vendorName,
  });
}

export function useCreateVendorTemplate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vendorName,
      fieldMappings,
    }: {
      vendorName: string;
      fieldMappings: Array<[string, string]>;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createVendorTemplate(vendorName, fieldMappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-templates"] });
    },
  });
}

export function useUpdateVendorTemplate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vendorName,
      fieldMappings,
    }: {
      vendorName: string;
      fieldMappings: Array<[string, string]>;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateVendorTemplate(vendorName, fieldMappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-templates"] });
    },
  });
}

export function useDeleteVendorTemplate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorName: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteVendorTemplate(vendorName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-templates"] });
    },
  });
}

// ============================================================================
// EXPORT QUERIES
// ============================================================================

export function usePrepareExportData() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      invoiceIds,
      columnMappings,
    }: {
      invoiceIds: bigint[];
      columnMappings: Array<[string, string]>;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.prepareExportData(invoiceIds, columnMappings);
    },
  });
}

// ============================================================================
// USER PROFILE QUERIES
// ============================================================================

export function useGetCallerUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

// ============================================================================
// BATCH QUERIES
// ============================================================================

export function useGetBatches(status?: BatchStatus) {
  const { actor, isFetching } = useActor();
  return useQuery<Batch[]>({
    queryKey: ["batches", status],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBatches(status || null);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetBatchDetails(batchId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<{
    batch: Batch;
    invoices: BatchInvoice[];
  } | null>({
    queryKey: ["batch", batchId?.toString()],
    queryFn: async () => {
      if (!actor || !batchId) return null;
      return actor.getBatchDetails(batchId);
    },
    enabled: !!actor && !isFetching && !!batchId,
  });
}

export function useGetBatchInvoices(batchId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<BatchInvoice[]>({
    queryKey: ["batch-invoices", batchId?.toString()],
    queryFn: async () => {
      if (!actor || !batchId) return [];
      return actor.getBatchInvoices(batchId);
    },
    enabled: !!actor && !isFetching && !!batchId,
  });
}

export function useCreateBatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.createBatch();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}

export function useAddInvoiceToBatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      blob,
      filename,
    }: {
      batchId: bigint;
      blob: ExternalBlob;
      filename: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addInvoiceToBatch(batchId, blob, filename);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batch", variables.batchId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["batch-invoices", variables.batchId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}

export function useProcessBatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      invoices,
    }: {
      batchId: bigint;
      invoices: ProcessedInvoiceInput[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.processBatchSequentially(batchId, invoices);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batch", variables.batchId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["batch-invoices", variables.batchId.toString()] });
    },
  });
}

export function useArchiveBatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.archiveBatch(batchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}

export function useAutoApplyVendorTemplate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      vendorName,
    }: {
      batchId: bigint;
      vendorName: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.autoApplyVendorTemplateForBatch(batchId, vendorName);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batch", variables.batchId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["batch-invoices", variables.batchId.toString()] });
    },
  });
}

export function useUpdateBatchInvoiceMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      invoiceId,
      fieldMappings,
    }: {
      batchId: bigint;
      invoiceId: bigint;
      fieldMappings: ExtractedFields;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateBatchInvoiceMapping(batchId, invoiceId, fieldMappings);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["batch", variables.batchId.toString()] });
      queryClient.invalidateQueries({ queryKey: ["batch-invoices", variables.batchId.toString()] });
    },
  });
}

export function useExportBatchData() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      batchId,
      columnHeaders,
    }: {
      batchId: bigint;
      columnHeaders: string[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.exportBatchData(batchId, columnHeaders);
    },
  });
}
