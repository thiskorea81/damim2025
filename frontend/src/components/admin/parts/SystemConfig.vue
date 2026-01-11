<script setup>
  import { ref, onMounted } from 'vue';
  import { useSystemStore } from '../../../stores/systemStore';
  import { Save, Plus, Trash2, ArrowUp, ArrowDown, Globe, Calendar, AlertTriangle } from 'lucide-vue-next';
  
  const store = useSystemStore();
  // 초기값 구조 잡기 (holidays 배열이 없으면 빈 배열로 초기화)
  const localConfig = ref({
    domain: '',
    limits: { menstrual: 1, domesticTrip: 7, overseasTrip: 30 },
    approvalLine: [],
    holidays: [] 
  });
  
  // 공휴일 입력 임시 변수
  const newHoliday = ref({
    label: '',
    startDate: '',
    endDate: '',
    isRange: false
  });
  
  onMounted(async () => {
    await store.fetchConfig();
    // 깊은 복사로 반응성 끊기
    localConfig.value = JSON.parse(JSON.stringify({
      ...store.config,
      holidays: store.config.holidays || [], // 기존 데이터 없으면 빈배열
      limits: { 
        menstrual: 1, domesticTrip: 7, overseasTrip: 30, // 기본값 보장
        ...store.config.limits 
      }
    }));
  });
  
  // 결재 라인 관련 함수 (기존 유지)
  const addApprovalStep = () => { localConfig.value.approvalLine.push({ role: '', label: '', isFinal: false }); };
  const removeApprovalStep = (index) => { localConfig.value.approvalLine.splice(index, 1); };
  const moveStep = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= localConfig.value.approvalLine.length) return;
    const temp = localConfig.value.approvalLine[index];
    localConfig.value.approvalLine[index] = localConfig.value.approvalLine[newIndex];
    localConfig.value.approvalLine[newIndex] = temp;
  };
  
  // [신규] 공휴일 추가 함수
  const addHoliday = () => {
    if (!newHoliday.value.startDate) return alert('시작 날짜를 선택해주세요.');
    
    // 종료일이 없거나 범위가 아니면 시작일과 동일하게
    const end = (newHoliday.value.isRange && newHoliday.value.endDate) 
      ? newHoliday.value.endDate 
      : newHoliday.value.startDate;
  
    if (newHoliday.value.startDate > end) return alert('종료일이 시작일보다 빠를 수 없습니다.');
  
    localConfig.value.holidays.push({
      label: newHoliday.value.label || '공휴일',
      start: newHoliday.value.startDate,
      end: end
    });
  
    // 입력창 초기화
    newHoliday.value = { label: '', startDate: '', endDate: '', isRange: false };
  };
  
  const removeHoliday = (index) => {
    localConfig.value.holidays.splice(index, 1);
  };
  
  const handleSave = () => { store.saveConfig(localConfig.value); };
  </script>
  
  <template>
    <div class="config-container">
      <h3 class="title">시스템 설정</h3>
  
      <div class="section">
        <h4 class="sub-title"><Globe class="w-4 h-4 mr-1 inline"/> 학교 기본 정보</h4>
        <div class="input-group">
          <label>학교 이메일 도메인</label>
          <input type="text" v-model="localConfig.domain" placeholder="예: school.kr" class="input-base flex-1" />
        </div>
      </div>
  
      <div class="section">
        <h4 class="sub-title"><AlertTriangle class="w-4 h-4 mr-1 inline"/> 인정결석 및 체험학습 한도 설정</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="input-group">
            <label>인정결석(생리통)/월</label>
            <input type="number" v-model="localConfig.limits.menstrual" class="input-base w-full text-right" />
            <span class="unit">일</span>
          </div>
          <div class="input-group">
            <label>국내 체험학습/연</label>
            <input type="number" v-model="localConfig.limits.domesticTrip" class="input-base w-full text-right" />
            <span class="unit">일</span>
          </div>
          <div class="input-group">
            <label>국외 체험학습/연</label>
            <input type="number" v-model="localConfig.limits.overseasTrip" class="input-base w-full text-right" />
            <span class="unit">일</span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-2">* 학년도(3월 1일 ~ 다음해 2월 28일) 기준으로 적용됩니다.</p>
      </div>
  
      <div class="section">
        <h4 class="sub-title"><Calendar class="w-4 h-4 mr-1 inline"/> 공휴일 및 재량휴업일 제외 설정</h4>
        <p class="text-xs text-gray-500 mb-4">체험학습 기간 산정 시 제외할 공휴일, 방학, 재량휴업일을 등록하세요.</p>
        
        <div class="flex flex-col md:flex-row gap-2 items-end bg-gray-50 p-3 rounded-lg border mb-4">
          <div class="flex-1 w-full">
            <span class="text-xs font-bold text-gray-600">명칭</span>
            <input type="text" v-model="newHoliday.label" placeholder="예: 겨울방학, 개교기념일" class="input-base w-full">
          </div>
          
          <div class="flex items-center gap-2">
            <div>
              <span class="text-xs font-bold text-gray-600">시작일</span>
              <input type="date" v-model="newHoliday.startDate" class="input-base">
            </div>
            
            <div v-if="newHoliday.isRange">
              <span class="text-xs font-bold text-gray-600">종료일</span>
              <input type="date" v-model="newHoliday.endDate" :min="newHoliday.startDate" class="input-base">
            </div>
          </div>
  
          <div class="flex items-center h-10 px-2">
            <label class="flex items-center gap-1 cursor-pointer select-none">
              <input type="checkbox" v-model="newHoliday.isRange" class="w-4 h-4 text-blue-600">
              <span class="text-sm">기간설정</span>
            </label>
          </div>
  
          <button @click="addHoliday" class="btn-small bg-indigo-50 text-indigo-600 h-10 w-full md:w-auto justify-center">
            <Plus class="w-4 h-4 mr-1"/>추가
          </button>
        </div>
  
        <div class="holiday-list max-h-48 overflow-y-auto space-y-1">
          <div v-if="localConfig.holidays.length === 0" class="text-center text-sm text-gray-400 py-4">등록된 휴일이 없습니다.</div>
          <div v-for="(h, idx) in localConfig.holidays" :key="idx" class="holiday-item flex justify-between items-center bg-white p-2 rounded border text-sm">
            <div>
              <span class="font-bold text-gray-700 mr-2">{{ h.label }}</span>
              <span class="text-gray-500">{{ h.start }} <span v-if="h.start !== h.end">~ {{ h.end }}</span></span>
            </div>
            <button @click="removeHoliday(idx)" class="text-red-400 hover:text-red-600"><Trash2 class="w-4 h-4"/></button>
          </div>
        </div>
      </div>
  
      <div class="section">
        <div class="flex justify-between items-end mb-2">
          <h4 class="sub-title">📝 결재 라인 관리</h4>
          <button @click="addApprovalStep" class="btn-small"><Plus class="w-4 h-4 mr-1"/>추가</button>
        </div>
        <div class="approval-list">
          <div v-for="(step, index) in localConfig.approvalLine" :key="index" class="approval-item">
            <span class="step-num">{{ index + 1 }}</span>
            <input type="text" v-model="step.label" placeholder="직책" class="input-base w-32" />
            <label class="flex items-center gap-2 ml-4 cursor-pointer">
              <input type="checkbox" v-model="step.isFinal" class="w-4 h-4" />
              <span class="text-sm font-bold text-blue-600">전결 가능</span>
            </label>
            <div class="ml-auto flex gap-1">
              <button @click="moveStep(index, -1)" class="icon-btn"><ArrowUp class="w-4 h-4"/></button>
              <button @click="moveStep(index, 1)" class="icon-btn"><ArrowDown class="w-4 h-4"/></button>
              <button @click="removeApprovalStep(index)" class="icon-btn delete"><Trash2 class="w-4 h-4"/></button>
            </div>
          </div>
        </div>
      </div>
  
      <div class="mt-6 flex justify-end">
        <button @click="handleSave" class="btn-save"><Save class="w-5 h-5 mr-2"/> 설정 저장하기</button>
      </div>
    </div>
  </template>
  
  <style scoped>
  .config-container { padding: 1rem; max-width: 800px; margin: 0 auto; }
  .title { font-size: 1.5rem; font-weight: 800; color: #1f2937; margin-bottom: 1.5rem; }
  .section { background: #ffffff; padding: 1.5rem; border-radius: 0.75rem; border: 1px solid #e5e7eb; margin-bottom: 1.5rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
  .sub-title { font-size: 1rem; font-weight: 700; color: #374151; margin-bottom: 1rem; display: flex; align-items: center; }
  .input-group { display: flex; align-items: center; gap: 0.5rem; }
  .input-group label { font-size: 0.85rem; font-weight: 600; color: #6b7280; width: 150px; }
  .input-base { border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem; outline: none; transition: border-color 0.15s; }
  .input-base:focus { border-color: #3b82f6; ring: 2px solid #3b82f6; }
  .unit { font-size: 0.85rem; color: #6b7280; }
  .approval-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .approval-item { display: flex; align-items: center; background: white; padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; }
  .step-num { width: 24px; height: 24px; background: #4b5563; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; margin-right: 1rem; }
  .btn-small { padding: 0.4rem 0.8rem; border-radius: 0.375rem; font-size: 0.85rem; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; background: #eff6ff; color: #2563eb; }
  .btn-save { background: #2563eb; color: white; padding: 0.75rem 2rem; border-radius: 0.5rem; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; font-size: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
  .btn-save:hover { background: #1d4ed8; }
  .icon-btn { padding: 0.4rem; border-radius: 0.25rem; border: none; cursor: pointer; background: #f3f4f6; color: #6b7280; }
  .icon-btn:hover { background: #e5e7eb; }
  .icon-btn.delete { color: #ef4444; background: #fef2f2; }
  .icon-btn.delete:hover { background: #fee2e2; }
  </style>