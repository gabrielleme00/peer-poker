<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { Task } from '../types';

const props = defineProps<{
  isOpen: boolean;
  isBatchMode: boolean;
  isEditing: boolean;
  editingTask: Partial<Task>;
  batchTitles: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save'): void;
  (e: 'update:batchTitles', value: string): void;
  (e: 'update:editingTask', value: Partial<Task>): void;
}>();

const { t } = useI18n();

const updateBatchTitles = (e: Event) => {
  emit('update:batchTitles', (e.target as HTMLTextAreaElement).value);
};

const updateTaskTitle = (e: Event) => {
  emit('update:editingTask', { ...props.editingTask, title: (e.target as HTMLInputElement).value });
};

const updateTaskDescription = (e: Event) => {
  emit('update:editingTask', { ...props.editingTask, description: (e.target as HTMLTextAreaElement).value });
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-neutral-900/40 dark:bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-8 animate-in zoom-in duration-200">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold text-neutral-900 dark:text-white">
          {{ isBatchMode ? t('tasks.batchTitle') : (isEditing ? t('tasks.editTitle') : t('tasks.addTitle')) }}
        </h3>
        <button @click="emit('close')" class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
          <Plus class="w-6 h-6 rotate-45" />
        </button>
      </div>

      <div class="space-y-6">
        <div v-if="isBatchMode" class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('tasks.batchPlaceholder') }}</label>
          <textarea 
            :value="batchTitles" 
            @input="updateBatchTitles"
            :placeholder="t('tasks.batchPlaceholder')"
            rows="6"
            class="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none dark:text-white"
          ></textarea>
        </div>

        <template v-else>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('tasks.titleLabel') }}</label>
            <input 
              :value="editingTask.title" 
              @input="updateTaskTitle"
              type="text" 
              :placeholder="t('tasks.titlePlaceholder')"
              class="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none dark:text-white"
              @keyup.enter="emit('save')"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('tasks.descLabel') }}</label>
            <textarea 
              :value="editingTask.description" 
              @input="updateTaskDescription"
              :placeholder="t('tasks.descPlaceholder')"
              rows="3"
              class="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none dark:text-white"
            ></textarea>
          </div>
        </template>

        <div class="flex space-x-3 pt-2">
          <button 
            @click="emit('close')"
            class="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all"
          >
            {{ t('room.cancel') }}
          </button>
          <button 
            @click="emit('save')"
            :disabled="isBatchMode ? !batchTitles.trim() : !editingTask.title"
            class="flex-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {{ isBatchMode ? t('tasks.addTasks') : (isEditing ? t('tasks.saveTask') : t('tasks.saveTask')) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
