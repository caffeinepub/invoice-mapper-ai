import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Save, X, FileCode } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useListVendorTemplates,
  useUpdateVendorTemplate,
  useDeleteVendorTemplate,
} from "../hooks/useQueries";
import type { VendorTemplate } from "../backend";

export function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<VendorTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Edit state
  const [editedMappings, setEditedMappings] = useState<Array<[string, string]>>([]);

  // Queries
  const { data: templates = [], isLoading } = useListVendorTemplates();
  const updateMutation = useUpdateVendorTemplate();
  const deleteMutation = useDeleteVendorTemplate();

  // Handle edit template
  const handleEditClick = (template: VendorTemplate) => {
    setSelectedTemplate(template);
    setEditedMappings([...template.fieldMappings]);
    setEditDialogOpen(true);
  };

  // Handle save edited template
  const handleSaveEdit = async () => {
    if (!selectedTemplate) return;

    try {
      await updateMutation.mutateAsync({
        vendorName: selectedTemplate.vendorName,
        fieldMappings: editedMappings,
      });

      toast.success("Template updated successfully");
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Update template error:", error);
      toast.error("Failed to update template");
    }
  };

  // Handle delete template
  const handleDeleteClick = (vendorName: string) => {
    setTemplateToDelete(vendorName);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await deleteMutation.mutateAsync(templateToDelete);
      toast.success("Template deleted successfully");
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Delete template error:", error);
      toast.error("Failed to delete template");
    }
  };

  // Handle mapping edit
  const handleMappingFieldChange = (index: number, newFieldName: string) => {
    setEditedMappings((prev) => {
      const updated = [...prev];
      updated[index] = [newFieldName, updated[index][1]];
      return updated;
    });
  };

  const handleMappingColumnChange = (index: number, newColumnName: string) => {
    setEditedMappings((prev) => {
      const updated = [...prev];
      updated[index] = [updated[index][0], newColumnName];
      return updated;
    });
  };

  const handleRemoveMapping = (index: number) => {
    setEditedMappings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMapping = () => {
    setEditedMappings((prev) => [...prev, ["", ""]]);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-48 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage saved field mapping templates for different vendors
          </p>
        </div>

        {templates.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-muted p-4">
                <FileCode className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No templates yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first template in the Mapper by saving a vendor mapping
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.vendorName}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        {template.vendorName}
                      </CardTitle>
                      <CardDescription>
                        {template.fieldMappings.length} field mappings
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(template)}
                        className="gap-2"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(template.vendorName)}
                        className="gap-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Field Mappings:</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.fieldMappings.map(([field, column], idx) => (
                        <Badge key={idx} variant="secondary" className="gap-2">
                          <span className="font-mono text-xs">{field}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{column}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Template: {selectedTemplate?.vendorName}</DialogTitle>
            <DialogDescription>
              Modify field mappings for this vendor template
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Field</TableHead>
                    <TableHead>Excel Column</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedMappings.map(([field, column], index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={field}
                          onChange={(e) =>
                            handleMappingFieldChange(index, e.target.value)
                          }
                          placeholder="Field name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={column}
                          onChange={(e) =>
                            handleMappingColumnChange(index, e.target.value)
                          }
                          placeholder="Column name"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMapping(index)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddMapping}
                className="w-full"
              >
                Add Mapping
              </Button>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template for "{templateToDelete}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
