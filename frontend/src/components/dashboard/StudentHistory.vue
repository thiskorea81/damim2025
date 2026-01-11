<script setup>
  import { ref } from 'vue';
  import { FileText, Plane, FileCheck } from 'lucide-vue-next';
  
  // 하위 컴포넌트
  import AbsenceHistoryList from './history/AbsenceHistoryList.vue'; 
  import TripHistoryList from './history/TripHistoryList.vue';
  import ReportHistoryList from './history/ReportHistoryList.vue';
  
  // [중요] 공통 출력 유틸리티 임포트
  import { printDocument } from '../../utils/printUtils';
  
  const props = defineProps({
    user: Object
  });
  const emit = defineEmits(['edit']);
  
  const currentTab = ref('absence');
  
  // [수정] 학생용 통보서 출력 함수 (printUtils 활용)
  const handlePrintNotification = (item) => {
    // item에는 DB에서 불러온 teacherSignature가 이미 들어있습니다.
    
    // printUtils는 두 번째 인자로 teacherData(교사정보객체)를 원하므로,
    // 문서에 저장된 교사 이름(teacherName)을 임시 객체로 만들어 전달합니다.
    const mockTeacherData = {
      name: item.teacherName || '담임교사' 
    };
  
    // 문서 타입 명시 (체험학습)
    const docData = {
      ...item,
      type: '체험학습'
    };
  
    // 공통 출력 함수 호출 (신청서+통보서가 세트로 출력됨)
    printDocument(docData, mockTeacherData);
  };
  
  const handleEdit = (item) => {
    emit('edit', item);
  };
  </script>
  
  <template>
    <div class="flex gap-0 bg-transparent">
      
      <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 z-10 min-h-[500px]">
        
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
          @print-notification="handlePrintNotification" 
          class="h-full"
        />
  
        <ReportHistoryList
          v-if="currentTab === 'report'"
          :user="user"
          @edit="handleEdit"
          class="h-full"
        />
        
      </div>
  
      <div class="flex flex-col gap-2 pt-8 -ml-1 z-0">
        <button @click="currentTab = 'absence'" class="tab-btn" :class="currentTab === 'absence' ? 'active text-blue-600' : 'inactive'">
          <FileText class="w-5 h-5 rotate-0" /><span class="rotate-0">결석</span>
        </button>
        <button @click="currentTab = 'trip'" class="tab-btn" :class="currentTab === 'trip' ? 'active text-green-600' : 'inactive'">
          <Plane class="w-5 h-5 rotate-0" /><span class="rotate-0">체험</span>
        </button>
        <button @click="currentTab = 'report'" class="tab-btn" :class="currentTab === 'report' ? 'active text-purple-600' : 'inactive'">
          <FileCheck class="w-5 h-5 rotate-0" /><span class="rotate-0">결과</span>
        </button>
      </div>
    </div>
  </template>
  
  <style scoped>
  .tab-btn { width: 3rem; padding: 1.5rem 0; border-radius: 0 0.75rem 0.75rem 0; border-top: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transition: all 0.2s; font-size: 0.75rem; font-weight: 700; writing-mode: vertical-rl; text-orientation: upright; letter-spacing: 0.1em; }
  .active { background: white; border-left: 4px solid white; transform: translateX(4px); box-shadow: none; z-index: 20; }
  .inactive { background: #f3f4f6; color: #9ca3af; }
  .inactive:hover { background: #f9fafb; }
  </style>