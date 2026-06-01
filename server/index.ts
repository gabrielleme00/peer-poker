import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import {
  RoomState,
  User,
  TaskStatus,
  TimerType,
  CardSystem,
  RoomSettings,
  ClientMessage,
  ServerMessage,
} from '../src/types.js';

// ─── In-memory store ──────────────────────────────────────────────────────────

interface ServerClient {
  socketId: string;
  userId: string;
  roomId: string;
  ws: WebSocket;
}

interface ServerRoom {
  id: string;
  managerId: string; // socketId of the manager
  state: RoomState;
  clients: Map<string, ServerClient>; // socketId → client
}

const rooms = new Map<string, ServerRoom>();
const clientRooms = new Map<string, string>(); // socketId → roomId

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateId = (len = 6): string =>
  Math.random().toString(36).substring(2, 2 + len).toUpperCase();

const send = (ws: WebSocket, msg: ServerMessage) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
};

const broadcastToRoom = (room: ServerRoom, msg: ServerMessage, exclude?: string) => {
  for (const client of room.clients.values()) {
    if (client.socketId !== exclude) {
      send(client.ws, msg);
    }
  }
};

const defaultSettings = (): RoomSettings => ({
  autoStart: true,
  timerType: TimerType.NONE,
  countdownSeconds: 60,
  cardSystem: CardSystem.ONE_TO_TEN,
  customCards: '',
});

// ─── Message handlers ─────────────────────────────────────────────────────────

const handleCreateRoom = (socketId: string, ws: WebSocket, msg: Extract<ClientMessage, { type: 'CREATE_ROOM' }>) => {
  const roomId = generateId(6);
  const userId = generateId(10);

  const manager: User = {
    id: userId,
    name: msg.name,
    isManager: true,
    hasVoted: false,
    vote: null,
  };

  const state: RoomState = {
    title: msg.title,
    users: [manager],
    tasks: [],
    activeTaskId: null,
    isRevealed: false,
    settings: defaultSettings(),
    votingStartTime: null,
    isVotingStarted: false,
  };

  const client: ServerClient = { socketId, userId, roomId, ws };
  const room: ServerRoom = {
    id: roomId,
    managerId: socketId,
    state,
    clients: new Map([[socketId, client]]),
  };

  rooms.set(roomId, room);
  clientRooms.set(socketId, roomId);

  send(ws, { type: 'ROOM_CREATED', roomId, userId });
};

const handleJoin = (socketId: string, ws: WebSocket, msg: Extract<ClientMessage, { type: 'JOIN' }>) => {
  const room = rooms.get(msg.roomId);
  if (!room) {
    send(ws, { type: 'ERROR', message: 'Room not found.' });
    return;
  }

  const userId = generateId(10);
  const newUser: User = {
    id: userId,
    name: msg.name,
    isManager: false,
    hasVoted: false,
    vote: null,
  };

  room.state.users.push(newUser);

  const client: ServerClient = { socketId, userId, roomId: msg.roomId, ws };
  room.clients.set(socketId, client);
  clientRooms.set(socketId, msg.roomId);

  send(ws, { type: 'JOINED', userId, state: room.state });
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state }, socketId);
};

const handleVote = (socketId: string, msg: Extract<ClientMessage, { type: 'VOTE' }>) => {
  const room = getRoomForClient(socketId);
  if (!room) return;
  const client = room.clients.get(socketId)!;
  const user = room.state.users.find(u => u.id === client.userId);
  if (!user || room.state.activeTaskId !== msg.taskId) return;

  user.hasVoted = true;
  user.vote = msg.vote;
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const resolveVotingStartTime = (timerType: TimerType): number | null =>
  timerType !== TimerType.NONE ? Date.now() : null;

const handleStartVoting = (socketId: string) => {
  const room = getManagerRoom(socketId);
  if (!room || !room.state.activeTaskId) return;

  room.state.isVotingStarted = true;
  room.state.votingStartTime = resolveVotingStartTime(room.state.settings.timerType);
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleReveal = (socketId: string) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  room.state.isRevealed = true;
  room.state.isVotingStarted = false;
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleResetVoting = (socketId: string) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  room.state.isRevealed = false;
  room.state.users.forEach(u => { u.hasVoted = false; u.vote = null; });

  if (room.state.activeTaskId && room.state.settings.autoStart) {
    room.state.isVotingStarted = true;
    room.state.votingStartTime = resolveVotingStartTime(room.state.settings.timerType);
  } else {
    room.state.isVotingStarted = false;
    room.state.votingStartTime = null;
  }

  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleSetActiveTask = (socketId: string, msg: Extract<ClientMessage, { type: 'SET_ACTIVE_TASK' }>) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  room.state.activeTaskId = msg.taskId;
  room.state.isRevealed = false;
  room.state.users.forEach(u => { u.hasVoted = false; u.vote = null; });

  if (msg.taskId && room.state.settings.autoStart) {
    room.state.isVotingStarted = true;
    room.state.votingStartTime = resolveVotingStartTime(room.state.settings.timerType);
  } else {
    room.state.isVotingStarted = false;
    room.state.votingStartTime = null;
  }

  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleAddTask = (socketId: string, msg: Extract<ClientMessage, { type: 'ADD_TASK' }>) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  room.state.tasks.push(msg.task);
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleRemoveTask = (socketId: string, msg: Extract<ClientMessage, { type: 'REMOVE_TASK' }>) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  room.state.tasks = room.state.tasks.filter(t => t.id !== msg.taskId);
  if (room.state.activeTaskId === msg.taskId) room.state.activeTaskId = null;
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleUpdateTask = (socketId: string, msg: Extract<ClientMessage, { type: 'UPDATE_TASK' }>) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  const index = room.state.tasks.findIndex(t => t.id === msg.task.id);
  if (index !== -1) room.state.tasks[index] = msg.task;
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleSetFinalScore = (socketId: string, msg: Extract<ClientMessage, { type: 'SET_FINAL_SCORE' }>) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  const task = room.state.tasks.find(t => t.id === msg.taskId);
  if (task) {
    task.finalScore = msg.score;
    task.status = TaskStatus.COMPLETED;
  }
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleUpdateSettings = (socketId: string, msg: Extract<ClientMessage, { type: 'UPDATE_SETTINGS' }>) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  room.state.settings = msg.settings;
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleUpdateName = (socketId: string, msg: Extract<ClientMessage, { type: 'UPDATE_NAME' }>) => {
  const room = getRoomForClient(socketId);
  if (!room) return;

  const client = room.clients.get(socketId)!;
  const user = room.state.users.find(u => u.id === client.userId);
  if (user) user.name = msg.name;
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleUpdateRoomTitle = (socketId: string, msg: Extract<ClientMessage, { type: 'UPDATE_ROOM_TITLE' }>) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  room.state.title = msg.title;
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleKick = (socketId: string, msg: Extract<ClientMessage, { type: 'KICK' }>) => {
  const room = getManagerRoom(socketId);
  if (!room) return;

  const targetClient = [...room.clients.values()].find(c => c.userId === msg.userId);
  if (targetClient) {
    send(targetClient.ws, { type: 'KICKED' });
    room.clients.delete(targetClient.socketId);
    clientRooms.delete(targetClient.socketId);
    targetClient.ws.close();
  }

  room.state.users = room.state.users.filter(u => u.id !== msg.userId);
  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleDisconnect = (socketId: string) => {
  const roomId = clientRooms.get(socketId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  const client = room.clients.get(socketId);
  if (client) {
    room.state.users = room.state.users.filter(u => u.id !== client.userId);
    room.clients.delete(socketId);
    clientRooms.delete(socketId);
  }

  if (room.clients.size === 0) {
    rooms.delete(roomId);
    return;
  }

  // If manager disconnected, close the room
  if (room.managerId === socketId) {
    broadcastToRoom(room, { type: 'ERROR', message: 'Room closed — host disconnected.' });
    for (const c of room.clients.values()) c.ws.close();
    rooms.delete(roomId);
    return;
  }

  broadcastToRoom(room, { type: 'STATE_UPDATE', state: room.state });
};

const handleUnknownMessage = (socketId: string) => {
  const room = getRoomForClient(socketId);
  if (room) {
    const client = room.clients.get(socketId);
    if (client) {
      send(client.ws, { type: 'ERROR', message: 'Unknown message type.' });
    }
  }
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

const getRoomForClient = (socketId: string): ServerRoom | null => {
  const roomId = clientRooms.get(socketId);
  return roomId ? rooms.get(roomId) ?? null : null;
};

const getManagerRoom = (socketId: string): ServerRoom | null => {
  const room = getRoomForClient(socketId);
  if (!room || room.managerId !== socketId) return null;
  return room;
};

// ─── WebSocket server ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const httpServer = createServer();
const wsServer = new WebSocketServer({ server: httpServer });

wsServer.on('connection', (ws) => {
  const socketId = generateId(16);

  ws.on('message', (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString()) as ClientMessage;
    } catch {
      send(ws, { type: 'ERROR', message: 'Invalid message format.' });
      return;
    }

    switch (msg.type) {
      case 'CREATE_ROOM':       handleCreateRoom(socketId, ws, msg); break;
      case 'JOIN':              handleJoin(socketId, ws, msg); break;
      case 'VOTE':              handleVote(socketId, msg); break;
      case 'START_VOTING':      handleStartVoting(socketId); break;
      case 'REVEAL':            handleReveal(socketId); break;
      case 'RESET_VOTING':      handleResetVoting(socketId); break;
      case 'SET_ACTIVE_TASK':   handleSetActiveTask(socketId, msg); break;
      case 'ADD_TASK':          handleAddTask(socketId, msg); break;
      case 'REMOVE_TASK':       handleRemoveTask(socketId, msg); break;
      case 'UPDATE_TASK':       handleUpdateTask(socketId, msg); break;
      case 'SET_FINAL_SCORE':   handleSetFinalScore(socketId, msg); break;
      case 'UPDATE_SETTINGS':   handleUpdateSettings(socketId, msg); break;
      case 'UPDATE_NAME':       handleUpdateName(socketId, msg); break;
      case 'UPDATE_ROOM_TITLE': handleUpdateRoomTitle(socketId, msg); break;
      case 'KICK':              handleKick(socketId, msg); break;
      default:                  handleUnknownMessage(socketId);
    }
  });

  ws.on('close', () => handleDisconnect(socketId));
  ws.on('error', () => handleDisconnect(socketId));
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[peer-poker] WebSocket server listening on port ${PORT}`);
});
