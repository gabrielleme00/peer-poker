<script setup lang="ts">
import { Plus, Download } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { RoomState } from '../types';

defineProps<{
  isOpen: boolean;
  state: RoomState;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'download'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-neutral-900/40 dark:bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-8 animate-in zoom-in duration-200 flex flex-col max-h-[80vh]">
      <div class="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h3 class="text-xl font-bold text-neutral-900 dark:text-white">{{ t('room.summary') }}</h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ state.title }}</p>
        </div>
        <button @click="emit('close')" class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
          <Plus class="w-6 h-6 rotate-45" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto min-h-0 mb-6 border border-neutral-100 dark:border-neutral-800 rounded-xl">
        <table class="w-full text-left border-collapse">
          <thead class="bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
            <tr>
              <th class="px-4 py-3 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">{{ t('room.tasks') }}</th>
              <th class="px-4 py-3 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">{{ t('room.score') }}</th>
              <th class="px-4 py-3 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">{{ t('room.status') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-50 dark:divide-neutral-800">
            <tr v-for="task in state.tasks" :key="task.id" class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
              <td class="px-4 py-3">
                <p class="text-sm font-bold text-neutral-900 dark:text-white">{{ task.title }}</p>
                <p v-if="task.description" class="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-xs">{{ task.description }}</p>
              </td>
              <td class="px-4 py-3">
                <span v-if="task.finalScore" class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg">
                  {{ task.finalScore }}
                </span>
                <span v-else class="text-xs text-neutral-400 dark:text-neutral-500">-</span>
              </td>
              <td class="px-4 py-3">
                <span 
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  :class="task.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'"
                >
                  {{ task.status === 'completed' ? t('room.completed') : t('room.pending') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex space-x-3 pt-2 shrink-0">
        <button 
          @click="emit('close')"
          class="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all"
        >
          {{ t('room.close') }}
        </button>
        <button 
          @click="emit('download')"
          class="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center"
        >
          <Download class="w-5 h-5 mr-2" />
          {{ t('room.downloadCsv') }}
        </button>
      </div>
    </div>
  </div>
</template>
