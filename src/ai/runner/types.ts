export type ExecutionTier = "client" | "piston" | "native";

export interface ExecutionRequest {
  code: string;
  language: string;
  tier?: ExecutionTier;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

