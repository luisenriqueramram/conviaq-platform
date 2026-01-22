export interface Tag {
  id: number;
  name: string;
  color: string;
  is_system: boolean;
}

export interface Activity {
  id: number;
  activity_type: string;
  description: string;
  performed_by_ai: boolean;
  created_at: string;
  metadata: any;
}

export interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  sent_at: string;
}

export interface Note {
  id: number;
  content: string;
  authorType: string;
  authorId?: number;
  createdAt: string;
}

export interface Reminder {
  id: number;
  text: string;
  dueAt: string;
  active: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  dealValue?: number;
  currency: string;
  stageId?: number;
  pipelineId?: number;
  stageName?: string;
  pipelineName?: string;
  summaryText?: string;
  tags?: Tag[];
}
