/** Provider-agnostic text completion. `json: true` asks the provider for a JSON object reply. */
export interface LlmClient {
  complete(input: { system: string; user: string; json?: boolean }): Promise<string>;
}
