import { io, Socket } from "socket.io-client";
import { Post, MarketItem, Alert } from "../db";

export interface Message {
  id: string;
  senderId?: string;
  receiverId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isRead?: boolean;
}

export interface Peer {
  id: string;
  name: string;
  distance: string;
  signal: 'strong' | 'medium' | 'weak';
  lastSeen: number;
}

class SocketService {
  private socket: Socket | null = null;
  private peerListeners: ((peers: Peer[]) => void)[] = [];
  private postListeners: ((post: Post) => void)[] = [];
  private initialPostsListeners: ((posts: Post[]) => void)[] = [];
  private updateListeners: ((update: { id: string, aiSummary?: string, aiTranslated?: string }) => void)[] = [];
  private aiLoadingListeners: ((data: { id: string, type: 'sum' | 'trans' }) => void)[] = [];
  
  private marketListeners: ((item: MarketItem) => void)[] = [];
  private initialMarketListeners: ((items: MarketItem[]) => void)[] = [];
  
  private alertListeners: ((alert: Alert) => void)[] = [];
  private initialAlertsListeners: ((alerts: Alert[]) => void)[] = [];

  private messageListeners: ((msg: Message) => void)[] = [];
  private typingListeners: ((data: { senderId: string, isTyping: boolean }) => void)[] = [];
  private historyListeners: ((data: { otherId: string, messages: Message[] }) => void)[] = [];
  private marketStatusListeners: ((data: { id: string, status: string }) => void)[] = [];

  private peers: Peer[] = [];
  private initialPosts: Post[] = [];
  private initialMarket: MarketItem[] = [];
  private initialAlerts: Alert[] = [];

  connect(userName: string) {
    if (this.socket) return;

    this.socket = io();

    this.socket.on("connect", () => {
      console.log("Connected to community relay");
      this.socket?.emit("peer:join", { name: userName });
    });

    this.socket.on("peer:list", (peerList: Peer[]) => {
      this.peers = peerList;
      this.notifyPeerListeners();
    });

    this.socket.on("peer:discovered", (peer: Peer) => {
      if (!this.peers.find(p => p.id === peer.id)) {
        this.peers = [...this.peers, peer];
        this.notifyPeerListeners();
      }
    });

    this.socket.on("peer:lost", (peerId: string) => {
      this.peers = this.peers.filter(p => p.id !== peerId);
      this.notifyPeerListeners();
    });

    // Posts
    this.socket.on("feed:initial", (posts: Post[]) => {
      this.initialPosts = posts;
      this.initialPostsListeners.forEach(l => l(posts));
    });

    this.socket.on("post:new", (post: Post) => {
      this.postListeners.forEach(l => l(post));
    });

    this.socket.on("post:updated", (update: { id: string, aiSummary?: string, aiTranslated?: string }) => {
      this.updateListeners.forEach(l => l(update));
    });

    this.socket.on("post:ai_loading", (data: { id: string, type: 'sum' | 'trans' }) => {
      this.aiLoadingListeners.forEach(l => l(data));
    });

    // Market
    this.socket.on("market:initial", (items: MarketItem[]) => {
      this.initialMarket = items;
      this.initialMarketListeners.forEach(l => l(items));
    });

    this.socket.on("market:new", (item: MarketItem) => {
      this.marketListeners.forEach(l => l(item));
    });

    // Alerts
    this.socket.on("alerts:initial", (alerts: Alert[]) => {
      this.initialAlerts = alerts;
      this.initialAlertsListeners.forEach(l => l(alerts));
    });

    this.socket.on("alert:new", (alert: Alert) => {
      this.alertListeners.forEach(l => l(alert));
    });

    this.socket.on("message:new", (msg: Message) => {
      this.messageListeners.forEach(l => l(msg));
    });

    this.socket.on("message:sent", (msg: Message) => {
      this.messageListeners.forEach(l => l(msg));
    });

    this.socket.on("message:typing", (data: { senderId: string, isTyping: boolean }) => {
      this.typingListeners.forEach(l => l(data));
    });

    this.socket.on("message:history_result", (data: { otherId: string, messages: Message[] }) => {
      this.historyListeners.forEach(l => l(data));
    });

    this.socket.on("market:status_updated", (data: { id: string, status: string }) => {
      this.marketStatusListeners.forEach(l => l(data));
    });
  }

  createPost(post: Post) {
    this.socket?.emit("post:create", post);
  }

  updatePostAI(id: string, aiSummary?: string, aiTranslated?: string) {
    this.socket?.emit("post:update_ai", { id, aiSummary, aiTranslated });
  }

  setAILoading(id: string, type: 'sum' | 'trans') {
    this.socket?.emit("post:ai_loading", { id, type });
  }

  createMarketItem(item: MarketItem) {
    this.socket?.emit("market:create", item);
  }

  createAlert(alert: Alert) {
    this.socket?.emit("alert:create", alert);
  }

  getSocketId() {
    return this.socket?.id;
  }

  updateMarketStatus(id: string, status: string) {
    this.socket?.emit("market:update_status", { id, status });
  }

  sendMessage(msg: Message) {
    this.socket?.emit("message:send", msg);
  }

  sendTyping(receiverId: string, isTyping: boolean) {
    this.socket?.emit("message:typing", { receiverId, isTyping });
  }

  requestHistory(otherId: string) {
    this.socket?.emit("message:history", { otherId });
  }

  onPeersUpdate(callback: (peers: Peer[]) => void) {
    this.peerListeners.push(callback);
    callback(this.peers);
    return () => {
      this.peerListeners = this.peerListeners.filter(l => l !== callback);
    };
  }

  onInitialPosts(callback: (posts: Post[]) => void) {
    this.initialPostsListeners.push(callback);
    if (this.initialPosts.length > 0) callback(this.initialPosts);
    return () => {
      this.initialPostsListeners = this.initialPostsListeners.filter(l => l !== callback);
    };
  }

  onNewPost(callback: (post: Post) => void) {
    this.postListeners.push(callback);
    return () => {
      this.postListeners = this.postListeners.filter(l => l !== callback);
    };
  }

  onPostUpdate(callback: (update: { id: string, aiSummary?: string, aiTranslated?: string }) => void) {
    this.updateListeners.push(callback);
    return () => {
      this.updateListeners = this.updateListeners.filter(l => l !== callback);
    };
  }

  onAILoading(callback: (data: { id: string, type: 'sum' | 'trans' }) => void) {
    this.aiLoadingListeners.push(callback);
    return () => {
      this.aiLoadingListeners = this.aiLoadingListeners.filter(l => l !== callback);
    };
  }

  onInitialMarket(callback: (items: MarketItem[]) => void) {
    this.initialMarketListeners.push(callback);
    if (this.initialMarket.length > 0) callback(this.initialMarket);
    return () => {
      this.initialMarketListeners = this.initialMarketListeners.filter(l => l !== callback);
    };
  }

  onNewMarketItem(callback: (item: MarketItem) => void) {
    this.marketListeners.push(callback);
    return () => {
      this.marketListeners = this.marketListeners.filter(l => l !== callback);
    };
  }

  onInitialAlerts(callback: (alerts: Alert[]) => void) {
    this.initialAlertsListeners.push(callback);
    if (this.initialAlerts.length > 0) callback(this.initialAlerts);
    return () => {
      this.initialAlertsListeners = this.initialAlertsListeners.filter(l => l !== callback);
    };
  }

  onNewAlert(callback: (alert: Alert) => void) {
    this.alertListeners.push(callback);
    return () => {
      this.alertListeners = this.alertListeners.filter(l => l !== callback);
    };
  }

  onNewMessage(callback: (msg: Message) => void) {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== callback);
    };
  }

  onTyping(callback: (data: { senderId: string, isTyping: boolean }) => void) {
    this.typingListeners.push(callback);
    return () => {
      this.typingListeners = this.typingListeners.filter(l => l !== callback);
    };
  }

  onHistory(callback: (data: { otherId: string, messages: Message[] }) => void) {
    this.historyListeners.push(callback);
    return () => {
      this.historyListeners = this.historyListeners.filter(l => l !== callback);
    };
  }

  onMarketStatusUpdate(callback: (data: { id: string, status: string }) => void) {
    this.marketStatusListeners.push(callback);
    return () => {
      this.marketStatusListeners = this.marketStatusListeners.filter(l => l !== callback);
    };
  }

  private notifyPeerListeners() {
    this.peerListeners.forEach(l => l(this.peers));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
