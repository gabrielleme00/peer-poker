export interface User {
  id: string;
  name: string;
  isManager: boolean;
  hasVoted: boolean;
  vote: string | null;
}

export enum TaskStatus {
  PENDING = 'pending',
  VOTING = 'voting',
  COMPLETED = 'completed'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  finalScore: string | null;
  status: TaskStatus;
}

export enum TimerType {
  NONE = 'NONE',
  TRACKTIME = 'TRACKTIME',
  COUNTDOWN = 'COUNTDOWN'
}

export enum CardSystem {
  ONE_TO_TEN = '1-10',
  FIBONACCI = 'FIBONACCI',
  DOUBLING = 'DOUBLING',
  CUSTOM = 'CUSTOM'
}

export interface RoomSettings {
  autoStart: boolean;
  timerType: TimerType;
  countdownSeconds: number;
  cardSystem: CardSystem;
  customCards: string;
}

export interface RoomState {
  title: string;
  users: User[];
  tasks: Task[];
  activeTaskId: string | null;
  isRevealed: boolean;
  settings: RoomSettings;
  votingStartTime: number | null;
  isVotingStarted: boolean;
}

export type ClientMessage =
  | { type: 'CREATE_ROOM'; name: string; title: string }
  | { type: 'JOIN'; name: string; roomId: string }
  | { type: 'VOTE'; taskId: string; vote: string }
  | { type: 'START_VOTING' }
  | { type: 'REVEAL' }
  | { type: 'RESET_VOTING' }
  | { type: 'SET_ACTIVE_TASK'; taskId: string | null }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'REMOVE_TASK'; taskId: string }
  | { type: 'UPDATE_TASK'; task: Task }
  | { type: 'SET_FINAL_SCORE'; taskId: string; score: string }
  | { type: 'UPDATE_SETTINGS'; settings: RoomSettings }
  | { type: 'UPDATE_NAME'; name: string }
  | { type: 'UPDATE_ROOM_TITLE'; title: string }
  | { type: 'KICK'; userId: string };

export type ServerMessage =
  | { type: 'ROOM_CREATED'; roomId: string; userId: string; state: RoomState }
  | { type: 'JOINED'; userId: string; state: RoomState }
  | { type: 'STATE_UPDATE'; state: RoomState }
  | { type: 'KICKED' }
  | { type: 'ERROR'; message: string };
