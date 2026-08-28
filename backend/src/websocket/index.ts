import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';

interface Client {
  ws: WebSocket;
  userId?: string;
  role?: string;
  rooms: Set<string>;
}

const clients = new Map<string, Client>();
let wss: WebSocketServer;

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const clientId = Math.random().toString(36).slice(2);
    const client: Client = { ws, rooms: new Set() };
    clients.set(clientId, client);

    logger.info('WS client connected', { clientId, total: clients.size });

    // Authenticate via token in query string
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) {
        const payload = jwt.verify(token, config.jwt.secret) as any;
        client.userId = payload.userId;
        client.role   = payload.role;
        client.rooms.add('all');
        client.rooms.add(payload.role);
        sendToClient(ws, { type: 'CONNECTED', payload: { clientId, role: payload.role } });
      } else {
        client.rooms.add('public');
        sendToClient(ws, { type: 'CONNECTED', payload: { clientId } });
      }
    } catch {
      client.rooms.add('public');
      sendToClient(ws, { type: 'CONNECTED', payload: { clientId } });
    }

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        handleClientMessage(clientId, client, msg);
      } catch {
        sendToClient(ws, { type: 'ERROR', payload: { message: 'Invalid JSON' } });
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      logger.info('WS client disconnected', { clientId, total: clients.size });
    });

    ws.on('error', (err) => {
      logger.warn('WS client error', { clientId, error: err.message });
      clients.delete(clientId);
    });

    // Heartbeat
    ws.on('pong', () => { (ws as any).isAlive = true; });
    (ws as any).isAlive = true;
  });

  // Ping interval
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) { ws.terminate(); return; }
      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(pingInterval));
}

function handleClientMessage(clientId: string, client: Client, msg: any): void {
  switch (msg.type) {
    case 'SUBSCRIBE_ROOM':
      if (msg.room) client.rooms.add(msg.room);
      break;
    case 'UNSUBSCRIBE_ROOM':
      if (msg.room) client.rooms.delete(msg.room);
      break;
    case 'PING':
      sendToClient(client.ws, { type: 'PONG', payload: { ts: Date.now() } });
      break;
    default:
      break;
  }
}

export function broadcastEvent(type: string, payload: any, room?: string): void {
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  clients.forEach((client) => {
    if (client.ws.readyState !== WebSocket.OPEN) return;
    if (room && !client.rooms.has(room) && !client.rooms.has('all')) return;
    client.ws.send(message);
  });
}

export function sendToUser(userId: string, type: string, payload: any): void {
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
    }
  });
}

function sendToClient(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function getConnectedClients(): number {
  return clients.size;
}
