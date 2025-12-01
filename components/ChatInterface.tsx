"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Message, AgentType } from '../types';
import { Send, Paperclip, MoreVertical, Phone, Video, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isTyping }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative">
       {/* WhatsApp Header */}
       <div className="bg-[#075E54] text-white p-3 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                <img src="https://picsum.photos/200/200" alt="Man Friday" className="w-full h-full object-cover" />
            </div>
            <div>
                <h3 className="font-semibold text-sm">Man Friday</h3>
                <p className="text-xs text-green-100 opacity-80">
                    {isTyping ? 'typing...' : 'online'}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-4 opacity-90">
            <Video size={20} />
            <Phone size={20} />
            <Search size={20} />
            <MoreVertical size={20} />
          </div>
       </div>

       {/* Chat Area */}
       <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 relative"
        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}
       >
          {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                  <div className={`
                    max-w-[80%] rounded-lg p-2 px-3 shadow-sm text-sm relative
                    ${msg.role === 'user' ? 'bg-[#DCF8C6] rounded-tr-none' : 'bg-white rounded-tl-none'}
                  `}>
                      {/* Agent Badge for Assistant */}
                      {msg.role === 'assistant' && msg.agentUsed && msg.agentUsed !== AgentType.ROUTER && (
                          <div className="text-[10px] uppercase font-bold text-orange-500 mb-1 flex items-center gap-1">
                             {msg.agentUsed} Agent
                          </div>
                      )}
                      
                      <div className="text-slate-800 leading-relaxed markdown-content">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 text-right mt-1 ml-4 min-w-[50px]">
                          {formatTime(msg.timestamp)}
                      </div>
                  </div>
              </div>
          ))}

            {isTyping && (
                <div className="flex w-full justify-start">
                    <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                </div>
            )}
       </div>

       {/* Input Area */}
       <div className="bg-[#f0f2f5] p-3 px-4 flex items-center gap-3">
          <button className="text-slate-500 hover:text-slate-700 transition-colors">
            <Paperclip size={24} />
          </button>
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message" 
                className="flex-1 py-2 px-4 rounded-full border-none focus:outline-none focus:ring-0 bg-white shadow-sm"
            />
            {input.trim() && (
                <button 
                    type="submit" 
                    className="w-10 h-10 bg-[#008a7c] text-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#006e63] transition-colors"
                >
                    <Send size={18} className="ml-0.5" />
                </button>
            )}
          </form>
       </div>
    </div>
  );
};

export default ChatInterface;