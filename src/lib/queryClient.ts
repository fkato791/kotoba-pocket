import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      retry: 1,
      staleTime: 30_000
    },
    mutations: {
      networkMode: "offlineFirst"
    }
  }
});
