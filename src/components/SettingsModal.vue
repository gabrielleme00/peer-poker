<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  isOpen: boolean;
  tempSettings: {
    autoStart: boolean;
    timerType: 'NONE' | 'TRACKTIME' | 'COUNTDOWN';
    countdownSeconds: number;
    cardSystem: '1-10' | 'FIBONACCI' | 'DOUBLING' | 'CUSTOM';
    customCards: string;
  };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save'): void;
  (e: 'update:tempSettings', value: any): void;
}>();

const { t } = useI18n();

const updateSetting = (key: string, value: any) => {
  emit('update:tempSettings', { ...props.tempSettings, [key]: value });
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-neutral-900/40 dark:bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-8 animate-in zoom-in duration-200">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold text-neutral-900 dark:text-white">{{ t('room.settings') }}</h3>
        <button @click="emit('close')" class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
          <Plus class="w-6 h-6 rotate-45" />
        </button>
      </div>

      <div class="space-y-6">
        <!-- Auto Start -->
        <div class="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
          <div>
            <p class="text-sm font-bold text-neutral-700 dark:text-neutral-300">{{ t('settings.autoStart') }}</p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ t('settings.autoStartDesc') }}</p>
          </div>
          <input 
            :checked="tempSettings.autoStart"
            @change="updateSetting('autoStart', ($event.target as HTMLInputElement).checked)"
            type="checkbox"
            class="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-neutral-700"
          />
        </div>

        <!-- Timer Type -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('settings.timerMode') }}</label>
          <div class="grid grid-cols-3 gap-2">
            <button 
              v-for="mode in ['NONE', 'TRACKTIME', 'COUNTDOWN']" 
              :key="mode"
              @click="updateSetting('timerType', mode)"
              class="py-2 px-3 rounded-lg border text-xs font-bold transition-all"
              :class="tempSettings.timerType === mode ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-blue-400'"
            >
              {{ mode }}
            </button>
          </div>
        </div>

        <!-- Countdown Seconds -->
        <div v-if="tempSettings.timerType === 'COUNTDOWN'" class="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('settings.countdown') }}</label>
          <input 
            :value="tempSettings.countdownSeconds"
            @input="updateSetting('countdownSeconds', parseInt(($event.target as HTMLInputElement).value))"
            type="number" 
            class="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        <!-- Card System -->
        <div class="space-y-2">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('settings.cardSystem') }}</label>
          <select 
            :value="tempSettings.cardSystem"
            @change="updateSetting('cardSystem', ($event.target as HTMLSelectElement).value)"
            class="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          >
            <option value="1-10">1 to 10</option>
            <option value="FIBONACCI">Fibonacci (0, 1, 2, 3, 5, 8...)</option>
            <option value="DOUBLING">Doubling (1, 2, 4, 8, 16...)</option>
            <option value="CUSTOM">{{ t('settings.customList') }}</option>
          </select>
        </div>

        <!-- Custom Cards -->
        <div v-if="tempSettings.cardSystem === 'CUSTOM'" class="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <label class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ t('settings.customCards') }}</label>
          <input 
            :value="tempSettings.customCards"
            @input="updateSetting('customCards', ($event.target as HTMLInputElement).value)"
            type="text" 
            placeholder="XS, S, M, L, XL"
            class="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        <div class="flex space-x-3 pt-2">
          <button 
            @click="emit('close')"
            class="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-all"
          >
            {{ t('room.cancel') }}
          </button>
          <button 
            @click="emit('save')"
            class="flex-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
          >
            {{ t('room.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
