<template>
    <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-blue-600 mb-4">2. 체험학습 기간</h2>
      
      <div class="flex gap-6 mb-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="daily" v-model="localData.type" @change="handleTypeChange" class="w-4 h-4 text-blue-600 focus:ring-blue-500" />
          <span class="text-gray-700">1일 단위 <span class="text-xs text-gray-500">(하루 이상)</span></span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="half" v-model="localData.type" @change="handleTypeChange" class="w-4 h-4 text-blue-600 focus:ring-blue-500" />
          <span class="text-gray-700">반일 단위 <span class="text-xs text-gray-500">(0.5일)</span></span>
        </label>
      </div>
  
      <div v-if="localData.type === 'daily'" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">시작일</label>
          <input type="date" v-model="localData.startDate" @change="calculate" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">종료일</label>
          <input type="date" v-model="localData.endDate" :min="localData.startDate" @change="calculate" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
  
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">날짜</label>
          <input type="date" v-model="localData.startDate" @change="calculate" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">시간</label>
          <select v-model="localData.halfTime" @change="update" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="AM">오전 (08:30 ~ 12:30)</option>
            <option value="PM">오후 (12:30 ~ 16:30)</option>
          </select>
        </div>
      </div>
  
      <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between mb-4">
        <span class="text-sm text-blue-700 font-medium">총 출석인정 일수</span>
        <div class="text-right">
          <span class="text-2xl font-bold text-blue-600">{{ localData.totalDays }}일</span>
          <p class="text-xs text-blue-400">(주말/휴업일 제외)</p>
        </div>
      </div>
  
      <div class="flex items-start gap-2">
        <input id="ruleCheck" type="checkbox" v-model="localData.isRuleChecked" @change="update" class="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500" />
        <label for="ruleCheck" class="text-sm text-gray-700 cursor-pointer select-none">
          <span class="text-red-500 font-bold mr-1">[필수]</span>
          시험기간 등 학교에서 정한 <strong>불허 기간</strong>이 아님을 확인했습니다.
        </label>
      </div>
    </section>
  </template>
  
  <script setup>
  import { ref, watch } from 'vue';
  
  const props = defineProps(['modelValue']);
  const emit = defineEmits(['update:modelValue']);
  
  // 초기값 복사 (무한 루프 방지를 위해 객체 분해 할당)
  const localData = ref({ ...props.modelValue });
  const HOLIDAYS = ['2025-05-05', '2025-06-06']; 
  
  const isBusinessDay = (d) => {
    const day = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    return day !== 0 && day !== 6 && !HOLIDAYS.includes(dateStr);
  };
  
  const handleTypeChange = () => {
    calculate();
  };
  
  const calculate = () => {
    let days = 0;
  
    if (localData.value.type === 'half') {
      days = 0.5;
    } else {
      // 시작일이 없으면 0일
      if (!localData.value.startDate) {
        days = 0;
      } else {
        // 종료일이 없으면 시작일과 같게 설정 (UX 편의)
        if (!localData.value.endDate) {
          localData.value.endDate = localData.value.startDate;
        }
        
        let curr = new Date(localData.value.startDate);
        const end = new Date(localData.value.endDate);
  
        // 종료일이 시작일보다 빠르면 자동 보정
        if(end < curr) {
          localData.value.endDate = localData.value.startDate;
          curr = new Date(localData.value.startDate);
        }
  
        // 날짜 카운트
        let count = 0;
        const calcEnd = new Date(localData.value.endDate);
        while (curr <= calcEnd) {
          if (isBusinessDay(curr)) count++;
          curr.setDate(curr.getDate() + 1);
        }
        days = count;
      }
    }
  
    // 값이 실제로 변했을 때만 업데이트 (루프 방지 핵심)
    if (localData.value.totalDays !== days) {
      localData.value.totalDays = days;
    }
    update();
  };
  
  // 부모에게 변경 사항 알림
  const update = () => {
    emit('update:modelValue', { ...localData.value });
  };
  
  // [핵심 수정] 부모의 값이 변했을 때, 로컬 데이터와 다를 경우에만 반영
  watch(() => props.modelValue, (newVal) => {
    const isDifferent = 
      newVal.startDate !== localData.value.startDate ||
      newVal.endDate !== localData.value.endDate ||
      newVal.type !== localData.value.type;
  
    if (isDifferent) {
      localData.value = { ...newVal };
    }
  }, { deep: true });
  </script>