import React, { useState, useEffect } from 'react';
import { Home, ShoppingBag, ShieldAlert, Wifi, Bell, User, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Feed from './components/Feed';
import Market from './components/Market';
import Alerts from './components/Alerts';
import Network from './components/Network';
import { seedDB } from './db';
import { socketService } from './services/socketService';

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'market' | 'alerts' | 'network'>('feed');
  const [isReady, setIsReady] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [showProfileModal, setShowProfileModal] = useState(!localStorage.getItem('userName'));
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const init = async () => {
      await seedDB();
      setIsReady(true);
      if (userName) {
        socketService.connect(userName);
        setIsConnected(true);
      }
    };
    init();
  }, [userName]);

  const handleSaveProfile = (name: string) => {
    localStorage.setItem('userName', name);
    setUserName(name);
    setShowProfileModal(false);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-indigo-600 font-bold">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center mb-4"
        >
          <Wifi size={32} />
        </motion.div>
        <p className="animate-pulse">جاري تهيئة الشبكة المحلية...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FD] font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Wifi className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900 leading-none">شبكة الجوار</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{isConnected ? 'متصل بالشبكة' : 'غير متصل'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <User size={20} />
            </button>
            <button className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with Transitions */}
      <main className="max-w-md mx-auto min-h-[calc(100vh-140px)] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full"
          >
            {activeTab === 'feed' && <Feed />}
            {activeTab === 'market' && <Market />}
            {activeTab === 'alerts' && <Alerts />}
            {activeTab === 'network' && <Network />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <User size={40} />
                </div>
                <h2 className="text-2xl font-black text-gray-900">ملفك الشخصي</h2>
                <p className="text-sm text-gray-400 mt-2">كيف تريد أن يراك جيرانك في الشبكة؟</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2 mr-1">اسم المستخدم</label>
                  <input 
                    type="text" 
                    defaultValue={userName}
                    placeholder="مثال: أبو أحمد، م. علي..."
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl p-4 outline-none transition-all text-lg font-bold text-gray-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveProfile((e.target as HTMLInputElement).value);
                      }
                    }}
                    autoFocus
                  />
                </div>

                <button 
                  onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling?.lastElementChild as HTMLInputElement);
                    handleSaveProfile(input.value);
                  }}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  حفظ الملف
                </button>
                
                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                  بياناتك مخزنة محلياً فقط ولا يتم مشاركتها خارج الشبكة
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-gray-100 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto flex justify-around items-center px-4 py-3">
          <NavButton 
            active={activeTab === 'feed'} 
            onClick={() => setActiveTab('feed')} 
            icon={<Home size={22} />} 
            label="الرئيسية" 
          />
          <NavButton 
            active={activeTab === 'market'} 
            onClick={() => setActiveTab('market')} 
            icon={<ShoppingBag size={22} />} 
            label="السوق" 
          />
          <NavButton 
            active={activeTab === 'alerts'} 
            onClick={() => setActiveTab('alerts')} 
            icon={<ShieldAlert size={22} />} 
            label="طوارئ"
            badge
          />
          <NavButton 
            active={activeTab === 'network'} 
            onClick={() => setActiveTab('network')} 
            icon={<Wifi size={22} />} 
            label="الشبكة" 
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-4 py-1 rounded-2xl transition-all duration-300 relative group ${active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {badge && (
        <span className="absolute top-1 right-4 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
      )}
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold transition-all duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -bottom-3 w-1 h-1 bg-indigo-600 rounded-full"
        />
      )}
    </button>
  );
}
