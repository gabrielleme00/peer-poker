<script setup lang="ts">
import { Users, Sun, Moon } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

defineProps<{
  name: string;
  isManager: boolean;
  roomIdInput: string;
  roomTitleInput: string;
  isConnecting: boolean;
  error: string;
  isDarkMode: boolean;
  locale: string;
}>();

const emit = defineEmits<{
  (e: 'update:name', value: string): void;
  (e: 'update:isManager', value: boolean): void;
  (e: 'update:roomIdInput', value: string): void;
  (e: 'update:roomTitleInput', value: string): void;
  (e: 'createRoom'): void;
  (e: 'joinRoom'): void;
  (e: 'toggleDarkMode'): void;
  (e: 'toggleLanguage'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex items-center justify-center min-h-screen p-6">
    <div class="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl shadow-blue-900/5 dark:shadow-none border border-neutral-200 dark:border-neutral-800 p-8">
      <div class="flex justify-end mb-4 space-x-4">
        <button 
          @click="emit('toggleDarkMode')" 
          class="text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          :title="t('room.darkMode')"
        >
          <component :is="isDarkMode ? Sun : Moon" class="w-5 h-5" />
        </button>
        <button 
          @click="emit('toggleLanguage')" 
          class="text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-widest"
        >
          {{ locale === 'en' ? 'PT' : 'EN' }}
        </button>
      </div>
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 text-white shadow-lg shadow-blue-600/20">
          <Users class="w-8 h-8" />
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{{ t('welcome.title') }}</h1>
        <p class="text-neutral-500 dark:text-neutral-400 mt-2">{{ t('welcome.subtitle') }}</p>
      </div>

      <div class="space-y-6">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('welcome.yourName') }}</label>
          <input 
            :value="name" 
            @input="emit('update:name', ($event.target as HTMLInputElement).value)"
            type="text" 
            :placeholder="t('welcome.enterName')"
            class="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none dark:text-white"
          />
        </div>

        <div class="flex items-center space-x-3 p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
          <input 
            id="manager-toggle"
            :checked="isManager" 
            @change="emit('update:isManager', ($event.target as HTMLInputElement).checked)"
            type="checkbox"
            class="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-neutral-700"
          />
          <label for="manager-toggle" class="text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
            {{ t('welcome.isManager') }}
          </label>
        </div>

        <div v-if="isManager" class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('welcome.roomTitle') }}</label>
            <input 
              :value="roomTitleInput" 
              @input="emit('update:roomTitleInput', ($event.target as HTMLInputElement).value)"
              type="text" 
              :placeholder="t('welcome.roomTitlePlaceholder')"
              class="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none dark:text-white"
            />
          </div>
          <button 
            @click="emit('createRoom')"
            :disabled="isConnecting"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {{ isConnecting ? t('welcome.creating') : t('welcome.createRoom') }}
          </button>
        </div>

        <div v-else class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('welcome.roomId') }}</label>
            <input 
              :value="roomIdInput" 
              @input="emit('update:roomIdInput', ($event.target as HTMLInputElement).value)"
              type="text" 
              :placeholder="t('welcome.pasteId')"
              class="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none dark:text-white"
            />
          </div>
          <button 
            @click="emit('joinRoom')"
            :disabled="isConnecting"
            class="w-full py-3 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-bold rounded-xl shadow-lg shadow-neutral-900/10 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {{ isConnecting ? t('welcome.joining') : t('welcome.joinRoom') }}
          </button>
        </div>

        <p v-if="error" class="text-red-500 text-sm text-center font-medium">{{ error }}</p>
      </div>
    </div>
  </div>
</template>
