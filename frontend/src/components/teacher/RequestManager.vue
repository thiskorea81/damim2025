<script setup>
  import { ref, computed } from 'vue';
  import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
  import { db } from '../../firebase';
  import { Clock, GitPullRequest } from 'lucide-vue-next';
  import { calculateBytes } from '../../utils/byteCalculator';
  
  // 분리된 컴포넌트 임포트
  import AiRequestView from './request/AiRequestView.vue';
  import ManualEditor from './request/ManualEditor.vue';
  
  const props = defineProps(['records', 'mainMode']);
  const emit = defineEmits(['refresh']);
  
  const selectedRecordId = ref(null);
  const showManualEditor = ref(false); // 모달 표시 여부
  
  const CREATIVE_KEYWORDS = ['자율', '진로', '동아리', '행동'];
  
  // 필터링 로직
  const filteredRecords = computed(() => {
    return props.records.filter(r => {
      const isCreative = CREATIVE_KEYWORDS.some(k => r.category && r.category.includes(k));
      if (props.mainMode === 'creative' && !isCreative) return false;
      if (props.mainMode === 'subject' && isCreative) return false;
      return true;
    });
  });
  
  // 대기열 로직
  const requestQueue = computed(() => {
    return filteredRecords.value.filter(r => r.status === 'request_modify' || r.status === 'submitted');
  });
  
  const selectedRecord = computed(() => {
    return props.records.find(r => r.id === selectedRecordId.value);
  });
  
  // --- 직접 수정 저장 로직 (모달에서 호출) ---
  const handleManualSave = async (newContent) => {
    const record = selectedRecord.value;
    if (!record) return;
  
    if (!confirm("수정 내용을 저장하고 요청을 완료 처리하시겠습니까?")) return;
  
    try {
      let currentHistory = record.history || [];
      // 초기화 방어
      if (currentHistory.length === 0) {
        currentHistory = [{
          version: 1, actor: 'teacher', action: 'legacy_init',
          content: record.content || '', timestamp: new Date().toISOString(),
          byteSize: calculateBytes(record.content || ''), summary: '초기 원본'
        }];
      }
      
      const lastHistory = currentHistory[currentHistory.length - 1];
      
      const newVersion = {
        version: (lastHistory?.version || 1) + 1,
        actor: 'teacher', 
        action: 'manual_revision',
        content: newContent,
        timestamp: new Date().toISOString(),
        byteSize: calculateBytes(newContent),
        summary: '선생님 직접 수정 반영',
        relatedRequest: record.studentFeedback || record.requirements
      };
  
      await updateDoc(doc(db, 'student_records', record.id), {
        content: newContent,
        history: [...currentHistory, newVersion],
        status: 'modified_by_teacher',
        hasFeedback: false,
        studentFeedback: null,
        updatedAt: serverTimestamp()
      });
  
      showManualEditor.value = false; // 모달 닫기
      emit('refresh');
      // alert("저장되었습니다."); // (선택) 너무 잦은 알림 방지
  
    } catch (e) {
      console.error(e);
      alert("저장 실패: " + e.message);
    }
  };
  </script>
  
  <template>
    <div class="flex flex-col md:flex-row gap-4 h-full">
        
      <div class="w-full md:w-72 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden shrink-0">
        <div class="p-3 border-b bg-gray-50 flex justify-between items-center">
          <h3 class="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Clock class="w-4 h-4 text-indigo-600" /> 대기열 <span class="text-xs text-gray-400">({{ mainMode === 'creative' ? '창체' : '교과' }})</span>
          </h3>
          <span class="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{{ requestQueue.length }}</span>
        </div>
        
        <div class="flex-1 overflow-y-auto p-2 space-y-2">
          <div v-if="requestQueue.length === 0" class="text-center py-10 text-gray-400 text-xs">대기 중인 요청이 없습니다.</div>
          <button 
            v-for="rec in requestQueue" 
            :key="rec.id"
            @click="selectedRecordId = rec.id"
            class="w-full text-left p-3 rounded-lg border transition hover:shadow-sm relative"
            :class="selectedRecordId === rec.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-100 bg-white'"
          >
            <div class="flex justify-between items-start mb-1">
              <span class="font-bold text-gray-800 text-xs">{{ rec.studentId }} {{ rec.name }}</span>
              <span class="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">{{ rec.category }}</span>
            </div>
            <p class="text-[11px] text-gray-500 line-clamp-1 overflow-hidden text-ellipsis">
              {{ rec.studentFeedback || rec.requirements || '요청사항 없음' }}
            </p>
            <span class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500"></span>
          </button>
        </div>
      </div>
  
      <div class="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
        <div v-if="!selectedRecord" class="flex-1 flex flex-col items-center justify-center text-gray-400">
          <GitPullRequest class="w-12 h-12 text-gray-200 mb-3" />
          <p class="text-sm">학생을 선택하세요.</p>
        </div>
  
        <AiRequestView 
          v-else
          :record="selectedRecord"
          @refresh="$emit('refresh')"
          @open-manual="showManualEditor = true"
        />
      </div>
  
      <ManualEditor
        v-if="showManualEditor && selectedRecord"
        :initialContent="selectedRecord.content"
        :studentName="selectedRecord.name"
        @close="showManualEditor = false"
        @save="handleManualSave"
      />
  
    </div>
  </template>