
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Tool, FunctionDeclaration, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { googleApi, getValidAccessToken } from '../../../lib/google-api';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Tool Definitions for Gemini ---
const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'gmail_tool',
        description: 'Read or send emails.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ['read', 'send'] },
            query: { type: Type.STRING },
            recipient: { type: Type.STRING },
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ['action']
        }
      },
      {
        name: 'calendar_tool',
        description: 'Manage calendar events.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ['list', 'create'] },
            timeMin: { type: Type.STRING },
            title: { type: Type.STRING },
            startTime: { type: Type.STRING },
            endTime: { type: Type.STRING }
          },
          required: ['action']
        }
      },
      {
        name: 'reminder_tool',
        description: 'Set a reminder for the user.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            dueAt: { type: Type.STRING, description: 'ISO string time' }
          },
          required: ['content', 'dueAt']
        }
      }
    ]
  },
  { googleSearch: {} }
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = formData.get('From') as string; // 'whatsapp:+1234567890'
    const body = formData.get('Body') as string;
    
    console.log(`Received message from ${from}: ${body}`);

    // 1. Authenticate User
    let { data: user } = await supabase.from('users').select('*').eq('whatsapp_number', from).single();
    
    if (!user) {
      // Create new user
      const { data: newUser, error } = await supabase.from('users').insert({ whatsapp_number: from }).select().single();
      if (error) throw error;
      user = newUser;

      // Generate Auth Link
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/tasks',
        'https://www.googleapis.com/auth/userinfo.email', 
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' ');
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${APP_URL}/api/auth/callback&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${user.id}`;

      return twilioResponse(`Welcome to Man Friday! 🧠\n\nI need to connect to your Google Workspace to be effective.\n\nPlease authorize me here:\n${authUrl}`);
    }

    // 2. Check OAuth Token
    const accessToken = await getValidAccessToken(user.id, supabase);
    
    if (!accessToken) {
       // Re-auth needed
       const scopes = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/tasks';
       const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${APP_URL}/api/auth/callback&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${user.id}`;
       return twilioResponse(`My connection to your Google account has expired. Please reconnect:\n${authUrl}`);
    }

    // 3. Process with Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: body }] }
      ],
      config: {
        systemInstruction: "You are Man Friday, an elite executive assistant. Be concise, professional, and proactive. Use tools to perform actions.",
        tools: tools
      }
    });

    // 4. Handle Function Calls
    let finalReply = "";
    const functionCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);

    if (functionCalls && functionCalls.length > 0) {
      let toolOutputs: any[] = [];
      
      for (const call of functionCalls) {
        console.log(`Calling tool: ${call.name}`);
        let result = {};
        // Cast args to any to handle type safety with dynamic tool arguments
        const args = call.args as any;

        if (call.name === 'gmail_tool') {
          if (args.action === 'read') {
            result = await googleApi.gmail.listMessages(accessToken, args.query);
          } else if (args.action === 'send') {
            result = await googleApi.gmail.sendEmail(accessToken, args.recipient, args.subject, args.body);
          }
        } else if (call.name === 'calendar_tool') {
           if (args.action === 'list') {
            result = await googleApi.calendar.listEvents(accessToken, args.timeMin);
           } else if (args.action === 'create') {
             result = await googleApi.calendar.createEvent(accessToken, {
               summary: args.title,
               start: { dateTime: args.startTime },
               end: { dateTime: args.endTime }
             });
           }
        } else if (call.name === 'reminder_tool') {
           const { error } = await supabase.from('reminders').insert({
             user_id: user.id,
             content: args.content,
             due_at: args.dueAt
           });
           result = error ? { error: error.message } : { success: true, message: "Reminder saved." };
        }

        toolOutputs.push({
          functionResponse: {
            name: call.name,
            response: { result }
          }
        });
      }

      // 5. Send results back to Gemini for final summary
      const secondResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: body }] },
            { role: 'model', parts: response.candidates![0].content.parts },
            { role: 'tool', parts: toolOutputs }
        ],
        config: { tools: tools }
      });
      finalReply = secondResponse.text || "Action completed.";
      
      // Add grounding if present
      const chunks = secondResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
          finalReply += "\n\nSources:";
          chunks.forEach((c: any) => { if(c.web?.uri) finalReply += `\n- ${c.web.title}: ${c.web.uri}`; });
      }

    } else {
      finalReply = response.text || "I'm not sure how to handle that.";
       const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
          finalReply += "\n\nSources:";
          chunks.forEach((c: any) => { if(c.web?.uri) finalReply += `\n- ${c.web.title}: ${c.web.uri}`; });
      }
    }

    return twilioResponse(finalReply);

  } catch (error) {
    console.error('Webhook Error:', error);
    return twilioResponse("I encountered a system error.");
  }
}

function twilioResponse(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}
