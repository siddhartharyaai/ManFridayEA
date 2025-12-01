"use client";

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import { UserState, Message, SystemLog, AgentType } from '../types';
import { INITIAL_GREETING } from '../constants';
import { geminiService } from '../services/geminiService';

export default function Dashboard() {
  // --- Client Side State Management ---
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
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const addLog = useCallback((logData: Omit<SystemLog, 'id'>) => {
    const newLog = { ...logData, id: Math.random().toString(36).substr(2, 9) };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const handleConnectGoogle = () => {
    addLog({
      timestamp: new Date(),
      agent: AgentType.ROUTER,
      action: 'OAuth Request',
      details: 'Redirecting to Google Accounts (Simulated)...',
      status: 'pending'
    });
    
    // Simulate OAuth Callback Latency
    setTimeout(() => {
        setUserState(prev => ({ ...prev, googleConnected: true }));
        addLog({
            timestamp: new Date(),
            agent: AgentType.ROUTER,
            action: 'Token Exchange',
            details: 'Received Access/Refresh Tokens. Stored in Supabase `oauth_tokens` table.',
            status: 'success'
        });
        
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Excellent. I've secured a connection to your Google Workspace. I can now manage your Calendar, Gmail, and Tasks directly.",
            timestamp: new Date()
        }]);
    }, 2000);
  };

  const handleSendMessage = async (text: string) => {
    // In simulator mode, we require a key
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
        // Fallback or alert
        // console.warn("Missing GEMINI_API_KEY for simulator");
    }

    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
        const historyForGemini = messages.slice(-10).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const response = await geminiService.processMessage(text, historyForGemini, addLog);

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

  if (!hasMounted) return null; // Hydration fix

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-black overflow-hidden font-sans">
      <Sidebar 
        userState={userState} 
        logs={logs} 
        onConnect={handleConnectGoogle} 
      />

      <div className="flex-1 h-full relative">
        <ChatInterface 
            messages={messages} 
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
        />
      </div>
    </div>
  );
}