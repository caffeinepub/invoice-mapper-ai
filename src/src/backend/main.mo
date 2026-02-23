import Time "mo:core/Time";
import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Persistent state
  let invoiceCounter = Map.empty<Principal, Nat>();
  let templateCounters = Map.empty<Principal, Nat>();
  let excelTemplateCounters = Map.empty<Principal, Nat>();

  // Custom Data Structures
  public type UserProfile = {
    name : Text;
  };

  type InvoiceProcessingResult = {
    status : {
      #success;
      #fail : Text;
    };
    invoiceId : Nat;
    vendorName : Text;
    extractedFields : ?ExtractedFields;
  };

  type InvoiceField = {
    name : Text;
    value : Text;
  };

  type ExtractedFields = {
    vendorName : Text;
    invoiceDate : Text;
    invoiceNumber : Text;
    gstTaxId : Text;
    subtotalAmount : Text;
    totalAmount : Text;
  };

  type VendorTemplate = {
    vendorName : Text;
    user : Principal;
    fieldMappings : [(Text, Text)]; // (FieldName, ColumnName)
  };

  type ExcelTemplate = {
    id : Nat;
    filename : Text;
    columnHeaders : [Text];
    userId : Principal;
    uploadDate : Time.Time;
    blob : Storage.ExternalBlob;
  };

  type ExportData = {
    columnMappings : [(Text, Text)];
    invoiceData : [InvoiceProcessingResult];
  };

  // Batch Structures
  public type BatchStatus = {
    #active;
    #archived;
  };

  public type Batch = {
    batchId : Nat;
    userId : Principal;
    createdAt : Time.Time;
    status : BatchStatus;
    invoiceCount : Nat;
  };

  public type BatchInvoice = {
    batchId : Nat;
    invoiceId : Nat;
    vendorName : Text;
    invoiceNumber : Text;
    isDuplicate : Bool;
    isAutoMapped : Bool;
    extractedFields : ?ExtractedFields;
  };

  public type ProcessedInvoiceInput = {
    blob : Storage.ExternalBlob;
    filename : Text;
  };

  // Component Mixins
  include MixinStorage();
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Stable data for canister upgrades
  let userProfiles = Map.empty<Principal, UserProfile>();
  let vendorTemplates = Map.empty<Principal, Map.Map<Text, VendorTemplate>>();
  let excelTemplates = Map.empty<Principal, List.List<ExcelTemplate>>();
  let invoices = Map.empty<Principal, List.List<InvoiceProcessingResult>>();

  // Batch processing storage
  var batchCounters = Map.empty<Principal, Nat>(); // Changed from let to var for migration compatibility
  let batches = Map.empty<Principal, List.List<Batch>>();
  let batchInvoices = Map.empty<Nat, List.List<BatchInvoice>>();
  let batchDuplicateKeys = Map.empty<Nat, Map.Map<Text, Bool>>();

  // USER PROFILE MANAGEMENT
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // INVOICE MANAGEMENT
  public shared ({ caller }) func processInvoice(blob : Storage.ExternalBlob, filename : Text, _vendorName : Text) : async InvoiceProcessingResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can process invoices");
    };

    let userId = caller;
    let invoiceId = getNextInvoiceId(userId);
    let startResult : InvoiceProcessingResult = {
      status = #success;
      invoiceId;
      extractedFields = null;
      vendorName = filename;
    };
    addInvoice(userId, startResult);

    let affindaResponse = await submitToAffinda(blob);
    switch (affindaResponse) {
      case (#fail(error)) {
        let failResult : InvoiceProcessingResult = {
          invoiceId;
          status = #fail(error);
          vendorName = filename;
          extractedFields = null;
        };
        updateInvoice(userId, failResult);
        failResult;
      };
      case (#success(fields)) {
        let successResult : InvoiceProcessingResult = {
          status = #success;
          invoiceId;
          extractedFields = ?fields;
          vendorName = filename;
        };
        updateInvoice(userId, successResult);
        successResult;
      };
    };
  };

  public query ({ caller }) func getInvoices() : async [InvoiceProcessingResult] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access invoices");
    };

    switch (invoices.get(caller)) {
      case (null) { [] };
      case (?userInvoices) {
        userInvoices.reverse().toArray();
      };
    };
  };

  public query ({ caller }) func getInvoiceDetails(invoiceId : Nat) : async ?InvoiceProcessingResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access invoice details");
    };

    switch (invoices.get(caller)) {
      case (null) { null };
      case (?userInvoices) {
        let found = userInvoices.find(func(inv : InvoiceProcessingResult) : Bool {
          inv.invoiceId == invoiceId
        });
        found;
      };
    };
  };

  // VENDOR TEMPLATE MANAGEMENT
  public shared ({ caller }) func createVendorTemplate(vendorName : Text, fieldMappings : [(Text, Text)]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create vendor templates");
    };

    let template : VendorTemplate = {
      vendorName;
      user = caller;
      fieldMappings;
    };

    switch (vendorTemplates.get(caller)) {
      case (null) {
        let newMap = Map.empty<Text, VendorTemplate>();
        newMap.add(vendorName, template);
        vendorTemplates.add(caller, newMap);
      };
      case (?userTemplates) {
        userTemplates.add(vendorName, template);
      };
    };
  };

  public query ({ caller }) func getVendorTemplate(vendorName : Text) : async ?VendorTemplate {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access vendor templates");
    };

    switch (vendorTemplates.get(caller)) {
      case (null) { null };
      case (?userTemplates) {
        userTemplates.get(vendorName);
      };
    };
  };

  public query ({ caller }) func listVendorTemplates() : async [VendorTemplate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list vendor templates");
    };

    switch (vendorTemplates.get(caller)) {
      case (null) { [] };
      case (?userTemplates) {
        userTemplates.values().toArray();
      };
    };
  };

  public shared ({ caller }) func updateVendorTemplate(vendorName : Text, fieldMappings : [(Text, Text)]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update vendor templates");
    };

    switch (vendorTemplates.get(caller)) {
      case (null) {
        Runtime.trap("Vendor template not found");
      };
      case (?userTemplates) {
        if (not userTemplates.containsKey(vendorName)) {
          Runtime.trap("Vendor template not found");
        };
        let template : VendorTemplate = {
          vendorName;
          user = caller;
          fieldMappings;
        };
        userTemplates.add(vendorName, template);
      };
    };
  };

  public shared ({ caller }) func deleteVendorTemplate(vendorName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete vendor templates");
    };

    switch (vendorTemplates.get(caller)) {
      case (null) {
        Runtime.trap("Vendor template not found");
      };
      case (?userTemplates) {
        if (not userTemplates.containsKey(vendorName)) {
          Runtime.trap("Vendor template not found");
        };
        userTemplates.remove(vendorName);
      };
    };
  };

  // EXCEL TEMPLATE MANAGEMENT
  public shared ({ caller }) func uploadExcelTemplate(blob : Storage.ExternalBlob, filename : Text, columnHeaders : [Text]) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload Excel templates");
    };

    let templateId = getNextExcelTemplateId(caller);
    let template : ExcelTemplate = {
      id = templateId;
      filename;
      columnHeaders;
      userId = caller;
      uploadDate = Time.now();
      blob;
    };

    switch (excelTemplates.get(caller)) {
      case (null) {
        let newList = List.empty<ExcelTemplate>();
        newList.add(template);
        excelTemplates.add(caller, newList);
      };
      case (?existing) {
        existing.add(template);
        excelTemplates.add(caller, existing);
      };
    };

    templateId;
  };

  public query ({ caller }) func getExcelTemplates() : async [ExcelTemplate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access Excel templates");
    };

    switch (excelTemplates.get(caller)) {
      case (null) { [] };
      case (?userTemplates) {
        userTemplates.reverse().toArray();
      };
    };
  };

  public query ({ caller }) func getExcelTemplateDetails(templateId : Nat) : async ?ExcelTemplate {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access Excel template details");
    };

    switch (excelTemplates.get(caller)) {
      case (null) { null };
      case (?userTemplates) {
        let found = userTemplates.find(func(tmpl : ExcelTemplate) : Bool {
          tmpl.id == templateId
        });
        found;
      };
    };
  };

  // DATA EXPORT PREPARATION
  public query ({ caller }) func prepareExportData(invoiceIds : [Nat], columnMappings : [(Text, Text)]) : async ?ExportData {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can prepare export data");
    };

    switch (invoices.get(caller)) {
      case (null) { null };
      case (?userInvoices) {
        let selectedInvoices = List.empty<InvoiceProcessingResult>();

        for (id in invoiceIds.vals()) {
          let found = userInvoices.find(func(inv : InvoiceProcessingResult) : Bool {
            inv.invoiceId == id
          });
          switch (found) {
            case (?invoice) { selectedInvoices.add(invoice) };
            case (null) {};
          };
        };

        let exportData : ExportData = {
          columnMappings;
          invoiceData = selectedInvoices.toArray();
        };
        ?exportData;
      };
    };
  };

  // BATCH PROCESSING FUNCTIONS
  public shared ({ caller }) func createBatch() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create batches");
    };

    let userId = caller;
    let batchId = getNextBatchId(userId);

    let batch : Batch = {
      batchId;
      userId;
      createdAt = Time.now();
      status = #active;
      invoiceCount = 0;
    };

    switch (batches.get(userId)) {
      case (null) {
        let batchList = List.empty<Batch>();
        batchList.add(batch);
        batches.add(userId, batchList);
      };
      case (?existing) {
        existing.add(batch);
      };
    };

    batchId;
  };

  public shared ({ caller }) func addInvoiceToBatch(batchId : Nat, blob : Storage.ExternalBlob, filename : Text) : async ?BatchInvoice {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add invoices to batches");
    };

    // Verify batch ownership
    let batchOwner = findUserByBatchId(batchId);
    switch (batchOwner) {
      case (null) {
        Runtime.trap("Batch not found");
      };
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Unauthorized: You can only add invoices to your own batches");
        };
      };
    };

    // Check if batch is active
    if (not isBatchActive(caller, batchId)) {
      Runtime.trap("Cannot add invoices to archived batch");
    };

    // Check batch size limit
    let currentCount = getBatchInvoiceCount(batchId);
    if (currentCount >= 50) {
      Runtime.trap("Batch limit reached: Maximum 50 invoices per batch");
    };

    let isDuplicate = checkDuplicate(batchId, filename, "");
    let batchInvoice : BatchInvoice = {
      batchId;
      invoiceId = getNextBatchInvoiceId();
      vendorName = filename;
      invoiceNumber = "";
      isDuplicate;
      isAutoMapped = false;
      extractedFields = null;
    };

    switch (batchInvoices.get(batchId)) {
      case (null) {
        let invoiceList = List.empty<BatchInvoice>();
        invoiceList.add(batchInvoice);
        batchInvoices.add(batchId, invoiceList);
      };
      case (?existing) {
        existing.add(batchInvoice);
      };
    };

    ?batchInvoice;
  };

  public shared ({ caller }) func processBatchSequentially(batchId : Nat, invoiceBlobs : [ProcessedInvoiceInput]) : async ?[BatchInvoice] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can process batches");
    };

    // Verify batch ownership
    let batchOwner = findUserByBatchId(batchId);
    switch (batchOwner) {
      case (null) {
        Runtime.trap("Batch not found");
      };
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Unauthorized: You can only process your own batches");
        };
      };
    };

    let processedInvoices = List.empty<BatchInvoice>();

    for (blob in invoiceBlobs.vals()) {
      switch (await addInvoiceToBatch(batchId, blob.blob, blob.filename)) {
        case (null) {};
        case (?invoice) {
          processedInvoices.add(invoice);
        };
      };
    };
    ?processedInvoices.toArray();
  };

  public query ({ caller }) func getBatchDetails(batchId : Nat) : async ?{ batch : Batch; invoices : [BatchInvoice] } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get batch details");
    };

    // Verify batch ownership
    let batchOwner = findUserByBatchId(batchId);
    switch (batchOwner) {
      case (null) { return null };
      case (?owner) {
        if (owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only view your own batches");
        };
      };
    };

    switch (batches.get(caller)) {
      case (null) { null };
      case (?userBatches) {
        switch (userBatches.find(func(b) { b.batchId == batchId })) {
          case (null) { null };
          case (?batch) {
            let batchInvs = switch (batchInvoices.get(batchId)) {
              case (null) { List.empty<BatchInvoice>() };
              case (?invs) { invs };
            };
            ?{ batch; invoices = batchInvs.reverse().toArray() };
          };
        };
      };
    };
  };

  public query ({ caller }) func getBatches(status : ?BatchStatus) : async [Batch] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get batches");
    };

    let userId = caller;
    switch (batches.get(userId)) {
      case (null) { [] };
      case (?userBatches) {
        let filtered = List.empty<Batch>();
        for (batch in userBatches.reverse().values()) {
          switch (status) {
            case (null) {
              filtered.add(batch);
            };
            case (?filterStatus) {
              if (batch.status == filterStatus) {
                filtered.add(batch);
              };
            };
          };
        };
        filtered.reverse().toArray();
      };
    };
  };

  public query ({ caller }) func getBatchInvoices(batchId : Nat) : async [BatchInvoice] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get batch invoices");
    };

    // Verify batch ownership
    let batchOwner = findUserByBatchId(batchId);
    switch (batchOwner) {
      case (null) {
        Runtime.trap("Batch not found");
      };
      case (?owner) {
        if (owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only view invoices from your own batches");
        };
      };
    };

    switch (batchInvoices.get(batchId)) {
      case (null) { [] };
      case (?batchInvs) {
        batchInvs.reverse().toArray();
      };
    };
  };

  public query ({ caller }) func checkDuplicateInBatch(batchId : Nat, vendorName : Text, invoiceNumber : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check duplicates in batches");
    };

    // Verify batch ownership
    let batchOwner = findUserByBatchId(batchId);
    switch (batchOwner) {
      case (null) {
        Runtime.trap("Batch not found");
      };
      case (?owner) {
        if (owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only check duplicates in your own batches");
        };
      };
    };

    checkDuplicate(batchId, vendorName, invoiceNumber);
  };

  public shared ({ caller }) func autoApplyVendorTemplateForBatch(batchId : Nat, vendorName : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can auto-apply vendor templates");
    };

    // Verify batch ownership
    let batchOwner = findUserByBatchId(batchId);
    switch (batchOwner) {
      case (null) {
        Runtime.trap("Batch not found");
      };
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Unauthorized: You can only auto-apply templates to your own batches");
        };
      };
    };

    // Check if batch is active
    if (not isBatchActive(caller, batchId)) {
      Runtime.trap("Cannot modify archived batch");
    };

    let batchInvs = switch (batchInvoices.get(batchId)) {
      case (null) { List.empty<BatchInvoice>() };
      case (?invs) { invs };
    };

    let filteredList = batchInvs.filter(
      func(inv) { inv.vendorName == vendorName and not inv.isAutoMapped }
    );
    let count = filteredList.size();
    count;
  };

  public shared ({ caller }) func archiveBatch(batchId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can archive batches");
    };

    // Verify batch ownership
    let batchOwner = findUserByBatchId(batchId);
    switch (batchOwner) {
      case (null) {
        Runtime.trap("Batch not found");
      };
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Unauthorized: You can only archive your own batches");
        };
      };
    };

    let userId = caller;

    switch (batches.get(userId)) {
      case (null) { Runtime.trap("Could not archive: batch not found for user") };
      case (?userBatches) {
        let updatedBatches = userBatches.map<Batch, Batch>(
          func(batch) {
            if (batch.batchId == batchId) {
              { batch with status = #archived };
            } else { batch };
          }
        );
        batches.add(userId, updatedBatches);
      };
    };
  };

  public query ({ caller }) func exportBatchData(batchId : Nat, columnHeaders : [Text]) : async ?ExportData {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can export batch data");
    };

    // Verify batch ownership
    let batchOwner = findUserByBatchId(batchId);
    switch (batchOwner) {
      case (null) {
        Runtime.trap("Batch not found");
      };
      case (?owner) {
        if (owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only export data from your own batches");
        };
      };
    };

    switch (batchInvoices.get(batchId)) {
      case (null) { null };
      case (?batchInvs) {
        let exportData : ExportData = {
          columnMappings = columnHeaders.map(
            func(header) { (header, header) }
          );
          invoiceData = batchInvs.reverse().toArray().map<BatchInvoice, InvoiceProcessingResult>(
            func(batchInv) {
              {
                status = #success;
                invoiceId = batchInv.invoiceId;
                vendorName = batchInv.vendorName;
                extractedFields = batchInv.extractedFields;
              };
            }
          );
        };
        ?exportData;
      };
    };
  };

  public shared ({ caller }) func updateBatchInvoiceMapping(batchId : Nat, invoiceId : Nat, fieldMappings : { vendorName : Text; invoiceDate : Text; invoiceNumber : Text; gstTaxId : Text; subtotalAmount : Text; totalAmount : Text }) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update field mappings");
    };

    // Verify batch ownership
    let batchOwner = findUserByBatchId(batchId);
    switch (batchOwner) {
      case (null) {
        Runtime.trap("Batch not found");
      };
      case (?owner) {
        if (owner != caller) {
          Runtime.trap("Unauthorized: You can only update mappings in your own batches");
        };
      };
    };

    // Check if batch is active
    if (not isBatchActive(caller, batchId)) {
      Runtime.trap("Cannot modify archived batch");
    };

    let batchInvs = switch (batchInvoices.get(batchId)) {
      case (null) { List.empty<BatchInvoice>() };
      case (?invs) { invs };
    };

    let updatedInvs = batchInvs.map<BatchInvoice, BatchInvoice>(
      func(inv) {
        if (inv.invoiceId == invoiceId) {
          { inv with extractedFields = ?fieldMappings };
        } else { inv };
      }
    );
    batchInvoices.add(batchId, updatedInvs);
  };

  // UTILITIES
  func submitToAffinda(_blob : Storage.ExternalBlob) : async { #fail : Text; #success : ExtractedFields } {
    let fields : ExtractedFields = {
      vendorName = "Sample Vendor";
      invoiceDate = "2023-01-01";
      invoiceNumber = "INV12345";
      gstTaxId = "GST123456";
      subtotalAmount = "1000.00";
      totalAmount = "1070.00";
    };

    #success(fields);
  };

  func getNextInvoiceId(userId : Principal) : Nat {
    switch (invoiceCounter.get(userId)) {
      case (null) {
        invoiceCounter.add(userId, 1);
        1;
      };
      case (?count) {
        let next = count + 1;
        invoiceCounter.add(userId, next);
        next;
      };
    };
  };

  func getNextTemplateId(userId : Principal) : Nat {
    switch (templateCounters.get(userId)) {
      case (null) {
        templateCounters.add(userId, 1);
        1;
      };
      case (?count) {
        let next = count + 1;
        templateCounters.add(userId, next);
        next;
      };
    };
  };

  func getNextExcelTemplateId(userId : Principal) : Nat {
    switch (excelTemplateCounters.get(userId)) {
      case (null) {
        excelTemplateCounters.add(userId, 1);
        1;
      };
      case (?count) {
        let next = count + 1;
        excelTemplateCounters.add(userId, next);
        next;
      };
    };
  };

  func addInvoice(userId : Principal, invoice : InvoiceProcessingResult) {
    switch (invoices.get(userId)) {
      case (null) {
        let newList = List.empty<InvoiceProcessingResult>();
        newList.add(invoice);
        invoices.add(userId, newList);
      };
      case (?existing) {
        existing.add(invoice);
        invoices.add(userId, existing);
      };
    };
  };

  func updateInvoice(userId : Principal, updated : InvoiceProcessingResult) {
    switch (invoices.get(userId)) {
      case (null) { Runtime.trap("Invoice not found for update") };
      case (?existing) {
        let updatedEntries = existing.map<InvoiceProcessingResult, InvoiceProcessingResult>(
          func(entry) {
            if (entry.invoiceId == updated.invoiceId) { return updated };
            entry;
          }
        );
        invoices.add(userId, updatedEntries);
      };
    };
  };

  func getNextBatchId(userId : Principal) : Nat {
    switch (batchCounters.get(userId)) {
      case (null) {
        batchCounters.add(userId, 1);
        1;
      };
      case (?count) {
        let next = count + 1;
        batchCounters.add(userId, next);
        next;
      };
    };
  };

  func getNextBatchInvoiceId() : Nat {
    var maxId = 0;
    for (invs in batchInvoices.values()) {
      for (inv in invs.values()) {
        if (inv.invoiceId > maxId) { maxId := inv.invoiceId };
      };
    };
    maxId + 1;
  };

  func checkDuplicate(batchId : Nat, vendorName : Text, invoiceNumber : Text) : Bool {
    let key = vendorName.concat(":").concat(invoiceNumber);
    switch (batchDuplicateKeys.get(batchId)) {
      case (null) { false };
      case (?dupMap) {
        dupMap.containsKey(key);
      };
    };
  };

  func isBatchActive(userId : Principal, batchId : Nat) : Bool {
    switch (batches.get(userId)) {
      case (null) { false };
      case (?userBatches) {
        switch (userBatches.find(func(batch) { batch.batchId == batchId })) {
          case (null) { false };
          case (?batch) { batch.status == #active };
        };
      };
    };
  };

  func findUserByBatchId(batchId : Nat) : ?Principal {
    let allBatches = flattenBatchMap();
    switch (allBatches.find(func(batch) { batch.batchId == batchId })) {
      case (null) { null };
      case (?batch) { ?batch.userId };
    };
  };

  func flattenBatchMap() : List.List<Batch> {
    let allBatches = List.empty<Batch>();
    for (batchList in batches.values()) {
      allBatches.addAll(batchList.clone().values());
    };
    allBatches;
  };

  func getBatchInvoiceCount(batchId : Nat) : Nat {
    switch (batchInvoices.get(batchId)) {
      case (null) { 0 };
      case (?invs) { invs.size() };
    };
  };
};
