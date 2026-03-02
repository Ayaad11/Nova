import React, { useEffect, useState } from 'react';
import { MarketItem, getMarketItems, addMarketItem } from '../db';
import { ShoppingBag, Tag, User, Plus, X, Package, ArrowLeftRight, MessageSquare, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { socketService, Peer } from '../services/socketService';
import ChatModal from './ChatModal';

export default function Market() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', price: '' });

  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);

  useEffect(() => {
    // Listen for initial items
    const unsubInitial = socketService.onInitialMarket((initialItems) => {
      setItems(initialItems);
    });

    // Listen for new items
    const unsubNew = socketService.onNewMarketItem((item) => {
      setItems(prev => {
        if (prev.find(i => i.id === item.id)) return prev;
        return [item, ...prev];
      });
    });

    // Listen for status updates
    const unsubStatus = socketService.onMarketStatusUpdate(({ id, status }) => {
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: status as any } : i));
    });

    return () => {
      unsubInitial();
      unsubNew();
      unsubStatus();
    };
  }, []);

  const handleAdd = async () => {
    if (!newItem.title || !newItem.price) return;
    const userName = localStorage.getItem('userName') || 'مستخدم مجهول';
    const item: MarketItem = {
      id: Date.now().toString(),
      ...newItem,
      seller: userName,
      sellerId: socketService.getSocketId(),
      timestamp: Date.now(),
      status: 'available'
    };
    
    // Emit to server
    socketService.createMarketItem(item);
    
    setNewItem({ title: '', description: '', price: '' });
    setShowAdd(false);
  };

  const updateStatus = (id: string, status: 'available' | 'reserved' | 'sold') => {
    socketService.updateMarketStatus(id, status);
  };

  const startChat = (item: MarketItem) => {
    if (item.sellerId === socketService.getSocketId()) return;
    if (!item.sellerId) return;
    
    setSelectedPeer({
      id: item.sellerId,
      name: item.seller,
      distance: 'عبر السوق',
      signal: 'strong',
      lastSeen: Date.now()
    });
  };

  return (
    <div className="pb-24 pt-6 px-5 max-w-md mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">السوق المحلي</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Local Marketplace</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${showAdd ? 'bg-gray-100 text-gray-500 shadow-none' : 'bg-indigo-600 text-white shadow-indigo-100'}`}
        >
          {showAdd ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border border-indigo-50">
              <h3 className="font-bold text-gray-900 mb-4">إضافة عرض جديد</h3>
              <input 
                type="text" 
                placeholder="ماذا تعرض؟ (مثال: بطارية، خضار...)" 
                className="w-full bg-gray-50 rounded-2xl p-4 mb-3 outline-none border border-transparent focus:border-indigo-100 transition-all text-gray-800"
                value={newItem.title}
                onChange={e => setNewItem({...newItem, title: e.target.value})}
              />
              <textarea 
                placeholder="وصف تفصيلي لحالة الغرض..." 
                className="w-full bg-gray-50 rounded-2xl p-4 mb-3 outline-none border border-transparent focus:border-indigo-100 transition-all resize-none text-gray-800"
                rows={3}
                value={newItem.description}
                onChange={e => setNewItem({...newItem, description: e.target.value})}
              />
              <div className="relative mb-6">
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-indigo-500">
                  <ArrowLeftRight size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="السعر أو المقايضة..." 
                  className="w-full bg-gray-50 rounded-2xl p-4 pr-12 outline-none border border-transparent focus:border-indigo-100 transition-all text-gray-800"
                  value={newItem.price}
                  onChange={e => setNewItem({...newItem, price: e.target.value})}
                />
              </div>
              <button 
                onClick={handleAdd}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                نشر العرض في الشبكة
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence initial={false}>
          {items.map((item, index) => {
            const isOwner = item.sellerId === socketService.getSocketId();
            return (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 group relative overflow-hidden ${item.status === 'sold' ? 'opacity-60' : ''}`}
              >
                {item.status === 'sold' && (
                  <div className="absolute top-0 right-0 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl z-10">
                    تم البيع
                  </div>
                )}
                {item.status === 'reserved' && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl z-10">
                    محجوز
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                    <Package size={24} />
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 font-black bg-emerald-50 px-4 py-2 rounded-xl text-sm">
                    <Tag size={16} strokeWidth={2.5} />
                    <span>{item.price}</span>
                  </div>
                </div>
                
                <h3 className="font-bold text-xl text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">{item.description}</p>
                
                <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <User size={14} strokeWidth={2.5} />
                    <span>{item.seller} {isOwner && '(أنت)'}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    {isOwner ? (
                      <div className="flex gap-1">
                        {item.status !== 'available' && (
                          <button 
                            onClick={() => updateStatus(item.id, 'available')}
                            className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            title="متاح"
                          >
                            <Clock size={16} />
                          </button>
                        )}
                        {item.status !== 'reserved' && (
                          <button 
                            onClick={() => updateStatus(item.id, 'reserved')}
                            className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title="حجز"
                          >
                            <Clock size={16} />
                          </button>
                        )}
                        {item.status !== 'sold' && (
                          <button 
                            onClick={() => updateStatus(item.id, 'sold')}
                            className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="بيع"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => startChat(item)}
                        className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        <MessageSquare size={14} />
                        تواصل
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {items.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-bold">السوق فارغ حالياً</p>
            <p className="text-xs text-gray-300 mt-1">كن أول من يعرض شيئاً للتبادل!</p>
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
    </div>
  );
}
