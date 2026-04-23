<script setup lang="ts">
import { ref, reactive, onMounted, computed, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Peer, DataConnection, PeerJSOption } from 'peerjs';
import { User, Task, RoomState, PeerMessage, TimerType, CardSystem, TaskStatus } from './types';

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

const peer = ref<Peer | null>(null);
const connections = ref<DataConnection[]>([]);
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

// PeerJS Logic

const broadcast = (message: PeerMessage) => {
  connections.value.forEach(conn => {
    if (conn.open) {
      conn.send(message);
    }
  });
};

const handleMessage = (msg: PeerMessage, conn?: DataConnection) => {
  switch (msg.type) {
    case 'STATE_UPDATE':
      Object.assign(state, msg.state);
      break;
    case 'JOIN':
      if (isManager.value && conn) {
        // Remove stale entry in case this is a reconnect with the same peer ID
        state.users = state.users.filter(u => u.id !== conn.peer);
        const newUser: User = {
          id: conn.peer,
          name: msg.name,
          isManager: msg.isManager,
          hasVoted: false,
          vote: null
        };
        state.users.push(newUser);
        broadcast({ type: 'STATE_UPDATE', state });
      }
      break;
    case 'VOTE':
      if (isManager.value) {
        const user = state.users.find(u => u.id === conn?.peer);
        if (user && state.activeTaskId === msg.taskId) {
          user.hasVoted = true;
          user.vote = msg.vote;
          broadcast({ type: 'STATE_UPDATE', state });
        }
      }
      break;
    case 'ADD_TASK':
      if (isManager.value) {
        state.tasks.push(msg.task);
        broadcast({ type: 'STATE_UPDATE', state });
      }
      break;
    case 'REMOVE_TASK':
      if (isManager.value) {
        state.tasks = state.tasks.filter(t => t.id !== msg.taskId);
        if (state.activeTaskId === msg.taskId) state.activeTaskId = null;
        broadcast({ type: 'STATE_UPDATE', state });
      }
      break;
    case 'SET_ACTIVE_TASK':
      if (isManager.value) {
        setActiveTask(msg.taskId);
      }
      break;
    case 'START_VOTING':
      if (isManager.value) {
        startVoting();
      }
      break;
    case 'REVEAL':
      if (isManager.value) {
        state.isRevealed = true;
        broadcast({ type: 'STATE_UPDATE', state });
      }
      break;
    case 'RESET_VOTING':
      if (isManager.value) {
        state.isRevealed = false;
        state.users.forEach(u => {
          u.hasVoted = false;
          u.vote = null;
        });
        broadcast({ type: 'STATE_UPDATE', state });
      }
      break;
    case 'KICK':
      if (myId.value === msg.userId) {
        localStorage.removeItem(`peerId_${roomIdInput.value}`);
        leaveRoom();
        error.value = 'You have been removed from the room.';
      }
      break;
    case 'DISCONNECT':
      if (isManager.value && conn) {
        state.users = state.users.filter(u => u.id !== conn.peer);
        connections.value = connections.value.filter(c => c.peer !== conn.peer);
        broadcast({ type: 'STATE_UPDATE', state });
      }
      break;
    case 'UPDATE_NAME':
      const userToUpdate = state.users.find(u => u.id === msg.userId);
      if (userToUpdate) {
        userToUpdate.name = msg.name;
        if (isManager.value) {
          broadcast({ type: 'STATE_UPDATE', state });
        }
      }
      break;
    case 'UPDATE_ROOM_TITLE':
      state.title = msg.title;
      if (isManager.value) {
        broadcast({ type: 'STATE_UPDATE', state });
      }
      break;
  }
};

const USE_ICE_SERVERS = true;

const getIceServers = async (): Promise<RTCIceServer[]> => {
  try {
    const res = await fetch('https://peer-poker.gabriel-oliveira-leme.workers.dev/');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

const createPeer = async (id?: string) => {
  const iceServers = USE_ICE_SERVERS ? await getIceServers() : [];
  const config: PeerJSOption = {
    host: '0.peerjs.com',
    secure: true,
    port: 443,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478?transport=udp' },
        ...iceServers
      ]
    }
  };
  return id ? new Peer(id, config) : new Peer(config);
};

const createRoom = async () => {
  if (!name.value || !roomTitleInput.value) {
    error.value = 'Name and Room Title are required';
    return;
  }
  isConnecting.value = true;
  error.value = '';

  peer.value = await createPeer();
  
  peer.value.on('open', (id) => {
    myId.value = id;
    window.history.replaceState({}, '', `?room=${id}`);
    state.title = roomTitleInput.value;
    state.users = [{
      id,
      name: name.value,
      isManager: true,
      hasVoted: false,
      vote: null
    }];
    isJoined.value = true;
    isConnecting.value = false;
  });

  peer.value.on('connection', (conn) => {
    connections.value.push(conn);
    conn.on('data', (data) => handleMessage(data as PeerMessage, conn));
    conn.on('open', () => {
      // Send initial state
      conn.send({ type: 'STATE_UPDATE', state });
    });
    conn.on('close', () => {
      state.users = state.users.filter(u => u.id !== conn.peer);
      connections.value = connections.value.filter(c => c.peer !== conn.peer);
      broadcast({ type: 'STATE_UPDATE', state });
    });
  });

  peer.value.on('error', (err) => {
    error.value = `Peer error: ${err.type}`;
    isConnecting.value = false;
  });
};

const joinRoom = async (useFreshId = false) => {
  if (!name.value || !roomIdInput.value) {
    error.value = 'Name and Room ID are required';
    return;
  }
  isConnecting.value = true;
  error.value = '';

  const storedPeerId = !useFreshId ? localStorage.getItem(`peerId_${roomIdInput.value}`) : null;
  peer.value = storedPeerId ? await createPeer(storedPeerId) : await createPeer();

  peer.value.on('open', (id) => {
    myId.value = id;
    localStorage.setItem(`peerId_${roomIdInput.value}`, id);
    const conn = peer.value!.connect(roomIdInput.value);
    
    conn.on('open', () => {
      connections.value = [conn];
      conn.send({ type: 'JOIN', name: name.value, isManager: false });
      isJoined.value = true;
      isConnecting.value = false;
    });

    conn.on('data', (data) => handleMessage(data as PeerMessage));
    
    conn.on('close', () => {
      leaveRoom();
      error.value = 'Connection to room lost.';
    });

    conn.on('error', (err) => {
      error.value = 'Failed to connect to room.';
      isConnecting.value = false;
    });
  });

  peer.value.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      // Stored peer ID is still reserved on the server; retry with a fresh ID
      localStorage.removeItem(`peerId_${roomIdInput.value}`);
      peer.value?.destroy();
      joinRoom(true);
      return;
    }
    error.value = `Peer error: ${err.type}`;
    isConnecting.value = false;
  });
};

const leaveRoom = (intentional = false) => {
  if (intentional) {
    localStorage.removeItem(`peerId_${roomIdInput.value}`);
  }
  if (peer.value) {
    peer.value.destroy();
  }
  isJoined.value = false;
  state.users = [];
  state.tasks = [];
  connections.value = [];
  myId.value = '';
  window.history.replaceState({}, '', window.location.pathname);
};

const castVote = (vote: string) => {
  if (!state.activeTaskId) return;
  
  if (isManager.value) {
    const user = state.users.find(u => u.id === myId.value);
    if (user) {
      user.hasVoted = true;
      user.vote = vote;
      broadcast({ type: 'STATE_UPDATE', state });
    }
  } else {
    const conn = connections.value[0];
    if (conn) {
      conn.send({ type: 'VOTE', taskId: state.activeTaskId, vote });
    }
  }
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
      state.tasks.push(newTask);
    });
  } else {
    if (!editingTask.value.title) return;

    if (isEditing.value) {
      const index = state.tasks.findIndex(t => t.id === editingTask.value.id);
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...editingTask.value } as Task;
      }
    } else {
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: editingTask.value.title,
        description: editingTask.value.description || '',
        finalScore: null,
        status: TaskStatus.PENDING
      };
      state.tasks.push(newTask);
    }
  }

  broadcast({ type: 'STATE_UPDATE', state });
  isTaskModalOpen.value = false;
};

const removeTask = (id: string) => {
  if (isManager.value) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    if (state.activeTaskId === id) state.activeTaskId = null;
    broadcast({ type: 'STATE_UPDATE', state });
  }
};

const setActiveTask = (id: string | null) => {
  if (isManager.value) {
    isMobileMenuOpen.value = false;
    state.activeTaskId = id;
    state.isRevealed = false;
    state.users.forEach(u => {
      u.hasVoted = false;
      u.vote = null;
    });
    
    if (id && state.settings.autoStart) {
      state.isVotingStarted = true;
      state.votingStartTime = Date.now();
    } else {
      state.isVotingStarted = false;
      state.votingStartTime = null;
    }
    
    broadcast({ type: 'STATE_UPDATE', state });
  }
};

const startVoting = () => {
  if (isManager.value && state.activeTaskId) {
    state.isVotingStarted = true;
    state.votingStartTime = Date.now();
    broadcast({ type: 'STATE_UPDATE', state });
  } else if (!isManager.value) {
    const conn = connections.value[0];
    if (conn) {
      conn.send({ type: 'START_VOTING' });
    }
  }
};

const revealVotes = () => {
  if (isManager.value) {
    state.isRevealed = true;
    state.isVotingStarted = false;
    broadcast({ type: 'STATE_UPDATE', state });
  }
};

const resetVoting = () => {
  if (isManager.value) {
    state.isRevealed = false;
    state.users.forEach(u => {
      u.hasVoted = false;
      u.vote = null;
    });
    
    if (state.activeTaskId && state.settings.autoStart) {
      state.isVotingStarted = true;
      state.votingStartTime = Date.now();
    } else {
      state.isVotingStarted = false;
      state.votingStartTime = null;
    }
    
    broadcast({ type: 'STATE_UPDATE', state });
  }
};

const setFinalScore = (score: string) => {
  if (isManager.value && state.activeTaskId) {
    const task = state.tasks.find(t => t.id === state.activeTaskId);
    if (task) {
      task.finalScore = score;
      task.status = TaskStatus.COMPLETED;
      broadcast({ type: 'STATE_UPDATE', state });
    }
  }
};

const kickUser = (userId: string) => {
  if (isManager.value) {
    broadcast({ type: 'KICK', userId });
    state.users = state.users.filter(u => u.id !== userId);
    const conn = connections.value.find(c => c.peer === userId);
    if (conn) conn.close();
    broadcast({ type: 'STATE_UPDATE', state });
  }
};

const updateMyName = () => {
  if (!newName.value.trim()) {
    isEditingName.value = false;
    return;
  }
  
  const user = state.users.find(u => u.id === myId.value);
  if (user) {
    user.name = newName.value.trim();
    name.value = user.name;
    sessionStorage.setItem('userName', user.name);
    if (isManager.value) {
      broadcast({ type: 'STATE_UPDATE', state });
    } else {
      const conn = connections.value[0];
      if (conn) {
        conn.send({ type: 'UPDATE_NAME', userId: myId.value, name: user.name });
      }
    }
  }
  isEditingName.value = false;
};

const updateRoomTitle = () => {
  if (!isManager.value || !newTitle.value.trim()) {
    isEditingTitle.value = false;
    return;
  }
  
  state.title = newTitle.value.trim();
  broadcast({ type: 'STATE_UPDATE', state });
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
  state.settings = { ...tempSettings.value };
  broadcast({ type: 'STATE_UPDATE', state });
  isSettingsModalOpen.value = false;
};

const toggleLanguage = () => {
  locale.value = locale.value === 'en' ? 'pt' : 'en';
};

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
};

const copyRoomId = () => {
  navigator.clipboard.writeText(myId.value);
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

  window.addEventListener('beforeunload', () => {
    if (!isManager.value && connections.value[0]?.open) {
      connections.value[0].send({ type: 'DISCONNECT' });
    }
  });

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
        :myId="myId"
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
          @leaveRoom="leaveRoom(true)"
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
