import { useState, useEffect } from "react";
import { useActor } from "@/hooks/useActor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Settings, Save, ExternalLink, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export function SettingsPage() {
  const { actor, isFetching } = useActor();
  const [apiKey, setApiKey] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Load existing credentials on mount
  useEffect(() => {
    if (!actor || isFetching) return;

    const loadCredentials = async () => {
      try {
        setIsLoading(true);
        
        // Check if credentials exist
        // @ts-ignore - Backend function may not exist yet
        if (typeof actor.hasApiCredentials === 'function') {
          // @ts-ignore
          const exists = await actor.hasApiCredentials();
          setHasCredentials(exists);

          if (exists) {
            // @ts-ignore - Backend function may not exist yet
            if (typeof actor.getApiCredentials === 'function') {
              // @ts-ignore
              const creds = await actor.getApiCredentials();
              if (creds && '__kind__' in creds && creds.__kind__ === 'Some') {
                setApiKey(creds.value.apiKey || "");
                setOrganizationId(creds.value.organizationId || "");
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to load API credentials:", error);
        setConnectionError(
          "Unable to connect to backend. Please ensure you're logged in."
        );
        // Don't show error toast on mount - user may not have set credentials yet
      } finally {
        setIsLoading(false);
      }
    };

    loadCredentials();
  }, [actor, isFetching]);

  const handleSave = async () => {
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }

    if (!apiKey.trim() || !organizationId.trim()) {
      toast.error("Please fill in both API Key and Organization ID");
      return;
    }

    try {
      setIsSaving(true);
      setConnectionError(null);
      
      // @ts-ignore - Backend function may not exist yet
      if (typeof actor.saveApiCredentials !== 'function') {
        throw new Error("Backend API not available yet. Please update the backend to include saveApiCredentials function.");
      }

      // @ts-ignore
      await actor.saveApiCredentials(apiKey.trim(), organizationId.trim());
      
      setHasCredentials(true);
      toast.success("API credentials saved successfully", {
        description: "You can now process invoices with Affinda AI extraction."
      });
    } catch (error) {
      console.error("Failed to save API credentials:", error);
      const errorMessage = error instanceof Error ? error.message : "Please try again later";
      setConnectionError(errorMessage);
      toast.error("Failed to save credentials", {
        description: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure your Affinda API credentials for invoice extraction
            </p>
          </div>
        </div>

        {/* Status Alert */}
        {connectionError ? (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-700 dark:text-red-400">
              Connection Error
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-400 mt-2">
              {connectionError}
            </AlertDescription>
          </Alert>
        ) : hasCredentials ? (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              API credentials are configured. Invoice analysis is enabled.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No API credentials found. Please configure your Affinda API key below to enable invoice extraction.
            </AlertDescription>
          </Alert>
        )}

        {/* API Credentials Card */}
        <Card>
          <CardHeader>
            <CardTitle>Affinda API Credentials</CardTitle>
            <CardDescription>
              Enter your Affinda API key and Organization ID to enable automatic invoice field extraction.
              Your credentials are securely stored and only accessible to you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                API Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your Affinda API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Your API key will be masked for security. It's stored encrypted on the Internet Computer.
              </p>
            </div>

            {/* Organization ID Input */}
            <div className="space-y-2">
              <Label htmlFor="orgId">
                Organization ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="orgId"
                type="text"
                placeholder="Enter your Affinda Organization ID"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Also called "Workspace ID" in Affinda documentation.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={isSaving || !apiKey.trim() || !organizationId.trim()}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documentation Card */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Need help getting your API credentials?</CardTitle>
            <CardDescription>
              Follow these steps to obtain your Affinda API credentials:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Sign up for an Affinda account at <a href="https://www.affinda.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">affinda.com</a></li>
              <li>Navigate to your Dashboard and click on "API Keys" in the left sidebar</li>
              <li>Create a new API key with "Invoice" permissions enabled</li>
              <li>Copy your API key and Organization ID from the dashboard</li>
              <li>Paste them into the fields above and click "Save Settings"</li>
            </ol>

            <Button variant="outline" asChild className="w-full gap-2">
              <a
                href="https://docs.affinda.com/docs/getting-started"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Affinda Documentation
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Technical Note for Developers */}
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">
              <strong>Note for developers:</strong> If you see "Backend API not available" errors, 
              the backend needs to be updated to include the <code className="px-1 py-0.5 rounded bg-muted">saveApiCredentials</code>, 
              <code className="px-1 py-0.5 rounded bg-muted">getApiCredentials</code>, and 
              <code className="px-1 py-0.5 rounded bg-muted">hasApiCredentials</code> functions. 
              See <code className="px-1 py-0.5 rounded bg-muted">IMPLEMENTATION_STATUS.md</code> for details.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
