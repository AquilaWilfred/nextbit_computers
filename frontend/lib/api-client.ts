const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8001';
const PROXY_BASE = ''; // relative — goes through Next.js at :3000

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include', // HttpOnly cookie sent automatically
    };

    if (body && method !== 'GET') config.body = JSON.stringify(body);

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        if (response.status === 401) throw new Error('HTTP 401: Unauthorized');
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}${text ? ` - ${text}` : ''}`);
      }
      return response.json();
    } catch (error) {
      if (!(error instanceof Error && error.message.startsWith('HTTP 401'))) {
        console.error(`API ${method} ${path} failed:`, error);
      }
      throw error;
    }
  }

  get    = <T>(path: string)             => this.request<T>('GET',    path);
  post   = <T>(path: string, body?: any) => this.request<T>('POST',   path, body);
  put    = <T>(path: string, body?: any) => this.request<T>('PUT',    path, body);
  patch  = <T>(path: string, body?: any) => this.request<T>('PATCH',  path, body);
  delete = <T>(path: string)             => this.request<T>('DELETE', path);
}

// For direct backend calls (public data, no auth needed)
export const apiClient = new ApiClient(API_BASE);

// For auth routes — goes through Next.js proxy so cookie is set on :3000
export const proxyClient = new ApiClient(PROXY_BASE);