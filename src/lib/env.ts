export const env = {
  useMock: (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false',
  apiBase: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  router: (import.meta.env.VITE_ROUTER || 'browser') as 'browser' | 'hash',
};
