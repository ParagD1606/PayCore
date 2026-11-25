import "server-only";

import { ApiError, parseApiError } from "@/lib/api-error";

function getGatewayBaseUrl() {
  const baseUrl = process.env.GATEWAY_API_BASE_URL;

  if (!baseUrl) {
    throw new ApiError(
      500,
      "GATEWAY_API_BASE_URL is not configured on the dashboard server"
    );
  }

  return baseUrl.replace(/\/$/, "");
}

function getGatewayConfig() {
  const apiKey = process.env.MERCHANT_API_KEY;

  if (!apiKey) {
    throw new ApiError(
      500,
      "MERCHANT_API_KEY is not configured on the dashboard server"
    );
  }

  return {
    baseUrl: getGatewayBaseUrl(),
    apiKey,
  };
}

export async function gatewayFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { baseUrl, apiKey } = getGatewayConfig();
  const headers = new Headers(init.headers);

  headers.set("x-api-key", apiKey);
  headers.set("accept", "application/json");

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function gatewayHealthFetch<T>(): Promise<T> {
  const baseUrl = getGatewayBaseUrl();
  const response = await fetch(`${baseUrl}/health`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}
