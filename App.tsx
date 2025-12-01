import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { UserState, Message, SystemLog, AgentType } from './types';
import { INITIAL_GREETING } from './constants';
import { geminiService } from './services/geminiService';

export default function App() {
  const [userState, setUserState] = useState<UserState>({
    isAuthenticated: true,
    googleConnected: false,
    name: 'Siddharth',
    email: 'sid@manfriday.ai'
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: INITIAL_GREETING,
      timestamp: new Date(),
      agentUsed: AgentType.ROUTER
    }
  ]);

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Helper to add logs from anywhere
  const addLog = useCallback((logData: Omit<SystemLog, 'id'>) => {
    const newLog = { ...logData, id: Math.random().toString(36).substr(2, 9) };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const handleConnectGoogle = () => {
    addLog({
      timestamp: new Date(),
      agent: AgentType.ROUTER,
      action: 'Auth',
      details: 'Initiating Google OAuth Mock Flow...',
      status: 'pending'
    });
    
    setTimeout(() => {
        setUserState(prev => ({ ...prev, googleConnected: true }));
        addLog({
            timestamp: new Date(),
            agent: AgentType.ROUTER,
            action: 'Auth',
            details: 'Google Workspace Connected Successfully',
            status: 'success'
        });
        
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I've successfully connected to your Google Account. I can now access your Calendar, Gmail, and Tasks.",
            timestamp: new Date()
        }]);
    }, 1500);
  };

  const handleSendMessage = async (text: string) => {
    if (!process.env.API_KEY) {
        alert("Please set your REACT_APP_GEMINI_API_KEY or allow the environment to inject process.env.API_KEY");
        return;
    }

    // 1. Add User Message
    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
        // 2. Prepare History for Gemini (map internal types to Gemini content)
        // Only take last 10 messages for context window efficiency in simulation
        const historyForGemini = messages.slice(-10).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // 3. Call Service
        const response = await geminiService.processMessage(text, historyForGemini, addLog);

        // 4. Add Response Message
        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.text,
            timestamp: new Date(),
            agentUsed: response.agent
        };
        setMessages(prev => [...prev, botMsg]);

    } catch (error) {
        console.error("App Error:", error);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-black overflow-hidden">
      {/* Sidebar - Control Panel */}
      <Sidebar 
        userState={userState} 
        logs={logs} 
        onConnect={handleConnectGoogle} 
      />

      {/* Main Chat Interface */}
      <div className="flex-1 h-full relative">
        <ChatInterface 
            messages={messages} 
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
        />
        
        {/* Environment Warning Overlay */}
        {!process.env.API_KEY && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-slate-900 p-8 rounded-xl border border-red-500 max-w-md text-center">
                    <h2 className="text-xl font-bold text-red-500 mb-4">API Key Missing</h2>
                    <p className="text-slate-300 mb-4">
                        To run the Man Friday simulation, a Gemini API Key is required.
                    </p>
                    <p className="text-sm text-slate-500">
                        This environment usually injects <code>process.env.API_KEY</code> automatically. 
                        If you are running locally, ensure your <code>.env</code> file is configured.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}