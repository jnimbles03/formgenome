export type ApiMode = 'local' | 'cloud';

export interface AppConfig {
  apiBaseUrl: string;
  analyzeEndpoint: string;
  isLocal: boolean;
}
