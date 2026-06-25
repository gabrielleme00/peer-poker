<script setup lang="ts">
import { ref, watch } from 'vue';
import { Play, Eye, RotateCcw, User as UserIcon, Users } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { RoomState, Task, User } from '../types';

const props = defineProps<{
  state: RoomState;
  activeTask: Task | undefined;
  currentUser: User | undefined;
  isManager: boolean;
  votingProgress: number;
  voteOptions: string[];
}>();

const emit = defineEmits<{
  (e: 'startVoting'): void;
  (e: 'castVote', vote: string): void;
  (e: 'revealVotes'): void;
  (e: 'resetVoting'): void;
  (e: 'setFinalScore', score: string): void;
}>();

const { t } = useI18n();

// Optimistic card highlight — reflects selection immediately before server roundtrip
const localVote = ref<string | null>(null);

watch(() => props.currentUser?.vote, (val) => {
  localVote.value = val ?? null;
}, { immediate: true });

watch(() => props.activeTask?.id, () => {
  localVote.value = props.currentUser?.vote ?? null;
});

const handleCastVote = (option: string) => {
  localVote.value = option;
  emit('castVote', option);
};

// Final score celebration animation
type Particle = { tx: number; ty: number; color: string; delay: number; size: number; square: boolean };
const showCelebration = ref(false);
const celebrationScore = ref('');
const celebrationParticles = ref<Particle[]>([]);

watch(() => props.activeTask?.finalScore, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
    celebrationParticles.value = Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * 360 + (Math.random() * 26 - 13);
      const distance = 100 + Math.random() * 160;
      return {
        tx: Math.cos((angle * Math.PI) / 180) * distance,
        ty: Math.sin((angle * Math.PI) / 180) * distance,
        color: colors[i % colors.length],
        delay: Math.random() * 0.5,
        size: 7 + Math.random() * 11,
        square: Math.random() > 0.5,
      };
    });
    celebrationScore.value = newVal;
    showCelebration.value = true;
    setTimeout(() => { showCelebration.value = false; }, 4000);
  }
});
</script>

<template>
  <main class="flex-1 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950 transition-colors">
    <div v-if="!activeTask" class="flex-1 flex flex-col items-center justify-center p-12 text-center">
      <div class="w-24 h-24 bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-6">
        <Play class="w-10 h-10 text-neutral-300 dark:text-neutral-700" />
      </div>
      <h3 class="text-xl font-bold text-neutral-900 dark:text-white mb-2">{{ t('room.noActiveTask') }}</h3>
      <p class="text-neutral-500 dark:text-neutral-400 max-w-xs">{{ t('room.selectTask') }}</p>
    </div>

    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <!-- Task Detail Area -->
      <div class="p-4 md:p-8 shrink-0">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 shadow-sm border border-neutral-200 dark:border-neutral-800">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-3">
                  <span class="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-md">
                    {{ t('room.activeTask') }}
                  </span>
                  <span v-if="activeTask.status === 'completed'" class="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest rounded-md">
                    {{ t('room.completed') }}
                  </span>
                </div>
                <h1 class="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white mb-4 leading-tight">{{ activeTask.title }}</h1>
                <p class="text-neutral-500 dark:text-neutral-400 leading-relaxed">{{ activeTask.description || t('room.noDescription') }}</p>
              </div>
              
              <div v-if="isManager" class="flex flex-col space-y-3 shrink-0">
                <button 
                  v-if="!state.isVotingStarted && !state.isRevealed"
                  @click="emit('startVoting')"
                  class="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                >
                  <Play class="w-4 h-4 mr-2" />
                  {{ t('room.startVoting') }}
                </button>
                <div v-if="state.isVotingStarted" class="flex flex-col space-y-2">
                  <div class="flex items-center justify-between text-xs font-bold mb-1">
                    <span class="text-neutral-500 dark:text-neutral-400">{{ t('room.progress') }}</span>
                    <span class="text-blue-600 dark:text-blue-400">{{ votingProgress }}%</span>
                  </div>
                  <div class="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-600 transition-all duration-500" :style="{ width: `${votingProgress}%` }"></div>
                  </div>
                  <button 
                    @click="emit('revealVotes')"
                    class="mt-2 flex items-center justify-center px-6 py-3 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                    :class="votingProgress === 100 ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900' : ''"
                  >
                    <Eye class="w-4 h-4 mr-2" />
                    {{ t('room.reveal') }}
                  </button>
                </div>
                <button 
                  v-if="state.isRevealed"
                  @click="emit('resetVoting')"
                  class="flex items-center justify-center px-6 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-2xl transition-all active:scale-[0.98]"
                >
                  <RotateCcw class="w-4 h-4 mr-2" />
                  {{ t('room.reset') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Voting / Results Area -->
      <div class="flex-1 overflow-y-auto p-4 md:p-8 pt-0 custom-scrollbar">
        <div class="max-w-4xl mx-auto">
          <!-- Voting Interface -->
          <div v-if="state.isVotingStarted && !currentUser?.isManager" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 class="text-sm font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] mb-6 text-center">{{ t('room.castVote') }}</h3>
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              <button 
                v-for="option in voteOptions" 
                :key="option"
                @click="handleCastVote(option)"
                class="aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center transition-all group relative overflow-hidden"
                :class="localVote === option 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/30 scale-105 z-10' 
                  : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-900 dark:text-white hover:border-blue-400 dark:hover:border-blue-500 hover:-translate-y-1'"
              >
                <span class="text-3xl font-black tracking-tighter">{{ option }}</span>
                <div v-if="localVote === option" class="absolute inset-0 bg-white/10 pointer-events-none"></div>
              </button>
            </div>
          </div>

          <!-- Waiting State -->
          <div v-else-if="state.isVotingStarted && currentUser?.isManager" class="flex flex-col items-center justify-center py-12 animate-in fade-in duration-500">
            <div class="relative mb-8">
              <div class="w-20 h-20 border-4 border-blue-100 dark:border-blue-900/30 rounded-full"></div>
              <div class="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <Users class="absolute inset-0 m-auto w-8 h-8 text-blue-600" />
            </div>
            <h3 class="text-xl font-bold text-neutral-900 dark:text-white mb-2">{{ t('room.waitingVotes') }}</h3>
            <p class="text-neutral-500 dark:text-neutral-400">{{ t('room.waitingDesc') }}</p>
          </div>

          <!-- Results Display -->
          <div v-else-if="state.isRevealed" class="animate-in fade-in zoom-in-95 duration-500">
            <div class="mb-12">
              <div class="flex items-center justify-between mb-8">
                <h3 class="text-sm font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">{{ t('room.results') }}</h3>
                <div v-if="isManager" class="flex items-center space-x-2">
                  <span class="text-xs font-bold text-neutral-500 dark:text-neutral-400 mr-2">{{ t('room.setFinal') }}:</span>
                  <div class="flex flex-wrap gap-1 justify-center max-w-xs">
                    <button 
                      v-for="score in voteOptions.filter(o => o !== '?')" 
                      :key="score"
                      @click="emit('setFinalScore', score)"
                      class="px-3 py-1 border hover:border-blue-500 dark:hover:border-blue-500 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-lg transition-all"
                      :class="activeTask?.finalScore === score ? 'bg-blue-100 dark:bg-blue-900 border-blue-600' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'"
                    >
                      {{ score }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <div 
                  v-for="user in state.users.filter(u => !u.isManager)" 
                  :key="user.id"
                  class="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md hover:-translate-y-1"
                >
                  <div class="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 mb-4">
                    <UserIcon class="w-6 h-6" />
                  </div>
                  <p class="text-sm font-bold text-neutral-900 dark:text-white truncate w-full mb-4">{{ user.name }}</p>
                  <div 
                    class="w-16 h-20 rounded-xl border-2 flex items-center justify-center text-2xl font-black tracking-tighter"
                    :class="user.hasVoted ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-700 text-neutral-300 dark:text-neutral-600'"
                  >
                    {{ user.vote || '?' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <Teleport to="body">
    <Transition name="celebration">
      <div
        v-if="showCelebration"
        class="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer"
        @click="showCelebration = false"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-md"></div>

        <div class="relative celebration-card">
          <!-- Confetti particles -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              v-for="(p, i) in celebrationParticles"
              :key="i"
              class="absolute celebration-particle"
              :style="{
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                borderRadius: p.square ? '3px' : '50%',
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
                animationDelay: `${p.delay}s`,
              }"
            ></div>
          </div>

          <!-- Expanding ring pulses -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="celebration-ring"></div>
            <div class="celebration-ring" style="animation-delay: 0.35s"></div>
          </div>

          <!-- Score card -->
          <div class="relative celebration-inner bg-white dark:bg-neutral-900 rounded-[2rem] px-14 py-10 text-center shadow-2xl border border-white/20">
            <div class="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-3">{{ t('room.finalScore') }}</div>
            <div class="celebration-number text-[6rem] font-black leading-none bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent select-none">
              {{ celebrationScore }}
            </div>
            <div class="flex justify-center gap-2 mt-5">
              <span
                v-for="icon in 5"
                :key="icon"
                class="text-xl celebration-icon"
                :style="{ animationDelay: `${0.6 + icon * 0.08}s` }"
              >✔️</span>
            </div>
            <p class="mt-5 text-[10px] text-neutral-400 dark:text-neutral-600 font-medium tracking-widest uppercase">{{ t('room.tapToDismiss') }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@keyframes bounce-in {
  0%   { opacity: 0; transform: scale(0.2) rotate(-8deg); }
  55%  { opacity: 1; transform: scale(1.1) rotate(3deg); }
  75%  { transform: scale(0.96) rotate(-1deg); }
  100% { transform: scale(1) rotate(0deg); }
}

@keyframes particle-burst {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  60%  { opacity: 0.8; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}

@keyframes score-pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.05); }
}

@keyframes star-pop {
  0%   { transform: scale(0) rotate(-45deg); opacity: 0; }
  70%  { transform: scale(1.3) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes ring-expand {
  0%   { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(4); opacity: 0; }
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 40px rgba(59,130,246,0.2), 0 25px 60px rgba(0,0,0,0.25); }
  50%       { box-shadow: 0 0 80px rgba(139,92,246,0.35), 0 25px 60px rgba(0,0,0,0.25); }
}

.celebration-card {
  animation: bounce-in 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.celebration-inner {
  animation: glow-pulse 2s ease-in-out 0.65s infinite;
}

.celebration-particle {
  animation: particle-burst 1.4s ease-out both;
}

.celebration-number {
  animation: score-pulse 1.8s ease-in-out 0.65s infinite;
}

.celebration-icon {
  display: inline-block;
  animation: star-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.celebration-ring {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 3px solid rgba(139, 92, 246, 0.45);
  animation: ring-expand 1.6s ease-out 0.2s both;
}

.celebration-enter-active { transition: opacity 0.3s ease; }
.celebration-leave-active { transition: opacity 0.5s ease; }
.celebration-enter-from,
.celebration-leave-to     { opacity: 0; }
</style>
