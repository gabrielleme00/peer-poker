<script setup lang="ts">
import { Users, X, Menu, User as UserIcon, Clock, Check, Copy, Sun, Moon, Settings } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { RoomState, User } from '../types';

defineProps<{
  state: RoomState;
  currentUser: User | undefined;
  myId: string;
  isManager: boolean;
  isMobileMenuOpen: boolean;
  isEditingTitle: boolean;
  isEditingName: boolean;
  newTitle: string;
  newName: string;
  copied: boolean;
  timerDisplay: string;
  isDarkMode: boolean;
  locale: string;
}>();

const emit = defineEmits<{
  (e: 'toggleMobileMenu'): void;
  (e: 'startEditingTitle'): void;
  (e: 'update:newTitle', value: string): void;
  (e: 'updateRoomTitle'): void;
  (e: 'startEditingName'): void;
  (e: 'update:newName', value: string): void;
  (e: 'updateMyName'): void;
  (e: 'copyRoomId'): void;
  (e: 'toggleDarkMode'): void;
  (e: 'toggleLanguage'): void;
  (e: 'openSettings'): void;
}>();

const { t } = useI18n();

const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
};
</script>

<template>
  <header class="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 md:px-6 shrink-0 z-30 transition-colors">
    <!-- Row 1: hamburger + logo + room name + user name | action buttons (desktop: single row) -->
    <div class="flex items-center justify-between py-3 lg:py-4">
      <div class="flex items-center space-x-3 md:space-x-4 min-w-0">
        <button 
          @click="emit('toggleMobileMenu')"
          class="lg:hidden shrink-0 p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <component :is="isMobileMenuOpen ? X : Menu" class="w-6 h-6" />
        </button>
        <div class="shrink-0 w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-white">
          <Users class="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div class="min-w-0">
          <!-- Room title -->
          <div v-if="isEditingTitle" class="flex items-center space-x-2">
            <input 
              :value="newTitle" 
              @input="emit('update:newTitle', ($event.target as HTMLInputElement).value)"
              type="text" 
              class="text-lg font-bold text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-500"
              @keyup.enter="emit('updateRoomTitle')"
              @blur="emit('updateRoomTitle')"
              v-focus
            />
          </div>
          <h2 
            v-else 
            class="text-base md:text-lg font-bold text-neutral-900 dark:text-white leading-tight truncate"
            :class="isManager ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors' : ''"
            @click="emit('startEditingTitle')"
          >
            {{ state.title }}
          </h2>
          <div class="flex items-center space-x-1 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            <div v-if="isEditingName" class="flex items-center">
              <input 
                :value="newName" 
                @input="emit('update:newName', ($event.target as HTMLInputElement).value)"
                type="text" 
                class="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-1 py-0 outline-none focus:ring-1 focus:ring-blue-500 w-24 dark:text-white"
                @keyup.enter="emit('updateMyName')"
                @blur="emit('updateMyName')"
                v-focus
              />
            </div>
            <button 
              v-else 
              @click="emit('startEditingName')"
              class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center font-medium"
            >
              <UserIcon class="w-3 h-3 mr-1" />
              {{ currentUser?.name }}
            </button>
            <!-- Desktop-only secondary info inline -->
            <template class="hidden lg:contents">
              <span class="hidden lg:flex items-center mr-1">
                <Clock class="w-3 h-3 mr-1" />
                {{ t('room.liveSession') }}
              </span>
              <button 
                class="hidden lg:flex hover:text-blue-600 dark:hover:text-blue-400 transition-colors items-center group"
                @click="emit('copyRoomId')"
              >
                {{ t('room.id') }}: {{ myId.substring(0, 8) }}...
                <component :is="copied ? Check : Copy" class="w-3 h-3 ml-1" />
              </button>
              <span v-if="timerDisplay" class="hidden lg:flex items-center text-blue-600 dark:text-blue-400 font-bold ml-2 animate-in fade-in">
                <Clock class="w-3 h-3 mr-1" />
                {{ timerDisplay }}
              </span>
            </template>
          </div>
        </div>
      </div>

      <!-- Action buttons (always visible) -->
      <div class="flex items-center space-x-1 md:space-x-3 shrink-0">
        <button 
          @click="emit('toggleDarkMode')" 
          class="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
          :title="t('room.darkMode')"
        >
          <component :is="isDarkMode ? Sun : Moon" class="w-5 h-5" />
        </button>
        <button 
          @click="emit('toggleLanguage')" 
          class="hidden md:block text-xs font-bold text-neutral-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest px-2"
        >
          {{ locale === 'en' ? 'PT' : 'EN' }}
        </button>
        <button 
          v-if="isManager"
          @click="emit('openSettings')"
          class="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
          :title="t('room.settings')"
        >
          <Settings class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Row 2: secondary info - mobile only -->
    <div class="lg:hidden flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 pb-3">
      <span class="flex items-center">
        <Clock class="w-3 h-3 mr-1" />
        {{ t('room.liveSession') }}
      </span>
      <button 
        @click="emit('copyRoomId')"
        class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center"
      >
        {{ t('room.id') }}: {{ myId.substring(0, 8) }}...
        <component :is="copied ? Check : Copy" class="w-3 h-3 ml-1" />
      </button>
      <span v-if="timerDisplay" class="flex items-center text-blue-600 dark:text-blue-400 font-bold animate-in fade-in">
        <Clock class="w-3 h-3 mr-1" />
        {{ timerDisplay }}
      </span>
      <button 
        @click="emit('toggleLanguage')" 
        class="md:hidden text-xs font-bold text-neutral-400 dark:text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest"
      >
        {{ locale === 'en' ? 'PT' : 'EN' }}
      </button>
    </div>
  </header>
</template>
