import type { ApiErrorBody } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[] | undefined>;

  constructor(status: number, message: string, details?: Record<string, string[] | undefined>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function parseApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = {};
  }

  return new ApiError(
    response.status,
    body.error || body.message || `Request failed (${response.status})`,
    body.details
  );
}
