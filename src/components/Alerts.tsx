import React, { useEffect, useState } from 'react';
import { Alert, getAlerts, addAlert } from '../db';
import { ShieldAlert, Clock, Plus, X, Info, AlertTriangle, Flame, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { socketService } from '../services/socketService';

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAlert, setNewAlert] = useState({ message: '', location: '', level: 'warning' as 'critical' | 'warning' | 'info' });

  useEffect(() => {
    // Listen for initial alerts
    const unsubInitial = socketService.onInitialAlerts((initialAlerts) => {
      setAlerts(initialAlerts);
    });

    // Listen for new alerts
    const unsubNew = socketService.onNewAlert((alert) => {
      setAlerts(prev => {
        if (prev.find(a => a.id === alert.id)) return prev;
        return [alert, ...prev];
      });
    });

    return () => {
      unsubInitial();
      unsubNew();
    };
  }, []);

  const handleAdd = async () => {
    if (!newAlert.message || !newAlert.location) return;
    const alert: Alert = {
      id: Date.now().toString(),
      ...newAlert,
      timestamp: Date.now()
    };
    
    // Emit to server
    socketService.createAlert(alert);
    
    setNewAlert({ message: '', location: '', level: 'warning' });
    setShowAdd(false);
  };

  return (
    <div className="pb-24 pt-6 px-5 max-w-md mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">تنبيهات المجتمع</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Community Alerts</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${showAdd ? 'bg-gray-100 text-gray-500 shadow-none' : 'bg-red-600 text-white shadow-red-100'}`}
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
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border border-red-50">
              <h3 className="font-bold text-gray-900 mb-4 text-center">إرسال تنبيه جديد</h3>
              <div className="flex gap-2 mb-6 bg-gray-50 p-1 rounded-2xl">
                <LevelButton 
                  active={newAlert.level === 'info'} 
                  onClick={() => setNewAlert({...newAlert, level: 'info'})} 
                  label="معلومة" 
                  color="blue"
                />
                <LevelButton 
                  active={newAlert.level === 'warning'} 
                  onClick={() => setNewAlert({...newAlert, level: 'warning'})} 
                  label="تحذير" 
                  color="amber"
                />
                <LevelButton 
                  active={newAlert.level === 'critical'} 
                  onClick={() => setNewAlert({...newAlert, level: 'critical'})} 
                  label="عاجل" 
                  color="red"
                />
              </div>
              <textarea 
                placeholder="ما هو الخطر أو التنبيه؟..." 
                className="w-full bg-gray-50 rounded-2xl p-4 mb-3 outline-none border border-transparent focus:border-red-100 transition-all resize-none text-gray-800"
                rows={3}
                value={newAlert.message}
                onChange={e => setNewAlert({...newAlert, message: e.target.value})}
              />
              <div className="relative mb-6">
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-red-500">
                  <MapPin size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="الموقع (مثال: الشارع الرئيسي)" 
                  className="w-full bg-gray-50 rounded-2xl p-4 pr-12 outline-none border border-transparent focus:border-red-100 transition-all text-gray-800"
                  value={newAlert.location}
                  onChange={e => setNewAlert({...newAlert, location: e.target.value})}
                />
              </div>
              <button 
                onClick={handleAdd}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                بث التنبيه للجميع
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <AnimatePresence initial={false}>
          {alerts.map((alert, index) => (
            <motion.div 
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-[2rem] p-6 border shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden group ${
                alert.level === 'critical' ? 'bg-red-50 border-red-100 text-red-900' :
                alert.level === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-900' :
                'bg-white border-gray-100 text-gray-900'
              }`}
            >
              {alert.level === 'critical' && (
                <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  alert.level === 'critical' ? 'bg-red-100 text-red-600' :
                  alert.level === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-indigo-50 text-indigo-600'
                }`}>
                  {alert.level === 'critical' ? <Flame size={24} /> : 
                   alert.level === 'warning' ? <AlertTriangle size={24} /> : 
                   <Info size={24} />}
                </div>
                <div className="flex items-center text-[10px] font-bold uppercase tracking-wider gap-1.5 opacity-60">
                  <Clock size={12} strokeWidth={2.5} />
                  {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ar })}
                </div>
              </div>
              
              <p className="font-black text-lg mb-2 leading-tight">{alert.message}</p>
              
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-50/50">
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <MapPin size={14} strokeWidth={2.5} />
                  <span>الموقع: {alert.location}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                    alert.level === 'critical' ? 'bg-red-200/50' :
                    alert.level === 'warning' ? 'bg-amber-200/50' :
                    'bg-indigo-100/50'
                  }`}>
                    {alert.level === 'critical' ? 'عاجل جداً' : 
                     alert.level === 'warning' ? 'تحذير' : 
                     'معلومة عامة'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {alerts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-bold">لا توجد تنبيهات نشطة</p>
            <p className="text-xs text-gray-300 mt-1">الوضع هادئ في منطقتك حالياً.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LevelButton({ active, onClick, label, color }: { active: boolean, onClick: () => void, label: string, color: 'blue' | 'amber' | 'red' }) {
  const colors = {
    blue: active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-blue-600 hover:bg-blue-50',
    amber: active ? 'bg-amber-600 text-white shadow-lg shadow-amber-100' : 'text-amber-600 hover:bg-amber-50',
    red: active ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-red-600 hover:bg-red-50',
  };
  
  return (
    <button 
      onClick={onClick} 
      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${colors[color]}`}
    >
      {label}
    </button>
  );
}
