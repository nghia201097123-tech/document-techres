"use client";

import * as React from "react";
import { Loader2, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BackgroundProgressInfo {
  id: string;
  title: string;
  current: number;
  total: number;
  batchNumber?: number;
  totalBatches?: number;
  status: "running" | "completed" | "error";
  message?: string;
}

interface BackgroundProgressContextType {
  progresses: BackgroundProgressInfo[];
  addProgress: (progress: Omit<BackgroundProgressInfo, "status"> & { status?: BackgroundProgressInfo["status"] }) => void;
  updateProgress: (id: string, updates: Partial<BackgroundProgressInfo>) => void;
  removeProgress: (id: string) => void;
  completeProgress: (id: string, message?: string) => void;
  errorProgress: (id: string, message: string) => void;
}

const BackgroundProgressContext = React.createContext<BackgroundProgressContextType | null>(null);

export function useBackgroundProgress() {
  const context = React.useContext(BackgroundProgressContext);
  if (!context) {
    throw new Error("useBackgroundProgress must be used within BackgroundProgressProvider");
  }
  return context;
}

export function BackgroundProgressProvider({ children }: { children: React.ReactNode }) {
  const [progresses, setProgresses] = React.useState<BackgroundProgressInfo[]>([]);

  const addProgress = React.useCallback((progress: Omit<BackgroundProgressInfo, "status"> & { status?: BackgroundProgressInfo["status"] }) => {
    setProgresses((prev) => [
      ...prev.filter((p) => p.id !== progress.id),
      { ...progress, status: progress.status || "running" },
    ]);
  }, []);

  const updateProgress = React.useCallback((id: string, updates: Partial<BackgroundProgressInfo>) => {
    setProgresses((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const removeProgress = React.useCallback((id: string) => {
    setProgresses((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const completeProgress = React.useCallback((id: string, message?: string) => {
    setProgresses((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "completed" as const, current: p.total, message }
          : p
      )
    );
    // Auto remove after 3 seconds
    setTimeout(() => {
      setProgresses((prev) => prev.filter((p) => p.id !== id));
    }, 3000);
  }, []);

  const errorProgress = React.useCallback((id: string, message: string) => {
    setProgresses((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "error" as const, message } : p
      )
    );
    // Auto remove after 5 seconds
    setTimeout(() => {
      setProgresses((prev) => prev.filter((p) => p.id !== id));
    }, 5000);
  }, []);

  return (
    <BackgroundProgressContext.Provider
      value={{
        progresses,
        addProgress,
        updateProgress,
        removeProgress,
        completeProgress,
        errorProgress,
      }}
    >
      {children}
      <BackgroundProgressDisplay />
    </BackgroundProgressContext.Provider>
  );
}

function BackgroundProgressDisplay() {
  const { progresses, removeProgress } = useBackgroundProgress();

  if (progresses.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {progresses.map((progress) => (
        <div
          key={progress.id}
          className={cn(
            "bg-background border rounded-lg shadow-lg p-3 animate-in slide-in-from-right-5",
            progress.status === "completed" && "border-green-500",
            progress.status === "error" && "border-red-500"
          )}
        >
          <div className="flex items-start gap-3">
            {progress.status === "running" && (
              <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0 mt-0.5" />
            )}
            {progress.status === "completed" && (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            {progress.status === "error" && (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{progress.title}</p>
                <button
                  onClick={() => removeProgress(progress.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {progress.status === "running" && (
                <>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${Math.round((progress.current / progress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress.current}/{progress.total}
                    {progress.batchNumber && progress.totalBatches && (
                      <span> (batch {progress.batchNumber}/{progress.totalBatches})</span>
                    )}
                  </p>
                </>
              )}
              {progress.message && (
                <p className={cn(
                  "text-xs mt-1",
                  progress.status === "error" ? "text-red-500" : "text-muted-foreground"
                )}>
                  {progress.message}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
