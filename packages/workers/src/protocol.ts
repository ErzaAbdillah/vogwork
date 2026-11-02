export interface WorkerRequest {
  id: number;
  task: string;
  input: unknown;
}

export type WorkerResponse =
  | { id: number; type: "progress"; progress: number; message?: string }
  | { id: number; type: "result"; result: unknown }
  | { id: number; type: "error"; message: string };
