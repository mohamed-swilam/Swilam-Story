import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useAuth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      const data = await API.authTest();
      return data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = () => {
    localStorage.removeItem("token");
    queryClient.clear();
    window.location.href = "/login";
  };

  return {
    user: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isAuthenticated: !!query.data,
    logout,
    refetch: query.refetch,
  };
}
