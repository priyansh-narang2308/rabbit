export interface RabbitConfig {
  agent: {
    maxSteps: number;
    timeoutMs: number;
    maxRetries: number;
  };
  llm: {
    model: string;
    visionModel: string;
    temperature: number;
    maxTokens: number;
  };
  solari: {
    defaultTemplate: string;
    defaultProxyCountry: string;
    stealth: boolean;
    captcha: boolean;
    recording: boolean;
  };
}

export const defaultConfig: RabbitConfig = {
  agent: {
    maxSteps: 50,
    timeoutMs: 5 * 60_000,
    maxRetries: 3,
  },
  llm: {
    model: "openai/gpt-oss-120b",
    visionModel: "qwen/qwen3.8-27b",
    temperature: 0.1,
    maxTokens: 1024,
  },
  solari: {
    defaultTemplate: "ubuntu-22.04",
    defaultProxyCountry: "us",
    stealth: true,
    captcha: true,
    recording: true,
  },
};
