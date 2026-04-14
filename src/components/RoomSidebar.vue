<script setup lang="ts">
import { Users, UserPlus, ShieldCheck, Trash2, Plus, PackagePlus, Pencil, FileText, CheckCircle2, RotateCcw, LogOut, X } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { RoomState } from '../types';

defineProps<{
  state: RoomState;
  myId: string;
  isManager: boolean;
  isMobileMenuOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'copyRoomId'): void;
  (e: 'kickUser', userId: string): void;
  (e: 'openTaskModal', task?: any, batch?: boolean): void;
  (e: 'setActiveTask', taskId: string | null): void;
  (e: 'removeTask', taskId: string): void;
  (e: 'openResults'): void;
  (e: 'resetVoting'): void;
  (e: 'leaveRoom'): void;
  (e: 'closeMobileMenu'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <!-- Backdrop overlay (mobile only) -->
  <div
    v-if="isMobileMenuOpen"
    class="fixed inset-0 z-30 bg-black/40 lg:hidden"
    @click="emit('closeMobileMenu')"
  />

  <aside 
    class="fixed inset-y-0 left-0 w-72 md:w-80 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col"
    :class="isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Participants Section -->
    <div class="p-4 md:p-6 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] flex items-center">
          <Users class="w-3 h-3 mr-2" />
          {{ t('room.participants') }}
          <span class="ml-2 px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px]">{{ state.users.length }}</span>
        </h3>
        <div class="flex items-center space-x-1">
          <button 
            @click="emit('copyRoomId')"
            class="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            :title="t('room.invite')"
          >
            <UserPlus class="w-4 h-4" />
          </button>
          <button
            @click="emit('closeMobileMenu')"
            class="lg:hidden p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div class="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        <div 
          v-for="user in state.users" 
          :key="user.id"
          class="flex items-center justify-between p-2 rounded-xl transition-colors group"
          :class="user.id === myId ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'"
        >
          <div class="flex items-center space-x-3 min-w-0">
            <div class="relative shrink-0">
              <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 font-bold text-xs">
                {{ user.name.charAt(0).toUpperCase() }}
              </div>
              <div v-if="user.hasVoted" class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-neutral-900 rounded-full flex items-center justify-center">
                <CheckCircle2 class="w-2 h-2 text-white" />
              </div>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-neutral-900 dark:text-white truncate">
                {{ user.name }}
                <span v-if="user.id === myId" class="text-[10px] font-medium text-blue-600 dark:text-blue-400 ml-1">({{ t('room.you') }})</span>
              </p>
              <p v-if="user.isManager" class="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center">
                <ShieldCheck class="w-2.5 h-2.5 mr-1" />
                {{ t('room.manager') }}
              </p>
            </div>
          </div>
          <button 
            v-if="isManager && user.id !== myId"
            @click="emit('kickUser', user.id)"
            class="p-1.5 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Tasks Section -->
    <div class="flex-1 flex flex-col min-h-0">
      <div class="p-4 md:p-6 pb-2 flex items-center justify-between shrink-0">
        <h3 class="text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] flex items-center">
          <FileText class="w-3 h-3 mr-2" />
          {{ t('room.tasks') }}
          <span class="ml-2 px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px]">{{ state.tasks.length }}</span>
        </h3>
        <div v-if="isManager" class="flex items-center space-x-1">
          <button 
            @click="emit('openTaskModal', undefined, true)"
            class="p-1.5 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            :title="t('tasks.batchTitle')"
          >
            <PackagePlus class="w-4 h-4" />
          </button>
          <button 
            @click="emit('openTaskModal')"
            class="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            :title="t('tasks.addTitle')"
          >
            <Plus class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 md:px-6 pb-6 space-y-2 custom-scrollbar">
        <div 
          v-for="task in state.tasks" 
          :key="task.id"
          @click="emit('setActiveTask', task.id)"
          class="p-3 rounded-xl border transition-all cursor-pointer group relative"
          :class="state.activeTaskId === task.id 
            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20' 
            : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 hover:border-blue-200 dark:hover:border-blue-800 text-neutral-900 dark:text-white'"
        >
          <div class="flex items-start justify-between mb-1">
            <p class="text-sm font-bold truncate pr-6">{{ task.title }}</p>
            <div class="flex items-center space-x-1 shrink-0">
              <button 
                v-if="isManager"
                @click.stop="emit('openTaskModal', task)"
                class="p-1 rounded transition-colors"
                :class="state.activeTaskId === task.id ? 'hover:bg-blue-500' : 'text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400'"
              >
                <Pencil class="w-3 h-3" />
              </button>
              <button 
                v-if="isManager"
                @click.stop="emit('removeTask', task.id)"
                class="p-1 rounded transition-colors"
                :class="state.activeTaskId === task.id ? 'hover:bg-blue-500' : 'text-neutral-300 hover:text-red-500'"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span 
                class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                :class="task.status === 'completed' 
                  ? (state.activeTaskId === task.id ? 'bg-blue-500 text-white' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400')
                  : (state.activeTaskId === task.id ? 'bg-blue-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500')"
              >
                {{ task.status === 'completed' ? t('room.completed') : t('room.pending') }}
              </span>
            </div>
            <span v-if="task.finalScore" class="text-xs font-black" :class="state.activeTaskId === task.id ? 'text-white' : 'text-blue-600 dark:text-blue-400'">
              {{ task.finalScore }}
            </span>
          </div>
        </div>
        
        <div v-if="state.tasks.length === 0" class="py-12 flex flex-col items-center justify-center text-center opacity-40">
          <FileText class="w-10 h-10 mb-3 text-neutral-300 dark:text-neutral-700" />
          <p class="text-xs font-bold text-neutral-400 dark:text-neutral-500">{{ t('room.noTasks') }}</p>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="p-4 md:p-6 border-t border-neutral-100 dark:border-neutral-800 space-y-2 shrink-0">
      <button 
        @click="emit('openResults')"
        class="w-full py-2.5 px-4 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center"
      >
        <RotateCcw class="w-3.5 h-3.5 mr-2" />
        {{ t('room.summary') }}
      </button>
      <button 
        @click="emit('leaveRoom')"
        class="w-full py-2.5 px-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center"
      >
        <LogOut class="w-3.5 h-3.5 mr-2" />
        {{ t('room.leave') }}
      </button>
    </div>
  </aside>
</template>
