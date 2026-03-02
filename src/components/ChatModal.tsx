import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, User, Clock, Smartphone } from 'lucide-react';
import { socketService, Message, Peer } from '../services/socketService';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ChatModalProps {
  peer: Peer;
  onClose: () => void;
}

export default function ChatModal({ peer, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Request history
    socketService.requestHistory(peer.id);

    const unsubHistory = socketService.onHistory((data) => {
      if (data.otherId === peer.id) {
        setMessages(data.messages);
      }
    });

    const unsubMessage = socketService.onNewMessage((msg) => {
      if (msg.senderId === peer.id || msg.receiverId === peer.id) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    const unsubTyping = socketService.onTyping((data) => {
      if (data.senderId === peer.id) {
        setOtherIsTyping(data.isTyping);
      }
    });

    return () => {
      unsubHistory();
      unsubMessage();
      unsubTyping();
    };
  }, [peer.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherIsTyping]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    const msg: Message = {
      id: Date.now().toString(),
      receiverId: peer.id,
      senderName: localStorage.getItem('userName') || 'مستخدم مجهول',
      content: newMessage,
      timestamp: Date.now()
    };

    socketService.sendMessage(msg);
    setNewMessage('');
    handleTyping(false);
  };

  const handleTyping = (typing: boolean) => {
    if (isTyping !== typing) {
      setIsTyping(typing);
      socketService.sendTyping(peer.id, typing);
    }

    if (typing) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white w-full max-w-md h-[80vh] sm:h-[600px] sm:rounded-[2.5rem] flex flex-col relative z-10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 relative">
              <Smartphone size={24} />
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${peer.signal === 'strong' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{peer.name}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">متصل عبر Mesh</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8F9FD]/50">
          {messages.map((msg) => {
            const isMe = msg.senderName === localStorage.getItem('userName');
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className={`text-[9px] mt-2 font-bold uppercase tracking-tighter opacity-60 flex items-center gap-1 ${isMe ? 'justify-start' : 'justify-end'}`}>
                    <Clock size={10} />
                    {formatDistanceToNow(msg.timestamp, { addSuffix: true, locale: ar })}
                  </div>
                </div>
              </div>
            );
          })}
          
          {otherIsTyping && (
            <div className="flex justify-end">
              <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">جاري الكتابة...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-gray-100">
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 bg-gray-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl px-5 py-3 outline-none transition-all text-sm font-medium"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping(true);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
