import type { AuthProvider } from "./provider.js";
export class StaticAccessTokenProvider implements AuthProvider {
  constructor(private token: string) {}
  async getAccessToken() { return this.token; }
}
