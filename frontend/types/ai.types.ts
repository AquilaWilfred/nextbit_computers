export interface AiSettings {
  model: string;
  systemPrompt: string;
  knowledgeBaseFiles: string[];
}

export interface Endpoint {
  path: string;
  description: string;
}

export interface SavedWorkflow {
  name: string;
  actions: RecordedAction[];
  savedAt: string;
}

export interface RecordedAction {
  type: 'navigate' | 'click';
  payload: { path?: string; selector?: string };
  description: string;
}