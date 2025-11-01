
export enum CallStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  ERROR = 'error',
}

export interface TranscriptionEntry {
  id: number;
  speaker: 'user' | 'bot';
  text: string;
}
