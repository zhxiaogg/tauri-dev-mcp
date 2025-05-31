import { TauriApiResponse } from "../types/index.js";

export class TauriHttpClient {
  private baseUrl: string;
  private timeout: number;

  constructor(
    baseUrl: string = "http://127.0.0.1:3001/api",
    timeout: number = 30000,
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async execute<T = any>(
    tool: string,
    params: any,
  ): Promise<TauriApiResponse<T>> {
    console.debug('[HTTP Client] Executing tool:', tool, 'with params:', params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.debug('[HTTP Client] Sending request to:', `${this.baseUrl}/execute`);
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as TauriApiResponse<T>;
      console.debug('[HTTP Client] Response:', result);
      return result;
    } catch (error) {
      console.debug('[HTTP Client] Request error:', error);
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            error: {
              code: "TIMEOUT",
              message: `Request timed out after ${this.timeout}ms`,
            },
          };
        }

        // Handle connection errors
        if (error.message.includes("fetch")) {
          return {
            success: false,
            error: {
              code: "CONNECTION_ERROR",
              message:
                "Failed to connect to Tauri plugin. Make sure the Tauri app is running.",
            },
          };
        }
      }

      return {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return false;
      }

      const result = (await response.json()) as {
        status: string;
        webview_ready: boolean;
      };
      console.debug('[HTTP Client] Health check result:', result);
      return result.status === "healthy" && result.webview_ready === true;
    } catch {
      return false;
    }
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}
