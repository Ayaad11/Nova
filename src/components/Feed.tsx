import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Post, getPosts, addPost } from '../db';
import { summarizeText, translateText, suggestCategory } from '../ai';
import { MessageSquare, Wrench, Package, Sparkles, Languages, Clock, Send, Plus, X, Box, List } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import debounce from 'lodash/debounce';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import Feed3D from './Feed3D';
import { socketService } from '../services/socketService';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'general' | 'skill' | 'resource'>('general');
  const [loadingAI, setLoadingAI] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | '3d'>('list');

  useEffect(() => {
    // Connect to socket
    socketService.connect('مستخدم محلي');

    // Listen for initial posts from server
    const unsubInitial = socketService.onInitialPosts((initialPosts) => {
      setPosts(initialPosts);
    });

    // Listen for new posts
    const unsubNew = socketService.onNewPost((post) => {
      setPosts(prev => {
        if (prev.find(p => p.id === post.id)) return prev;
        return [post, ...prev];
      });
    });

    // Listen for AI updates
    const unsubUpdate = socketService.onPostUpdate((update) => {
      setPosts(prev => prev.map(p => p.id === update.id ? { ...p, ...update } : p));
      
      // Clear loading state when update is received
      setLoadingAI(prev => {
        const next = new Set(prev);
        next.delete(update.id + 'sum');
        next.delete(update.id + 'trans');
        return next;
      });
    });

    // Listen for AI loading state from others
    const unsubAILoading = socketService.onAILoading((data) => {
      setLoadingAI(prev => new Set(prev).add(data.id + data.type));
    });

    return () => {
      unsubInitial();
      unsubNew();
      unsubUpdate();
      unsubAILoading();
    };
  }, []);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    const userName = localStorage.getItem('userName') || 'مستخدم مجهول';
    const post: Post = {
      id: Date.now().toString(),
      type: postType,
      content: newPost,
      author: userName,
      timestamp: Date.now(),
      language: 'ar',
    };
    
    // Emit to server
    socketService.createPost(post);
    
    setNewPost('');
    setIsExpanded(false);
  };

  // Debounced AI functions
  const debouncedSuggestCategory = useMemo(
    () =>
      debounce(async (text: string) => {
        if (text.length < 10) return;
        const category = await suggestCategory(text);
        setPostType(category);
      }, 1000),
    []
  );

  const debouncedSummarize = useMemo(
    () =>
      debounce(async (postId: string, content: string) => {
        const key = postId + 'sum';
        setLoadingAI(prev => new Set(prev).add(key));
        socketService.setAILoading(postId, 'sum');
        
        const summary = await summarizeText(content);
        
        // Update locally and emit to server
        setPosts(prevPosts => prevPosts.map(p => p.id === postId ? { ...p, aiSummary: summary } : p));
        socketService.updatePostAI(postId, summary);
        
        setLoadingAI(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 500),
    []
  );

  const debouncedTranslate = useMemo(
    () =>
      debounce(async (postId: string, content: string) => {
        const key = postId + 'trans';
        setLoadingAI(prev => new Set(prev).add(key));
        socketService.setAILoading(postId, 'trans');
        
        const translated = await translateText(content, 'en');
        
        // Update locally and emit to server
        setPosts(prevPosts => prevPosts.map(p => p.id === postId ? { ...p, aiTranslated: translated } : p));
        socketService.updatePostAI(postId, undefined, translated);
        
        setLoadingAI(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSummarize.cancel();
      debouncedTranslate.cancel();
    };
  }, [debouncedSummarize, debouncedTranslate]);

  return (
    <div className="pb-24 pt-6 px-5 max-w-md mx-auto">
      {/* View Toggle */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">آخر الأخبار</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Community Feed</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
          >
            <List size={20} />
          </button>
          <button 
            onClick={() => setViewMode('3d')}
            className={`p-2 rounded-xl transition-all ${viewMode === '3d' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
          >
            <Box size={20} />
          </button>
        </div>
      </div>

      {/* Post Creation */}
      <div className={`bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 transition-all duration-500 overflow-hidden mb-8 ${isExpanded ? 'p-6' : 'p-2'}`}>
        {!isExpanded ? (
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center gap-3 p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors"
          >
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
              <Plus size={20} />
            </div>
            <span className="text-sm font-medium">ماذا يدور في ذهنك؟</span>
          </button>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">منشور جديد</h3>
              <button onClick={() => setIsExpanded(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <textarea
              autoFocus
              className="w-full bg-gray-50 rounded-2xl p-4 outline-none resize-none text-right text-gray-800 placeholder:text-gray-400 border border-transparent focus:border-indigo-100 transition-all"
              placeholder="شارك مهارة، مورد، أو رسالة للمجتمع..."
              rows={4}
              value={newPost}
              onChange={(e) => {
                setNewPost(e.target.value);
                debouncedSuggestCategory(e.target.value);
              }}
              dir="rtl"
            />
            <div className="flex justify-between items-center mt-5">
              <div className="flex gap-2 bg-gray-50 p-1 rounded-full">
                <TypeButton 
                  active={postType === 'general'} 
                  onClick={() => setPostType('general')} 
                  icon={<MessageSquare size={18} />} 
                  color="blue"
                />
                <TypeButton 
                  active={postType === 'skill'} 
                  onClick={() => setPostType('skill')} 
                  icon={<Wrench size={18} />} 
                  color="emerald"
                />
                <TypeButton 
                  active={postType === 'resource'} 
                  onClick={() => setPostType('resource')} 
                  icon={<Package size={18} />} 
                  color="purple"
                />
              </div>
              <button
                onClick={handlePost}
                disabled={!newPost.trim()}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                <span>نشر</span>
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Feed List or 3D View */}
      <AnimatePresence mode="wait">
        {viewMode === '3d' ? (
          <motion.div 
            key="3d-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8"
          >
            <Feed3D posts={posts} />
          </motion.div>
        ) : (
          <motion.div 
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {posts.map((post, index) => (
              <PostCard 
                key={post.id} 
                post={post} 
                index={index} 
                loadingAI={loadingAI}
                onSummarize={debouncedSummarize}
                onTranslate={debouncedTranslate}
              />
            ))}
            
            {posts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-400 font-bold">لا توجد منشورات بعد</p>
                <p className="text-xs text-gray-300 mt-1">كن أول من يشارك في الشبكة!</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PostCard({ post, index, loadingAI, onSummarize, onTranslate }: { 
  post: Post, 
  index: number, 
  loadingAI: Set<string>,
  onSummarize: (id: string, content: string) => void,
  onTranslate: (id: string, content: string) => void
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className="relative bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-shadow duration-500 group" 
      dir="rtl"
    >
      {/* Dynamic Lighting Shine Effect */}
      <motion.div
        style={{
          background: useTransform(
            [mouseXSpring, mouseYSpring],
            (values) => {
              const mx = values[0] as number;
              const my = values[1] as number;
              return `radial-gradient(circle at ${(mx + 0.5) * 100}% ${(my + 0.5) * 100}%, rgba(99, 102, 241, 0.1) 0%, transparent 80%)`;
            }
          ),
        }}
        className="absolute inset-0 pointer-events-none rounded-[2rem] z-0"
      />

      <div style={{ transform: "translateZ(20px)" }} className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black shadow-inner">
              {post.author.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{post.author}</h3>
              <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider gap-1.5 mt-0.5">
                <Clock size={12} strokeWidth={2.5} />
                {formatDistanceToNow(post.timestamp, { addSuffix: true, locale: ar })}
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${
            post.type === 'skill' ? 'bg-emerald-50 text-emerald-600' :
            post.type === 'resource' ? 'bg-purple-50 text-purple-600' :
            'bg-blue-50 text-blue-600'
          }`}>
            {post.type === 'skill' ? 'مهارة' : post.type === 'resource' ? 'مورد' : 'عام'}
          </span>
        </div>
        
        <p className="text-gray-700 leading-relaxed text-[15px] mb-5">{post.content}</p>

        {post.aiSummary && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-4 border rounded-2xl p-4 text-sm flex gap-3 items-start ${
              post.aiSummary.startsWith('فشل') 
              ? 'bg-red-50 border-red-100 text-red-900' 
              : 'bg-amber-50/50 border-amber-100 text-amber-900'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${post.aiSummary.startsWith('فشل') ? 'bg-red-100' : 'bg-amber-100'}`}>
              <Sparkles size={16} className={`${post.aiSummary.startsWith('فشل') ? 'text-red-500' : 'text-amber-600'} shrink-0`} />
            </div>
            <p className="leading-relaxed">
              <strong className="block text-[11px] uppercase tracking-wider mb-1 opacity-70">
                {post.aiSummary.startsWith('فشل') ? 'خطأ' : 'ملخص الذكاء الاصطناعي'}
              </strong> 
              {post.aiSummary}
            </p>
          </motion.div>
        )}

        {post.aiTranslated && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-4 border rounded-2xl p-4 text-sm flex gap-3 items-start ${
              post.aiTranslated.startsWith('فشل') 
              ? 'bg-red-50 border-red-100 text-red-900' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
            }`} dir={post.aiTranslated.startsWith('فشل') ? 'rtl' : 'ltr'}
          >
            <div className={`p-1.5 rounded-lg ${post.aiTranslated.startsWith('فشل') ? 'bg-red-100' : 'bg-slate-200'}`}>
              <Languages size={16} className={`${post.aiTranslated.startsWith('فشل') ? 'text-red-500' : 'text-slate-600'} shrink-0`} />
            </div>
            <p className="leading-relaxed">{post.aiTranslated}</p>
          </motion.div>
        )}

        <div className="flex gap-4 mt-2 pt-4 border-t border-gray-50">
          <AIActionButton 
            onClick={() => onSummarize(post.id, post.content)}
            loading={loadingAI.has(post.id + 'sum')}
            icon={<Sparkles size={16} />}
            label="تلخيص"
            loadingLabel="جاري التلخيص..."
            color="amber"
          />
          <AIActionButton 
            onClick={() => onTranslate(post.id, post.content)}
            loading={loadingAI.has(post.id + 'trans')}
            icon={<Languages size={16} />}
            label="ترجمة"
            loadingLabel="جاري الترجمة..."
            color="slate"
          />
        </div>
      </div>
    </motion.div>
  );
}

function TypeButton({ active, onClick, icon, color }: { active: boolean, onClick: () => void, icon: React.ReactNode, color: 'blue' | 'emerald' | 'purple' }) {
  const colors = {
    blue: active ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50',
    emerald: active ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50',
    purple: active ? 'bg-purple-600 text-white' : 'text-purple-600 hover:bg-purple-50',
  };
  
  return (
    <button onClick={onClick} className={`p-2.5 rounded-full transition-all duration-300 ${colors[color]}`}>
      {icon}
    </button>
  );
}

function AIActionButton({ onClick, loading, icon, label, loadingLabel, color }: { onClick: () => void, loading: boolean, icon: React.ReactNode, label: string, loadingLabel: string, color: 'amber' | 'slate' }) {
  const colors = {
    amber: 'text-amber-600 hover:bg-amber-50',
    slate: 'text-slate-600 hover:bg-slate-50',
  };

  return (
    <button 
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 ${colors[color]}`}
    >
      <div className={loading ? 'animate-spin' : ''}>{icon}</div>
      {loading ? loadingLabel : label}
    </button>
  );
}
