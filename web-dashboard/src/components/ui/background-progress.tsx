"use client";

import * as React from "react";
import { Loader2, X, CheckCircle, AlertCircle, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Storage key for background progress
 */
const PROGRESS_STORAGE_KEY = "background-progress-state";

export interface BackgroundProgressInfo {
  id: string;
  title: string;
  current: number;
  total: number;
  batchNumber?: number;
  totalBatches?: number;
  status: "running" | "completed" | "error" | "paused" | "resumable";
  message?: string;
  // For persistent operations
  persistentType?: string;
  canResume?: boolean;
}

interface BackgroundProgressContextType {
  progresses: BackgroundProgressInfo[];
  addProgress: (progress: Omit<BackgroundProgressInfo, "status"> & { status?: BackgroundProgressInfo["status"] }) => void;
  updateProgress: (id: string, updates: Partial<BackgroundProgressInfo>) => void;
  removeProgress: (id: string) => void;
  completeProgress: (id: string, message?: string) => void;
  errorProgress: (id: string, message: string) => void;
  pauseProgress: (id: string) => void;
  // For resumable operations
  onResume?: (id: string) => void;
  setResumeHandler: (handler: ((id: string) => void) | undefined) => void;
}

const BackgroundProgressContext = React.createContext<BackgroundProgressContextType | null>(null);

export function useBackgroundProgress() {
  const context = React.useContext(BackgroundProgressContext);
  if (!context) {
    throw new Error("useBackgroundProgress must be used within BackgroundProgressProvider");
  }
  return context;
}

/**
 * Storage helper for persisting progress
 */
const progressStorage = {
  get: (): BackgroundProgressInfo[] => {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save: (progresses: BackgroundProgressInfo[]) => {
    if (typeof window === "undefined") return;
    try {
      // Only save running/paused/resumable progresses
      const toSave = progresses.filter(
        (p) => p.status === "running" || p.status === "paused" || p.status === "resumable"
      );
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error("Failed to save progress:", e);
    }
  },

  clear: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(PROGRESS_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear progress:", e);
    }
  },
};

export function BackgroundProgressProvider({ children }: { children: React.ReactNode }) {
  const [progresses, setProgresses] = React.useState<BackgroundProgressInfo[]>([]);
  const [resumeHandler, setResumeHandler] = React.useState<((id: string) => void) | undefined>();

  // Load persisted progress on mount
  React.useEffect(() => {
    const stored = progressStorage.get();
    if (stored.length > 0) {
      // Mark previously running items as resumable (since page was reloaded)
      const updated = stored.map((p) => ({
        ...p,
        status: p.status === "running" ? ("resumable" as const) : p.status,
        canResume: true,
      }));
      setProgresses(updated);
    }
  }, []);

  // Save progress whenever it changes
  React.useEffect(() => {
    progressStorage.save(progresses);
  }, [progresses]);

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
          ? { ...p, status: "completed" as const, current: p.total, message, canResume: false }
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
        p.id === id ? { ...p, status: "error" as const, message, canResume: false } : p
      )
    );
    // Auto remove after 5 seconds
    setTimeout(() => {
      setProgresses((prev) => prev.filter((p) => p.id !== id));
    }, 5000);
  }, []);

  const pauseProgress = React.useCallback((id: string) => {
    setProgresses((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "paused" as const, canResume: true } : p
      )
    );
  }, []);

  const handleSetResumeHandler = React.useCallback((handler: ((id: string) => void) | undefined) => {
    setResumeHandler(() => handler);
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
        pauseProgress,
        onResume: resumeHandler,
        setResumeHandler: handleSetResumeHandler,
      }}
    >
      {children}
      <BackgroundProgressDisplay />
    </BackgroundProgressContext.Provider>
  );
}

function BackgroundProgressDisplay() {
  const { progresses, removeProgress, onResume } = useBackgroundProgress();

  if (progresses.length === 0) return null;

  const handleResume = (id: string) => {
    if (onResume) {
      onResume(id);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {progresses.map((progress) => (
        <div
          key={progress.id}
          className={cn(
            "bg-background border rounded-lg shadow-lg p-3 animate-in slide-in-from-right-5",
            progress.status === "completed" && "border-green-500",
            progress.status === "error" && "border-red-500",
            (progress.status === "paused" || progress.status === "resumable") && "border-yellow-500"
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
            {(progress.status === "paused" || progress.status === "resumable") && (
              <Pause className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{progress.title}</p>
                <div className="flex items-center gap-1">
                  {progress.canResume && onResume && (progress.status === "paused" || progress.status === "resumable") && (
                    <button
                      onClick={() => handleResume(progress.id)}
                      className="text-green-500 hover:text-green-600 p-1"
                      title="Tiếp tục"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeProgress(progress.id)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {(progress.status === "running" || progress.status === "paused" || progress.status === "resumable") && (
                <>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        progress.status === "running" ? "bg-primary" : "bg-yellow-500"
                      )}
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
                    {(progress.status === "paused" || progress.status === "resumable") && (
                      <span className="text-yellow-500 ml-1">- Đang tạm dừng</span>
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
              {progress.status === "resumable" && (
                <p className="text-xs text-yellow-600 mt-1">
                  Trang đã được làm mới. Nhấn ▶ để tiếp tục.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
