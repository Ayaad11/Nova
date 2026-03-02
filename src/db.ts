import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Post {
  id: string;
  type: 'skill' | 'resource' | 'general';
  content: string;
  author: string;
  timestamp: number;
  aiSummary?: string;
  aiTranslated?: string;
  language: string;
}

export interface Alert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
  location: string;
  timestamp: number;
}

export interface MarketItem {
  id: string;
  title: string;
  description: string;
  price: string;
  seller: string;
  sellerId?: string;
  timestamp: number;
  status?: 'available' | 'reserved' | 'sold';
}

interface MeshDB extends DBSchema {
  posts: {
    key: string;
    value: Post;
    indexes: { 'by-timestamp': number };
  };
  alerts: {
    key: string;
    value: Alert;
    indexes: { 'by-timestamp': number };
  };
  market: {
    key: string;
    value: MarketItem;
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<MeshDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MeshDB>('mesh-network-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('posts')) {
          const store = db.createObjectStore('posts', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('alerts')) {
          const store = db.createObjectStore('alerts', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('market')) {
          const store = db.createObjectStore('market', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function addPost(post: Post) {
  const db = await getDB();
  await db.put('posts', post);
}

export async function getPosts(): Promise<Post[]> {
  const db = await getDB();
  const tx = db.transaction('posts', 'readonly');
  const index = tx.store.index('by-timestamp');
  const posts = await index.getAll();
  return posts.reverse();
}

export async function addAlert(alert: Alert) {
  const db = await getDB();
  await db.put('alerts', alert);
}

export async function getAlerts(): Promise<Alert[]> {
  const db = await getDB();
  const tx = db.transaction('alerts', 'readonly');
  const index = tx.store.index('by-timestamp');
  const alerts = await index.getAll();
  return alerts.reverse();
}

export async function addMarketItem(item: MarketItem) {
  const db = await getDB();
  await db.put('market', item);
}

export async function getMarketItems(): Promise<MarketItem[]> {
  const db = await getDB();
  const tx = db.transaction('market', 'readonly');
  const index = tx.store.index('by-timestamp');
  const items = await index.getAll();
  return items.reverse();
}

// Seed initial data for demonstration
export async function seedDB() {
  const posts = await getPosts();
  if (posts.length === 0) {
    await addPost({
      id: '1',
      type: 'skill',
      content: 'أنا نجار محترف، يمكنني المساعدة في إصلاح الأبواب والنوافذ في الحي مقابل بعض الخضروات الطازجة.',
      author: 'أبو أحمد',
      timestamp: Date.now() - 100000,
      language: 'ar',
    });
    await addPost({
      id: '2',
      type: 'resource',
      content: 'لدي مولد كهربائي إضافي يعمل بالديزل، يمكنني تشغيله لمدة 4 ساعات يومياً لمن يحتاج شحن أجهزته.',
      author: 'علي',
      timestamp: Date.now() - 50000,
      language: 'ar',
    });
    
    await addAlert({
      id: '1',
      level: 'critical',
      message: 'انقطاع متوقع في المياه غداً من الساعة 8 صباحاً حتى 4 عصراً. يرجى تخزين المياه.',
      location: 'الحي الشرقي',
      timestamp: Date.now() - 20000,
    });

    await addMarketItem({
      id: '1',
      title: 'بطارية سيارة 12 فولت مستعملة',
      description: 'بحالة جيدة، تكفي لتشغيل إنارة ليلية.',
      price: 'مبادلة بـ 5 لتر بنزين',
      seller: 'كريم',
      timestamp: Date.now() - 80000,
    });
  }
}
