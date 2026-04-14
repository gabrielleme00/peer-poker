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

export type PeerMessage = 
  | { type: 'STATE_UPDATE'; state: RoomState }
  | { type: 'JOIN'; name: string; isManager: boolean }
  | { type: 'VOTE'; taskId: string; vote: string }
  | { type: 'KICK'; userId: string }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'REMOVE_TASK'; taskId: string }
  | { type: 'UPDATE_TASK'; task: Task }
  | { type: 'REVEAL' }
  | { type: 'RESET_VOTING' }
  | { type: 'SET_ACTIVE_TASK'; taskId: string | null }
  | { type: 'UPDATE_NAME'; userId: string; name: string }
  | { type: 'UPDATE_ROOM_TITLE'; title: string }
  | { type: 'START_VOTING' }
  | { type: 'DISCONNECT' };
