<script setup>
  import { ref, watch, onMounted } from 'vue';
  import { useSystemStore } from '../../stores/systemStore';
  import { AlertTriangle, Calendar, Clock } from 'lucide-vue-next';
  
  const props = defineProps(['modelValue']);
  const emit = defineEmits(['update:modelValue']);
  const store = useSystemStore();
  
  // 로컬 데이터 초기화 (tripType 기본값: domestic)
  const localData = ref({ 
    startPeriod: 'AM', 
    endPeriod: 'PM', 
    tripType: 'domestic', 
    totalDays: 0,
    isRuleChecked: false,
    ...props.modelValue 
  });
  
  const warningMessage = ref('');
  
  // 시스템 설정(공휴일, 한도) 로드 및 초기 계산
  onMounted(async () => {
    await store.fetchConfig();
    calculate();
  });
  
  // 공휴일 및 주말 체크 로직
  const isExemptDay = (d) => {
    const day = d.getDay();
    // 1. 주말 체크 (일:0, 토:6)
    if (day === 0 || day === 6) return true;
  
    // 2. 관리자 설정 공휴일 체크
    const dateStr = d.toISOString().split('T')[0];
    const holidays = store.config?.holidays || [];
    
    // 기본 공휴일(어린이날, 현충일 등) 예시 - 필요 시 systemStore에 통합 가능
    const FIXED_HOLIDAYS = ['2025-05-05', '2025-06-06', '2025-08-15', '2025-10-03', '2025-12-25'];
    
    const isSystemHoliday = holidays.some(h => dateStr >= h.start && dateStr <= h.end);
    const isFixedHoliday = FIXED_HOLIDAYS.includes(dateStr);
  
    return isSystemHoliday || isFixedHoliday;
  };
  
  // 타입이나 종류 변경 시 재계산
  const handleTypeChange = () => {
    calculate();
  };
  
  const calculate = () => {
    let days = 0;
  
    // 1. 반일 단위 (0.5일 고정)
    if (localData.value.type === 'half') {
      if (localData.value.startDate) {
        // 반일이라도 휴일이면 0일 처리할지 여부는 학교 규정에 따름 (여기선 날짜만 있으면 0.5 인정)
        days = 0.5;
      }
    } 
    // 2. 1일 단위 (기간 설정)
    else {
      if (!localData.value.startDate) {
        days = 0;
      } else {
        // 종료일이 없으면 시작일과 동일하게
        if (!localData.value.endDate) {
          localData.value.endDate = localData.value.startDate;
        }
        
        let curr = new Date(localData.value.startDate);
        const end = new Date(localData.value.endDate);
  
        // 역전 방지
        if(end < curr) {
          localData.value.endDate = localData.value.startDate;
          curr = new Date(localData.value.startDate);
        }
  
        // [순수 일자 계산] 주말/공휴일 제외
        let businessDayCount = 0;
        const calcEnd = new Date(localData.value.endDate);
        let loopDate = new Date(curr);
        
        while (loopDate <= calcEnd) {
          if (!isExemptDay(loopDate)) {
            businessDayCount++;
          }
          loopDate.setDate(loopDate.getDate() + 1);
        }
        days = businessDayCount;
  
        // [오전/오후 정밀 계산]
        // 해당 날짜가 휴일이 아닌 경우에만 차감 로직 적용
        if (days > 0) {
          // 시작일이 오후(PM)면 0.5 차감
          if (localData.value.startPeriod === 'PM' && !isExemptDay(new Date(localData.value.startDate))) {
            days -= 0.5;
          }
          // 종료일이 오전(AM)이면 0.5 차감
          if (localData.value.endPeriod === 'AM' && !isExemptDay(new Date(localData.value.endDate))) {
            days -= 0.5;
          }
        }
        
        if (days < 0) days = 0;
      }
    }
  
    // 값 업데이트
    if (localData.value.totalDays !== days) {
      localData.value.totalDays = days;
    }
    
    checkLimit(); // 한도 초과 확인
    update();     // 부모 컴포넌트로 전송
  };
  
  // 한도 초과 체크
  const checkLimit = () => {
    const limits = store.config?.limits || { domesticTrip: 7, overseasTrip: 30 };
    const limit = localData.value.tripType === 'overseas' ? limits.overseasTrip : limits.domesticTrip;
    
    if (localData.value.totalDays > limit) {
      warningMessage.value = `[경고] 연간 ${localData.value.tripType === 'overseas' ? '국외' : '국내'} 체험학습 가능 일수(${limit}일)를 초과했습니다.`;
    } else {
      warningMessage.value = '';
    }
  };
  
  // 부모에게 데이터 전송
  const update = () => {
    emit('update:modelValue', { ...localData.value });
  };
  
  // 부모 데이터가 변경되면 동기화
  watch(() => props.modelValue, (newVal) => {
    if (JSON.stringify(newVal) !== JSON.stringify(localData.value)) {
      localData.value = { ...newVal };
    }
  }, { deep: true });
  </script>
  
  <template>
    <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      
      <h2 class="text-lg font-semibold text-blue-600 mb-4 flex justify-between items-center">
        <span class="flex items-center gap-2"><Calendar class="w-5 h-5"/> 2. 체험학습 기간</span>
        
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-gray-500">구분:</span>
          <select 
            v-model="localData.tripType" 
            @change="handleTypeChange" 
            class="text-sm border border-gray-300 rounded px-2 py-1 font-bold text-gray-700 focus:outline-none focus:border-blue-500 bg-gray-50"
          >
            <option value="domestic">국내</option>
            <option value="overseas">국외</option>
          </select>
        </div>
      </h2>
      
      <div class="flex gap-6 mb-4 bg-gray-50 p-3 rounded-lg">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="daily" v-model="localData.type" @change="handleTypeChange" class="w-4 h-4 text-blue-600 focus:ring-blue-500" />
          <span class="text-sm font-bold text-gray-700">기간 설정 <span class="text-xs text-gray-500 font-normal">(1일 이상)</span></span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="half" v-model="localData.type" @change="handleTypeChange" class="w-4 h-4 text-blue-600 focus:ring-blue-500" />
          <span class="text-sm font-bold text-gray-700">0.5일 <span class="text-xs text-gray-500 font-normal">(반나절)</span></span>
        </label>
      </div>
  
      <div v-if="localData.type === 'daily'" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-xs font-bold text-gray-500 mb-1">시작일</label>
          <div class="flex gap-2">
            <input type="date" v-model="localData.startDate" @change="calculate" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            <select v-model="localData.startPeriod" @change="calculate" class="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold text-center">
              <option value="AM">오전</option>
              <option value="PM">오후</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 mb-1">종료일</label>
          <div class="flex gap-2">
            <input type="date" v-model="localData.endDate" :min="localData.startDate" @change="calculate" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            <select v-model="localData.endPeriod" @change="calculate" class="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold text-center">
              <option value="AM">오전</option>
              <option value="PM">오후</option>
            </select>
          </div>
        </div>
      </div>
  
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-xs font-bold text-gray-500 mb-1">날짜</label>
          <input type="date" v-model="localData.startDate" @change="calculate" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 mb-1">시간</label>
          <select v-model="localData.halfTime" @change="update" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm">
            <option value="AM">오전 (08:30 ~ 12:30)</option>
            <option value="PM">오후 (12:30 ~ 16:30)</option>
          </select>
        </div>
      </div>
  
      <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        <div class="flex items-center justify-between">
          <div class="flex flex-col">
            <span class="text-sm text-blue-700 font-bold">신청 일수 ({{ localData.tripType === 'overseas' ? '국외' : '국내' }})</span>
            <span class="text-xs text-blue-400 mt-1">* 주말 및 공휴일 자동 제외</span>
          </div>
          <div class="text-right">
            <span class="text-3xl font-extrabold text-blue-600">{{ localData.totalDays }}</span>
            <span class="text-sm font-bold text-blue-500 ml-1">일</span>
          </div>
        </div>
        
        <div v-if="warningMessage" class="mt-3 bg-red-50 border border-red-200 rounded p-2 flex items-start gap-2 animate-pulse">
          <AlertTriangle class="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div class="text-sm text-red-700 font-bold">
            {{ warningMessage }}
          </div>
        </div>
      </div>
  
      <div class="flex items-start gap-2 p-2 rounded hover:bg-gray-50 transition">
        <input id="ruleCheck" type="checkbox" v-model="localData.isRuleChecked" @change="update" class="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer" />
        <label for="ruleCheck" class="text-sm text-gray-700 cursor-pointer select-none">
          <span class="text-red-500 font-bold mr-1">[필수]</span>
          시험기간 등 학교에서 정한 <strong>불허 기간</strong>이 아님을 확인했습니다.
        </label>
      </div>
    </section>
  </template>