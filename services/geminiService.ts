import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { ROUTER_SYSTEM_INSTRUCTION } from '../constants';
import { AgentType, SystemLog } from '../types';

// --- Real World Tool Definitions ---

const gmailTool: FunctionDeclaration = {
  name: 'gmail_tool',
  description: 'Read, draft, or send emails via Gmail API.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ['read_recent', 'draft', 'send'], description: 'Action to perform' },
      query: { type: Type.STRING, description: 'Search query for reading emails' },
      recipient: { type: Type.STRING },
      subject: { type: Type.STRING },
      body: { type: Type.STRING }
    },
    required: ['action']
  }
};

const calendarTool: FunctionDeclaration = {
  name: 'calendar_tool',
  description: 'Manage Google Calendar events.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ['list', 'create', 'update'], description: 'Action to perform' },
      timeMin: { type: Type.STRING, description: 'ISO string for start range' },
      title: { type: Type.STRING },
      startTime: { type: Type.STRING, description: 'ISO string event start' },
      endTime: { type: Type.STRING, description: 'ISO string event end' },
      attendees: { type: Type.STRING, description: 'Comma separated emails' }
    },
    required: ['action']
  }
};

const tasksTool: FunctionDeclaration = {
  name: 'tasks_tool',
  description: 'Manage Google Tasks.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ['list', 'create', 'complete'] },
      title: { type: Type.STRING },
      due: { type: Type.STRING }
    },
    required: ['action']
  }
};

const reminderTool: FunctionDeclaration = {
  name: 'reminder_tool',
  description: 'Set a system reminder (stored in Supabase database).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: 'Reminder content' },
      dueAt: { type: Type.STRING, description: 'When to remind (ISO string or relative time)' }
    },
    required: ['text', 'dueAt']
  }
};

class GeminiService {
  private client: GoogleGenAI;
  private modelName = 'gemini-2.5-flash'; // High-speed model for router

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async processMessage(
    userMessage: string, 
    history: any[], 
    addLog: (log: Omit<SystemLog, 'id'>) => void
  ): Promise<{ text: string, agent: AgentType }> {
    
    // 1. Configure Tools
    const tools: Tool[] = [
      { functionDeclarations: [gmailTool, calendarTool, tasksTool, reminderTool] },
      { googleSearch: {} } // Real Google Search
    ];

    addLog({
      timestamp: new Date(),
      agent: AgentType.ROUTER,
      action: 'Thinking...',
      details: 'Router is evaluating request...',
      status: 'pending'
    });

    try {
      // 2. Call Model
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: ROUTER_SYSTEM_INSTRUCTION,
          tools: tools,
          temperature: 0.7,
        }
      });

      const candidate = response.candidates?.[0];
      
      // 3. Handle Grounding (Search Results)
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        addLog({
            timestamp: new Date(),
            agent: AgentType.RESEARCH,
            action: 'Web Search',
            details: `Found ${groundingChunks.length} sources`,
            status: 'success'
          });
          
          let sources = "\n\n**Sources:**\n";
          groundingChunks.forEach((chunk: any) => {
             if (chunk.web?.uri) {
                sources += `- [${chunk.web.title}](${chunk.web.uri})\n`;
             }
          });
          return { text: (response.text || "Here is what I found:") + sources, agent: AgentType.RESEARCH };
      }

      // 4. Handle Function Calls
      const functionCalls = candidate?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);
      
      if (functionCalls && functionCalls.length > 0) {
        let finalResponseText = "";
        let usedAgent = AgentType.ROUTER;

        for (const call of functionCalls) {
          addLog({
            timestamp: new Date(),
            agent: AgentType.ROUTER,
            action: `Delegating: ${call.name}`,
            details: JSON.stringify(call.args),
            status: 'pending'
          });

          let toolResult = {};
          let statusMessage = "";

          // --- REAL BACKEND SIMULATION LAYER ---
          // In a real deployed app, these would make HTTP requests to the Google APIs using the stored OAuth Token.
          // Since this is a browser simulator, we simulate the "Success" of that backend operation.

          if (call.name === 'gmail_tool') {
            usedAgent = AgentType.EMAIL;
            statusMessage = `[Mock Backend] Gmail API invoked: ${call.args.action} on ${call.args.recipient || 'inbox'}`;
            toolResult = { status: 'success', data: { messageId: 'msg_123', threadId: 'th_123' } };
          } 
          else if (call.name === 'calendar_tool') {
            usedAgent = AgentType.CALENDAR;
            statusMessage = `[Mock Backend] Calendar API invoked: ${call.args.action} event '${call.args.title}'`;
            toolResult = { status: 'success', data: { eventId: 'evt_999', htmlLink: 'https://calendar.google.com/...' } };
          }
          else if (call.name === 'tasks_tool') {
            usedAgent = AgentType.TASKS;
            statusMessage = `[Mock Backend] Tasks API invoked: ${call.args.action}`;
            toolResult = { status: 'success', data: { taskId: 'tsk_555' } };
          }
          else if (call.name === 'reminder_tool') {
             // We can actually try to log this as a "DB Write"
             statusMessage = `[Real DB] Would insert into 'reminders' table: ${call.args.text} @ ${call.args.dueAt}`;
             toolResult = { status: 'success', id: 101 };
          }

          addLog({
            timestamp: new Date(),
            agent: usedAgent,
            action: 'Tool Execution',
            details: statusMessage,
            status: 'success'
          });

          // Feed result back to Gemini
          const toolResponse = await this.client.models.generateContent({
            model: this.modelName,
            contents: [
              ...history,
              { role: 'user', parts: [{ text: userMessage }] },
              { role: 'model', parts: candidate.content.parts },
              { 
                role: 'tool', 
                parts: [{
                  functionResponse: {
                    name: call.name,
                    response: { result: toolResult }
                  }
                }]
              }
            ],
            config: { tools: tools }
          });
          
          finalResponseText += toolResponse.text || "";
        }
        
        return { text: finalResponseText, agent: usedAgent };
      }

      return { text: response.text || "Acknowledged.", agent: AgentType.ROUTER };

    } catch (error) {
      console.error("Gemini Error:", error);
      addLog({
        timestamp: new Date(),
        agent: AgentType.ROUTER,
        action: 'System Error',
        details: error instanceof Error ? error.message : 'Unknown',
        status: 'error'
      });
      return { text: "I encountered a system error connecting to the neural core.", agent: AgentType.ROUTER };
    }
  }
}

export const geminiService = new GeminiService();