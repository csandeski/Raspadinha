import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<any> {
  const token = localStorage.getItem("token");
  const adminSessionId = localStorage.getItem("adminSessionId");
  const affiliateToken = localStorage.getItem("affiliateToken");
  const partnerToken = localStorage.getItem("partnerToken");
  const headers: HeadersInit = {};
  
  // Use appropriate auth based on the endpoint
  if (url.startsWith("/api/admin/") && adminSessionId) {
    headers["Authorization"] = `Bearer ${adminSessionId}`;
  } else if (url.startsWith("/api/affiliate/") && affiliateToken) {
    headers["Authorization"] = `Bearer ${affiliateToken}`;
  } else if (url.startsWith("/api/partner/") && partnerToken) {
    headers["Authorization"] = `Bearer ${partnerToken}`;
  } else if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  const responseText = await res.text();

  // Handle 401 errors with automatic logout
  if (res.status === 401) {
    // Determine which panel to redirect to based on URL
    if (url.startsWith("/api/affiliate/")) {
      // Clear affiliate session
      localStorage.removeItem("affiliateToken");
      localStorage.removeItem("affiliateName");
      localStorage.removeItem("affiliateEmail");
      localStorage.removeItem("affiliateAvatar");
      localStorage.removeItem("affiliateRemember");
      window.location.href = "/afiliados";
    } else if (url.startsWith("/api/partner/")) {
      // Clear partner session
      localStorage.removeItem("partnerToken");
      localStorage.removeItem("partnerName");
      localStorage.removeItem("partnerEmail");
      window.location.href = "/parceiros-login";
    }
    return null;
  }

  if (!res.ok) {
    try {
      // Try to parse as JSON to get error message
      const errorData = responseText ? JSON.parse(responseText) : {};
      const errorMessage = errorData.error || errorData.message || responseText || res.statusText;
      console.error(errorMessage);
      
      // Create error object with the message
      const error = new Error(errorMessage);
      (error as any).status = res.status;
      throw error;
    } catch (parseError) {
      // If parsing fails, use the raw text
      const error = new Error(responseText || res.statusText);
      (error as any).status = res.status;
      (error as any).error = responseText || res.statusText;
      throw error;
    }
  }

  return responseText ? JSON.parse(responseText) : null;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("token");
    const adminSessionId = localStorage.getItem("adminSessionId");
    const affiliateToken = localStorage.getItem("affiliateToken");
    const partnerToken = localStorage.getItem("partnerToken");
    const headers: HeadersInit = {};
    const url = queryKey.join("/") as string;
    
    // Use appropriate auth based on the endpoint
    if (url.startsWith("/api/admin/") && adminSessionId) {
      headers["Authorization"] = `Bearer ${adminSessionId}`;
    } else if (url.startsWith("/api/affiliate/") && affiliateToken) {
      headers["Authorization"] = `Bearer ${affiliateToken}`;
    } else if (url.startsWith("/api/partner/") && partnerToken) {
      headers["Authorization"] = `Bearer ${partnerToken}`;
    } else if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    // Handle 401 errors with automatic logout
    if (res.status === 401) {
      // Determine which panel to redirect to based on URL
      if (url.startsWith("/api/affiliate/")) {
        // Clear affiliate session
        localStorage.removeItem("affiliateToken");
        localStorage.removeItem("affiliateName");
        localStorage.removeItem("affiliateEmail");
        localStorage.removeItem("affiliateAvatar");
        localStorage.removeItem("affiliateRemember");
        window.location.href = "/afiliados";
      } else if (url.startsWith("/api/partner/")) {
        // Clear partner session
        localStorage.removeItem("partnerToken");
        localStorage.removeItem("partnerName");
        localStorage.removeItem("partnerEmail");
        window.location.href = "/parceiros-login";
      }
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
