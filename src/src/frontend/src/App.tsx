import { useState } from "react";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, LogOut, User, FileSpreadsheet, History, FolderCode, Layers, Settings, Trash2 } from "lucide-react";
import { MapperPage } from "./pages/MapperPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { HistoryPage } from "./pages/HistoryPage";
import { BatchDashboard } from "./pages/BatchDashboard";
import { SettingsPage } from "./pages/SettingsPage";
import { TrashPage } from "./pages/TrashPage";

type TabValue = "mapper" | "batches" | "templates" | "history" | "settings" | "trash";

function App() {
  const { login, clear, loginStatus, identity, isInitializing } = useInternetIdentity();
  const [activeTab, setActiveTab] = useState<TabValue>("mapper");

  const isLoggingIn = loginStatus === "logging-in";
  const isLoggedIn = loginStatus === "success" && !!identity;
  const principal = identity?.getPrincipal().toString();

  // Loading state during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">TaxMapper AI</CardTitle>
            <CardDescription>
              AI-powered invoice field mapping for accounting professionals.
              Map invoice fields to Excel columns with smart vendor templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="w-full"
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Login with Internet Identity"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Secure decentralized authentication on the Internet Computer
            </p>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">TaxMapper AI</h1>
              <p className="text-xs text-muted-foreground">
                Invoice Field Mapping Tool
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-mono hidden md:inline">
                  {principal?.slice(0, 8)}...
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2">
                <p className="text-xs font-medium">Principal ID</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {principal}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clear} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
          className="flex-1 flex flex-col"
        >
          <div className="border-b bg-muted/30">
            <div className="container">
              <TabsList className="grid w-full max-w-3xl grid-cols-6 bg-transparent">
                <TabsTrigger value="mapper" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden sm:inline">Mapper</span>
                </TabsTrigger>
                <TabsTrigger value="batches" className="gap-2">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Batches</span>
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-2">
                  <FolderCode className="h-4 w-4" />
                  <span className="hidden sm:inline">Templates</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
                <TabsTrigger value="trash" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Trash</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="mapper" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <MapperPage />
            </TabsContent>

            <TabsContent value="batches" className="m-0">
              <BatchDashboard />
            </TabsContent>

            <TabsContent value="templates" className="m-0">
              <TemplatesPage />
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <HistoryPage />
            </TabsContent>

            <TabsContent value="settings" className="m-0">
              <SettingsPage />
            </TabsContent>

            <TabsContent value="trash" className="m-0">
              <TrashPage />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-4">
        <div className="container text-center text-xs text-muted-foreground">
          © 2026. Built with love using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

export default App;
