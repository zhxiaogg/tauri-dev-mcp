export class TauriMcpError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TauriMcpError';
  }
}

export function createMcpError(code: number, message: string, data?: any) {
  return new Error(message);
}

export function handleTauriError(error: any): Error {
  console.debug('[Error Handler] Handling error:', error);
  
  // Handle HTTP response errors (when response.success is false and we throw response.error)
  if (error?.code && error?.message) {
    // This is the structure from HTTP API: {code: "TOOL_ERROR", message: "..."}
    switch (error.code) {
      case 'TOOL_ERROR':
        return new Error(error.message);
      case 'ELEMENT_NOT_FOUND':
        return new Error(`Element not found: ${error.message}`);
      case 'ELEMENT_NOT_INTERACTABLE':
        return new Error(`Element not interactable: ${error.message}`);
      case 'WEBVIEW_NOT_READY':
        return new Error('Tauri WebView is not ready');
      case 'TIMEOUT':
        return new Error('Operation timed out');
      case 'CONNECTION_ERROR':
        return new Error(`Connection error: ${error.message}`);
      default:
        return new Error(error.message);
    }
  }
  
  // Handle nested error structure (legacy format)
  if (error?.error?.code) {
    switch (error.error.code) {
      case 'ELEMENT_NOT_FOUND':
        return new Error(`Element not found: ${error.error.message}`);
      case 'ELEMENT_NOT_INTERACTABLE':
        return new Error(`Element not interactable: ${error.error.message}`);
      case 'WEBVIEW_NOT_READY':
        return new Error('Tauri WebView is not ready');
      case 'TIMEOUT':
        return new Error('Operation timed out');
      case 'CONNECTION_ERROR':
        return new Error(`Connection error: ${error.error.message}`);
      default:
        return new Error(error.error.message);
    }
  }

  // Handle network errors
  if (error instanceof TauriMcpError) {
    return new Error(`${error.code}: ${error.message}`);
  }

  // Handle validation errors
  if (error?.issues) {
    const issues = error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    return new Error(`Validation error: ${issues}`);
  }

  // Generic error
  return error instanceof Error ? error : new Error('Unknown error occurred');
}

export function validateSelector(selector: string): void {
  if (!selector || typeof selector !== 'string') {
    throw new TauriMcpError('INVALID_SELECTOR', 'Selector must be a non-empty string');
  }

  // Basic CSS selector validation
  try {
    // Test if it's a valid CSS selector by trying to parse it
    // This is a simple test - the browser will do the real validation
    if (selector.trim().length === 0) {
      throw new Error('Empty selector');
    }
  } catch {
    throw new TauriMcpError('INVALID_SELECTOR', `Invalid CSS selector: ${selector}`);
  }
}