<script setup>
  import { ref } from 'vue';
  import { FileText, Plane } from 'lucide-vue-next';
  
  // 하위 컴포넌트 임포트 (경로 확인 필수)
  import AbsenceHistoryList from './history/AbsenceHistoryList.vue'; 
  import TripHistoryList from './history/TripHistoryList.vue';
  
  const props = defineProps({
    user: Object
  });
  const emit = defineEmits(['edit']);
  
  const currentTab = ref('absence'); // 'absence' | 'trip'
  
  const handleEdit = (item) => {
    emit('edit', item);
  };
  </script>
  
  <template>
    <div class="flex gap-0 bg-transparent">
      <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-2 z-10 min-h-[500px]">
        
        <AbsenceHistoryList 
          v-if="currentTab === 'absence'" 
          :user="user" 
          @edit="handleEdit" 
          class="h-full"
        />
  
        <TripHistoryList 
          v-if="currentTab === 'trip'" 
          :user="user" 
          @edit="handleEdit"
          class="h-full"
        />
        
      </div>
  
      <div class="flex flex-col gap-2 pt-8 -ml-1 z-0">
        
        <button 
          @click="currentTab = 'absence'"
          class="w-12 py-6 rounded-r-xl border-y border-r border-gray-200 flex flex-col items-center justify-center gap-2 transition-all duration-200 shadow-sm font-bold text-xs writing-vertical"
          :class="currentTab === 'absence' ? 'bg-white text-blue-600 border-l-white translate-x-1 shadow-none z-20' : 'bg-gray-100 text-gray-400 hover:bg-gray-50'"
        >
          <FileText class="w-5 h-5 rotate-0" />
          <span class="rotate-0">결석</span>
        </button>
  
        <button 
          @click="currentTab = 'trip'"
          class="w-12 py-6 rounded-r-xl border-y border-r border-gray-200 flex flex-col items-center justify-center gap-2 transition-all duration-200 shadow-sm font-bold text-xs writing-vertical"
          :class="currentTab === 'trip' ? 'bg-white text-green-600 border-l-white translate-x-1 shadow-none z-20' : 'bg-gray-100 text-gray-400 hover:bg-gray-50'"
        >
          <Plane class="w-5 h-5 rotate-0" />
          <span class="rotate-0">체험</span>
        </button>
  
      </div>
    </div>
  </template>
  
  <style scoped>
  /* 세로 쓰기용 (Tailwind 미지원 시 대비) */
  .writing-vertical {
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 0.1em;
  }
  </style>