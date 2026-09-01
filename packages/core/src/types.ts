

export interface AgentTask {
  id: string;
  description: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  
  profileId?: string;
  proxyCountry?: string;
  stealthEnabled: boolean;
  captchaEnabled: boolean;
  recordingEnabled: boolean;

  maxSteps: number;
  timeoutMs: number;

  result?: string;
  errorMessage?: string;
}

export interface AgentRun {
  id: string;
  taskId: string;
  status: "running" | "completed" | "failed" | "cancelled";

  solariSessionId?: string;
  solariEnvironment: "browser" | "desktop" | "sandbox";

  totalSteps: number;
  currentUrl?: string;
  durationMs?: number;

  result?: string;
  errorMessage?: string;
}
