export enum AgentType {
  ROUTER = 'ROUTER',
  EMAIL = 'EMAIL',
  CALENDAR = 'CALENDAR',
  TASKS = 'TASKS',
  RESEARCH = 'RESEARCH'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentUsed?: AgentType;
  metadata?: any; // For tool outputs or debug info
}

export interface UserState {
  isAuthenticated: boolean;
  googleConnected: boolean;
  name: string;
  email: string;
}

export interface SystemLog {
  id: string;
  timestamp: Date;
  agent: AgentType;
  action: string;
  details: string;
  status: 'success' | 'pending' | 'error';
}

export interface CalendarEvent {
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}