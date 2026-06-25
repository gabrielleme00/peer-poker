<script setup lang="ts">
import { ref, reactive, onMounted, computed, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Task, RoomState, ClientMessage, ServerMessage, TimerType, CardSystem, TaskStatus } from './types';

// Components
import LandingPage from './components/LandingPage.vue';
import RoomHeader from './components/RoomHeader.vue';
import RoomSidebar from './components/RoomSidebar.vue';
import VotingArea from './components/VotingArea.vue';
import TaskModal from './components/TaskModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import ResultsModal from './components/ResultsModal.vue';

// State
const name = ref(sessionStorage.getItem('userName') ?? '');
const isManager = ref(false);
const roomIdInput = ref('');
const roomTitleInput = ref('');
const isJoined = ref(false);
const isConnecting = ref(false);
const error = ref('');
const copied = ref(false);

// Task Modal State
const isTaskModalOpen = ref(false);
const isBatchMode = ref(false);
const batchTitles = ref('');
const editingTask = ref<Partial<Task>>({
  title: '',
  description: ''
});
const isEditing = ref(false);
const isEditingName = ref(false);
const isEditingTitle = ref(false);
const isSettingsModalOpen = ref(false);
const isResultsModalOpen = ref(false);
const isMobileMenuOpen = ref(false);
const getInitialDarkMode = () => {
  try {
    return localStorage.getItem('darkMode') === 'true';
  } catch (e) {
    return false;
  }
};
const isDarkMode = ref(getInitialDarkMode());

// Sync dark mode class with state
watch(isDarkMode, (val) => {
  try {
    localStorage.setItem('darkMode', val.toString());
  } catch (e) {
    // Ignore localStorage errors
  }
  
  if (val) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, { immediate: true });

watch(name, (val) => {
  if (val) sessionStorage.setItem('userName', val);
});

const { t, locale } = useI18n();
const newName = ref('');
const newTitle = ref('');
const tempSettings = ref({
  autoStart: true,
  timerType: TimerType.NONE,
  countdownSeconds: 60,
  cardSystem: CardSystem.ONE_TO_TEN,
  customCards: ''
});

const ws = ref<WebSocket | null>(null);
const roomId = ref('');
const myId = ref('');

const state = reactive<RoomState>({
  title: '',
  users: [],
  tasks: [],
  activeTaskId: null,
  isRevealed: false,
  settings: {
    autoStart: true,
    timerType: TimerType.NONE,
    countdownSeconds: 60,
    cardSystem: CardSystem.ONE_TO_TEN,
    customCards: ''
  },
  votingStartTime: null,
  isVotingStarted: false
});

// Computed
const activeTask = computed(() => state.tasks.find(t => t.id === state.activeTaskId));
const currentUser = computed(() => state.users.find(u => u.id === myId.value));

const votingProgress = computed(() => {
  if (state.users.length === 0) return 0;
  const voters = state.users.filter(u => !u.isManager);
  if (voters.length === 0) return 0;
  const votedCount = voters.filter(u => u.hasVoted).length;
  return Math.round((votedCount / voters.length) * 100);
});

const voteOptions = computed(() => {
  switch (state.settings.cardSystem) {
    case CardSystem.FIBONACCI:
      return ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'];
    case CardSystem.DOUBLING:
      return ['1', '2', '4', '8', '16', '32', '64', '?'];
    case CardSystem.CUSTOM:
      return state.settings.customCards.split(',').map(s => s.trim()).filter(s => s).concat(['?']);
    default:
      return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?'];
  }
});

const timerDisplay = ref('');
let timerInterval: any = null;

const updateTimer = () => {
  if (!state.isVotingStarted || !state.votingStartTime || state.settings.timerType === TimerType.NONE) {
    timerDisplay.value = '';
    return;
  }

  const now = Date.now();
  const elapsed = Math.floor((now - state.votingStartTime) / 1000);

  if (state.settings.timerType === TimerType.TRACKTIME) {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    timerDisplay.value = `${mins}:${secs.toString().padStart(2, '0')}`;
  } else if (state.settings.timerType === TimerType.COUNTDOWN) {
    const remaining = state.settings.countdownSeconds - elapsed;
    if (remaining <= 0) {
      timerDisplay.value = '0:00';
      if (isManager.value && !state.isRevealed) {
        revealVotes();
      }
    } else {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerDisplay.value = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }
};

// WebSocket logic

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) || 'ws://localhost:8080';

const send = (msg: ClientMessage) => {
  ws.value?.send(JSON.stringify(msg));
};

const handleServerMessage = (event: MessageEvent) => {
  const msg = JSON.parse(event.data as string) as ServerMessage;
  switch (msg.type) {
    case 'ROOM_CREATED':
      roomId.value = msg.roomId;
      myId.value = msg.userId;
      isManager.value = true;
      Object.assign(state, msg.state);
      window.history.replaceState({}, '', `?room=${msg.roomId}`);
      isJoined.value = true;
      isConnecting.value = false;
      break;
    case 'JOINED':
      roomId.value = roomIdInput.value;
      myId.value = msg.userId;
      isManager.value = false;
      Object.assign(state, msg.state);
      isJoined.value = true;
      isConnecting.value = false;
      break;
    case 'STATE_UPDATE':
      Object.assign(state, msg.state);
      break;
    case 'KICKED':
      leaveRoom();
      error.value = 'You have been removed from the room.';
      break;
    case 'ERROR':
      error.value = msg.message;
      isConnecting.value = false;
      break;
  }
};

const handleWsDisconnect = () => {
  if (isJoined.value) {
    leaveRoom();
    error.value = 'Connection to server lost.';
  }
  isConnecting.value = false;
};

const createRoom = () => {
  if (!name.value || !roomTitleInput.value) {
    error.value = 'Name and Room Title are required';
    return;
  }
  isConnecting.value = true;
  error.value = '';

  ws.value = new WebSocket(WS_URL);
  ws.value.onopen = () => {
    send({ type: 'CREATE_ROOM', name: name.value, title: roomTitleInput.value });
  };
  ws.value.onmessage = handleServerMessage;
  ws.value.onclose = handleWsDisconnect;
  ws.value.onerror = () => {
    error.value = 'Could not connect to server.';
    isConnecting.value = false;
  };
};

const joinRoom = () => {
  if (!name.value || !roomIdInput.value) {
    error.value = 'Name and Room ID are required';
    return;
  }
  isConnecting.value = true;
  error.value = '';

  ws.value = new WebSocket(WS_URL);
  ws.value.onopen = () => {
    send({ type: 'JOIN', name: name.value, roomId: roomIdInput.value });
  };
  ws.value.onmessage = handleServerMessage;
  ws.value.onclose = handleWsDisconnect;
  ws.value.onerror = () => {
    error.value = 'Could not connect to server.';
    isConnecting.value = false;
  };
};

const leaveRoom = (_intentional = false) => {
  if (ws.value) {
    ws.value.onclose = null; // prevent handleWsDisconnect loop
    ws.value.close();
    ws.value = null;
  }
  isJoined.value = false;
  roomId.value = '';
  myId.value = '';
  state.users = [];
  state.tasks = [];
  state.activeTaskId = null;
  state.isRevealed = false;
  state.isVotingStarted = false;
  state.votingStartTime = null;
  window.history.replaceState({}, '', window.location.pathname);
};

const castVote = (vote: string) => {
  if (!state.activeTaskId) return;
  send({ type: 'VOTE', taskId: state.activeTaskId, vote });
};

const openTaskModal = (task?: Task, batch = false) => {
  isMobileMenuOpen.value = false;
  isBatchMode.value = batch;
  batchTitles.value = '';
  if (task) {
    editingTask.value = { ...task };
    isEditing.value = true;
  } else {
    editingTask.value = {
      title: '',
      description: ''
    };
    isEditing.value = false;
  }
  isTaskModalOpen.value = true;
};

const saveTask = () => {
  if (isBatchMode.value) {
    const titles = batchTitles.value.split('\n').map(t => t.trim()).filter(t => t);
    if (titles.length === 0) return;

    titles.forEach(title => {
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        description: '',
        finalScore: null,
        status: TaskStatus.PENDING
      };
      send({ type: 'ADD_TASK', task: newTask });
    });
  } else {
    if (!editingTask.value.title) return;

    if (isEditing.value) {
      const existing = state.tasks.find(t => t.id === editingTask.value.id);
      if (existing) {
        send({ type: 'UPDATE_TASK', task: { ...existing, ...editingTask.value } as Task });
      }
    } else {
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: editingTask.value.title,
        description: editingTask.value.description || '',
        finalScore: null,
        status: TaskStatus.PENDING
      };
      send({ type: 'ADD_TASK', task: newTask });
    }
  }

  isTaskModalOpen.value = false;
};

const removeTask = (id: string) => {
  send({ type: 'REMOVE_TASK', taskId: id });
};

const setActiveTask = (id: string | null) => {
  isMobileMenuOpen.value = false;
  send({ type: 'SET_ACTIVE_TASK', taskId: id });
};

const startVoting = () => {
  send({ type: 'START_VOTING' });
};

const revealVotes = () => {
  send({ type: 'REVEAL' });
};

const resetVoting = () => {
  send({ type: 'RESET_VOTING' });
};

const setFinalScore = (score: string) => {
  if (!state.activeTaskId) return;
  send({ type: 'SET_FINAL_SCORE', taskId: state.activeTaskId, score });
};

const kickUser = (userId: string) => {
  send({ type: 'KICK', userId });
};

const updateMyName = () => {
  if (!newName.value.trim()) {
    isEditingName.value = false;
    return;
  }

  name.value = newName.value.trim();
  sessionStorage.setItem('userName', name.value);
  send({ type: 'UPDATE_NAME', name: name.value });
  isEditingName.value = false;
};

const updateRoomTitle = () => {
  if (!newTitle.value.trim()) {
    isEditingTitle.value = false;
    return;
  }

  send({ type: 'UPDATE_ROOM_TITLE', title: newTitle.value.trim() });
  isEditingTitle.value = false;
};

const startEditingName = () => {
  newName.value = currentUser.value?.name || '';
  isEditingName.value = true;
};

const startEditingTitle = () => {
  if (!isManager.value) return;
  newTitle.value = state.title;
  isEditingTitle.value = true;
};

const openSettings = () => {
  tempSettings.value = { ...state.settings };
  isSettingsModalOpen.value = true;
};

const saveSettings = () => {
  send({ type: 'UPDATE_SETTINGS', settings: { ...tempSettings.value } });
  isSettingsModalOpen.value = false;
};

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'pt' : 'en';
};

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
};

const copyRoomId = () => {
  navigator.clipboard.writeText(roomId.value);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
};

const downloadResults = () => {
  const headers = [
    t('room.csvHeaders.title'),
    t('room.csvHeaders.description'),
    t('room.csvHeaders.score'),
    t('room.csvHeaders.status')
  ];
  const rows = state.tasks.map(task => [
    task.title,
    task.description.replace(/"/g, '""'),
    task.finalScore || 'N/A',
    task.status === TaskStatus.COMPLETED ? t('room.completed') : t('room.pending')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${state.title.replace(/\s+/g, '_')}_results.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

onMounted(() => {
  timerInterval = setInterval(updateTimer, 1000);

  const params = new URLSearchParams(window.location.search);
  const roomFromUrl = params.get('room');
  if (roomFromUrl) {
    roomIdInput.value = roomFromUrl;
    isManager.value = false;
  }
});

onUnmounted(() => {
  leaveRoom();
  if (timerInterval) clearInterval(timerInterval);
});

</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30 transition-colors duration-300">
    <!-- Landing Page -->
    <LandingPage 
      v-if="!isJoined"
      v-model:name="name"
      v-model:isManager="isManager"
      v-model:roomIdInput="roomIdInput"
      v-model:roomTitleInput="roomTitleInput"
      :isConnecting="isConnecting"
      :error="error"
      :isDarkMode="isDarkMode"
      :locale="locale"
      @createRoom="createRoom"
      @joinRoom="joinRoom"
      @toggleDarkMode="toggleDarkMode"
      @toggleLanguage="toggleLanguage"
    />

    <!-- Poker Room -->
    <div v-else class="flex flex-col h-screen overflow-hidden relative bg-neutral-50 dark:bg-neutral-950 transition-colors duration-300">
      <RoomHeader 
        :state="state"
        :currentUser="currentUser"
        :roomId="roomId"
        :isManager="isManager"
        :isMobileMenuOpen="isMobileMenuOpen"
        :isEditingTitle="isEditingTitle"
        :isEditingName="isEditingName"
        v-model:newTitle="newTitle"
        v-model:newName="newName"
        :copied="copied"
        :timerDisplay="timerDisplay"
        :isDarkMode="isDarkMode"
        :locale="locale"
        @toggleMobileMenu="isMobileMenuOpen = !isMobileMenuOpen"
        @startEditingTitle="startEditingTitle"
        @updateRoomTitle="updateRoomTitle"
        @startEditingName="startEditingName"
        @updateMyName="updateMyName"
        @copyRoomId="copyRoomId"
        @toggleDarkMode="toggleDarkMode"
        @toggleLanguage="toggleLanguage"
        @openSettings="openSettings"
      />

      <div class="flex-1 flex overflow-hidden relative">
        <RoomSidebar 
          :state="state"
          :myId="myId"
          :isManager="isManager"
          :isMobileMenuOpen="isMobileMenuOpen"
          @copyRoomId="copyRoomId"
          @kickUser="kickUser"
          @openTaskModal="openTaskModal"
          @setActiveTask="setActiveTask"
          @removeTask="removeTask"
          @openResults="isResultsModalOpen = true"
          @resetVoting="resetVoting"
          @leaveRoom="leaveRoom()"
          @closeMobileMenu="isMobileMenuOpen = false"
        />

        <VotingArea 
          :state="state"
          :activeTask="activeTask"
          :currentUser="currentUser"
          :isManager="isManager"
          :votingProgress="votingProgress"
          :voteOptions="voteOptions"
          @startVoting="startVoting"
          @castVote="castVote"
          @revealVotes="revealVotes"
          @resetVoting="resetVoting"
          @setFinalScore="setFinalScore"
        />
      </div>
    </div>
  </div>

  <TaskModal 
    :isOpen="isTaskModalOpen"
    :isBatchMode="isBatchMode"
    :isEditing="isEditing"
    v-model:editingTask="editingTask"
    v-model:batchTitles="batchTitles"
    @close="isTaskModalOpen = false"
    @save="saveTask"
  />

  <SettingsModal 
    :isOpen="isSettingsModalOpen"
    v-model:tempSettings="tempSettings"
    @close="isSettingsModalOpen = false"
    @save="saveSettings"
  />

  <ResultsModal 
    :isOpen="isResultsModalOpen"
    :state="state"
    @close="isResultsModalOpen = false"
    @download="downloadResults"
  />
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}

body {
  font-family: var(--font-sans);
}

.animate-in {
  animation-duration: 0.3s;
  animation-fill-mode: both;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-top-2 {
  from { transform: translateY(-0.5rem); }
  to { transform: translateY(0); }
}

.fade-in { animation-name: fade-in; }
.slide-in-from-top-2 { animation-name: slide-in-from-top-2; }
</style>
