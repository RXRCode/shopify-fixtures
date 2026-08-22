export interface AuthProvider { getAccessToken(): Promise<string>; }
