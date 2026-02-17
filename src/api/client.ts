import { getConfig } from '../shared/config';
import { ApiError } from '../shared/errors';
import { log } from '../shared/logger';
import { getUserId } from '../storage/preferences';

/**
 * Authenticated API client that adds extension identity headers to all requests.
 * All API calls should go through this client.
 */
export class ApiClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const userId = await getUserId();
    return {
      'X-Extension-Id': chrome.runtime.id,
      'X-User-Id': userId,
      'X-Extension-Version': chrome.runtime.getManifest().version,
    };
  }

  async post<T>(path: string, body: unknown, isFormData = false): Promise<T> {
    const config = getConfig();
    const url = `${config.apiBaseUrl}${path}`;
    const headers = await this.getAuthHeaders();

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: isFormData ? headers : { ...headers, 'Content-Type': 'application/json' },
      body: isFormData ? (body as FormData) : JSON.stringify(body),
    };

    console.log(`[FG] POST ${url.substring(0, 80)}...`);
    const response = await fetch(url, fetchOptions);
    console.log(`[FG] Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = (errorData as { error?: string }).error || response.statusText;
      console.error(`[FG] API Error: ${response.status} ${message}`);
      throw new ApiError(response.status, message);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const config = getConfig();
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${config.apiBaseUrl}${path}${queryString}`;
    const headers = await this.getAuthHeaders();

    log.debug(`GET ${path}`);
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    return response.json() as Promise<T>;
  }
}

/** Singleton API client instance */
export const apiClient = new ApiClient();
