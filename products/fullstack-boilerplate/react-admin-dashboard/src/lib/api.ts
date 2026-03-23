const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("admin_auth");
    if (stored) {
      return JSON.parse(stored).token;
    }
  } catch {
    // ignore
  }
  return null;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  customHeaders?: Record<string, string>
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config);

  if (response.status === 401) {
    // Token expired — clear auth and redirect to login
    localStorage.removeItem("admin_auth");
    window.location.href = "/login";
    throw new ApiError(401, "Unauthorized", null);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(response.status, response.statusText, errorBody);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>("GET", path, undefined, headers),

  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>("POST", path, body, headers),

  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>("PUT", path, body, headers),

  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>("PATCH", path, body, headers),

  delete: <T>(path: string, headers?: Record<string, string>) =>
    request<T>("DELETE", path, undefined, headers),
};

// Convenience methods for common patterns
export const apiClient = {
  // Auth
  login: (email: string, password: string) =>
    api.post<{ token: string; user: { name: string; email: string; role: string } }>(
      "/auth/login",
      { email, password }
    ),

  register: (name: string, email: string, password: string) =>
    api.post<{ token: string; user: { name: string; email: string } }>(
      "/auth/register",
      { name, email, password }
    ),

  // Users
  getUsers: (page = 1, limit = 10) =>
    api.get<{
      users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        status: string;
      }>;
      total: number;
      page: number;
      totalPages: number;
    }>(`/users?page=${page}&limit=${limit}`),

  getUser: (id: string) =>
    api.get<{ id: string; name: string; email: string; role: string }>(`/users/${id}`),

  createUser: (data: { name: string; email: string; role: string }) =>
    api.post<{ id: string; name: string; email: string }>("/users", data),

  updateUser: (id: string, data: Partial<{ name: string; email: string; role: string }>) =>
    api.patch<{ id: string; name: string; email: string }>(`/users/${id}`, data),

  deleteUser: (id: string) => api.delete<void>(`/users/${id}`),

  // Settings
  getSettings: () =>
    api.get<Record<string, unknown>>("/settings"),

  updateSettings: (data: Record<string, unknown>) =>
    api.put<Record<string, unknown>>("/settings", data),

  // Analytics
  getAnalytics: (period: "day" | "week" | "month" | "year" = "month") =>
    api.get<{
      revenue: number;
      users: number;
      pageViews: number;
      conversionRate: number;
      chartData: Array<Record<string, unknown>>;
    }>(`/analytics?period=${period}`),
};

export { ApiError };
