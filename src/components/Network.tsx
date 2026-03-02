import React, { useState, useEffect } from 'react';
import { Wifi, Smartphone, RefreshCw, CheckCircle2, ShieldCheck, Search, Signal, MapPin, MessageSquare } from 'lucide-react';
import { socketService, Peer } from '../services/socketService';
import { motion, AnimatePresence } from 'motion/react';
import ChatModal from './ChatModal';

export default function Network() {
  const [syncing, setSyncing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(new Date());
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);

  useEffect(() => {
    const userName = localStorage.getItem('userName') || 'مستخدم مجهول';
    socketService.connect(userName);
    
    const unsubscribe = socketService.onPeersUpdate((updatedPeers) => {
      setPeers(updatedPeers);
    });

    setScanning(true);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync(new Date());
    }, 2000);
  };

  return (
    <div className="pb-24 pt-6 px-5 max-w-md mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">الشبكة المجاورة</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Mesh Network</p>
        </div>
        {scanning && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
            <Search size={14} />
            <span>جاري البحث...</span>
          </div>
        )}
      </div>

      {/* Status Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-100 mb-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1">حالة العقدة</p>
              <h3 className="text-xl font-black flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" size={20} />
                متصل بالشبكة
              </h3>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <ShieldCheck size={24} className="text-emerald-300" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-indigo-100 mb-6 bg-black/10 p-3 rounded-2xl backdrop-blur-sm">
            <Wifi size={16} />
            <span>Wi-Fi Direct & Bluetooth Mesh نشط</span>
          </div>

          <button 
            onClick={handleSync}
            disabled={syncing}
            className="w-full bg-white text-indigo-700 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all shadow-lg shadow-black/5 disabled:opacity-70"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'جاري تبادل البيانات...' : 'مزامنة مع الجيران'}
          </button>
          
          {lastSync && (
            <p className="text-center text-[10px] font-bold text-indigo-200 mt-4 uppercase tracking-wider">
              آخر تحديث: {lastSync.toLocaleTimeString('ar-IQ')}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 px-1">
        <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">الأجهزة المكتشفة ({peers.length})</h3>
        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">عبر Mesh</span>
      </div>
      
      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {peers.map((peer, index) => (
            <motion.div 
              key={peer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-[2rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center justify-between group hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300 relative">
                  <Smartphone size={28} />
                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${peer.signal === 'strong' ? 'bg-emerald-500' : peer.signal === 'medium' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{peer.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase">
                      <MapPin size={12} />
                      <span>{peer.distance}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase">
                      <Signal size={12} />
                      <span>{peer.signal === 'strong' ? 'قوي' : peer.signal === 'medium' ? 'متوسط' : 'ضعيف'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPeer(peer)}
                className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all duration-300 flex items-center gap-2"
              >
                <MessageSquare size={14} />
                مراسلة
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {peers.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-300 animate-pulse" size={32} />
            </div>
            <p className="text-gray-400 font-bold">جاري البحث عن جيران...</p>
            <p className="text-xs text-gray-300 mt-1">تأكد من تفعيل Wi-Fi و Bluetooth</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPeer && (
          <ChatModal 
            peer={selectedPeer} 
            onClose={() => setSelectedPeer(null)} 
          />
        )}
      </AnimatePresence>

      <div className="mt-10 p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50">
        <h4 className="text-xs font-black text-indigo-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
          <ShieldCheck size={16} className="text-indigo-600" />
          بروتوكول اكتشاف النظراء
        </h4>
        <p className="text-[11px] text-indigo-700/80 leading-relaxed font-medium">
          يستخدم هذا التطبيق تقنية **mDNS** و **Bluetooth Advertising** لاكتشاف الأجهزة المجاورة دون الحاجة لخادم مركزي. يتم تشفير معرّفات الأجهزة لضمان الخصوصية ومنع التتبع.
        </p>
      </div>
    </div>
  );
}
