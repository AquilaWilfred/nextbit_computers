import { proxyClient } from "@/lib/api-client";

class AIService {
  async sendMessage(message: string, history: any[], cartContext: any[], userId?: string, userEmail?: string) {
    return proxyClient.post("/ai/chat", {
      message,
      history,
      cartContext: cartContext.length > 0 ? cartContext : undefined,
      userId,
      userEmail,
    });
  }

  async clearHistory() {
    return proxyClient.post("/ai/clear-history", {});
  }

  async getHistory() {
    return proxyClient.get("/ai/history");
  }
}

export const aiService = new AIService();