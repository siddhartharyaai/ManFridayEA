import { GoogleGenAI, Type, FunctionDeclaration, Tool, Schema } from "@google/genai";
import { ROUTER_SYSTEM_INSTRUCTION } from '../constants';
import { AgentType, SystemLog } from '../types';

// --- Tool Definitions ---

const calendarToolDeclaration: FunctionDeclaration = {
  name: 'manage_calendar',
  description: 'Manage calendar events: schedule meetings, check availability, or list events.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ['create', 'list', 'update'], description: 'The action to perform' },
      title: { type: Type.STRING, description: 'Title of the event' },
      time: { type: Type.STRING, description: 'Time/Date of the event' },
      attendees: { type: Type.STRING, description: 'Comma separated list of attendees' }
    },
    required: ['action']
  }
};

const emailToolDeclaration: FunctionDeclaration = {
  name: 'draft_email',
  description: 'Draft or send emails to contacts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      recipient: { type: Type.STRING, description: 'Email address or name of recipient' },
      subject: { type: Type.STRING, description: 'Subject line' },
      body: { type: Type.STRING, description: 'Content of the email' }
    },
    required: ['recipient', 'body']
  }
};

const taskToolDeclaration: FunctionDeclaration = {
  name: 'manage_tasks',
  description: 'Manage the todo list.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ['add', 'list', 'complete'] },
      taskTitle: { type: Type.STRING, description: 'Description of the task' }
    },
    required: ['action']
  }
};

// --- Service Class ---

class GeminiService {
  private client: GoogleGenAI;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    // Initialize with env variable as per instructions
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async processMessage(
    userMessage: string, 
    history: any[], 
    addLog: (log: Omit<SystemLog, 'id'>) => void
  ): Promise<{ text: string, agent: AgentType, toolResult?: any }> {
    
    // 1. Configure Tools
    const tools: Tool[] = [
      { functionDeclarations: [calendarToolDeclaration, emailToolDeclaration, taskToolDeclaration] },
      { googleSearch: {} } // Enable Native Google Search
    ];

    addLog({
      timestamp: new Date(),
      agent: AgentType.ROUTER,
      action: 'Thinking...',
      details: 'Analyzing intent and selecting tools',
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

      // 3. Handle Response & Function Calls
      const candidate = response.candidates?.[0];
      
      // Check for Function Calls
      const functionCalls = candidate?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);
      
      if (functionCalls && functionCalls.length > 0) {
        let finalResponseText = "";
        let usedAgent = AgentType.ROUTER;

        // Execute "Mock" Functions
        for (const call of functionCalls) {
          addLog({
            timestamp: new Date(),
            agent: AgentType.ROUTER,
            action: `Calling Tool: ${call.name}`,
            details: JSON.stringify(call.args),
            status: 'success'
          });

          let toolResult = {};

          // --- MOCK TOOL EXECUTION LOGIC ---
          if (call.name === 'manage_calendar') {
            usedAgent = AgentType.CALENDAR;
            toolResult = { status: 'success', message: `Event '${call.args.title || 'Meeting'}' scheduled successfully for ${call.args.time || 'requested time'}.` };
          } else if (call.name === 'draft_email') {
            usedAgent = AgentType.EMAIL;
            toolResult = { status: 'success', message: `Draft saved for ${call.args.recipient}. Subject: ${call.args.subject || '(No Subject)'}` };
          } else if (call.name === 'manage_tasks') {
            usedAgent = AgentType.TASKS;
            toolResult = { status: 'success', message: `Task '${call.args.taskTitle}' added to your list.` };
          }
          // Note: googleSearch is handled automatically by the SDK usually, 
          // but if we get a functionCall for it (rare with the tool config above, usually it returns grounding metadata), we'd handle it.
          // In the new SDK, googleSearch results come in groundingMetadata, not a function call you execute manually.
          
          // Send tool result back to model for final natural language generation
           const toolResponse = await this.client.models.generateContent({
            model: this.modelName,
            contents: [
              ...history,
              { role: 'user', parts: [{ text: userMessage }] },
              { role: 'model', parts: candidate.content.parts }, // The model's function call
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
            config: {
               tools: tools // Keep tools available for multi-turn if needed
            }
          });
          
          finalResponseText += toolResponse.text || "";
        }
        
        return { text: finalResponseText, agent: usedAgent };

      } 
      
      // Check for Grounding (Google Search Results)
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        addLog({
            timestamp: new Date(),
            agent: AgentType.RESEARCH,
            action: 'Google Search',
            details: 'Found grounding data from web',
            status: 'success'
          });
          
          // Append sources to text
          let sources = "\n\nSources:\n";
          groundingChunks.forEach((chunk: any) => {
             if (chunk.web?.uri) {
                sources += `- [${chunk.web.title}](${chunk.web.uri})\n`;
             }
          });
          return { text: response.text + sources, agent: AgentType.RESEARCH };
      }

      // Plain Text Response
      return { text: response.text || "I processed that, but have no text response.", agent: AgentType.ROUTER };

    } catch (error) {
      console.error("Gemini Error:", error);
      addLog({
        timestamp: new Date(),
        agent: AgentType.ROUTER,
        action: 'Error',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      });
      return { text: "I'm having trouble connecting to my brain (Gemini API). Please check your API Key.", agent: AgentType.ROUTER };
    }
  }
}

export const geminiService = new GeminiService();
