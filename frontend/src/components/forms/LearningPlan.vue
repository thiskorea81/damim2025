<template>
    <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-blue-600 mb-4">3. 학습 계획</h2>
      
      <div class="mb-5">
        <label class="block text-sm font-medium text-gray-700 mb-2">학습 형태</label>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label 
            v-for="type in types" 
            :key="type.val" 
            class="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50 transition-colors"
            :class="modelValue.type === type.val ? 'border-blue-400 bg-blue-50' : 'border-gray-200'"
          >
            <input 
              type="radio" 
              :value="type.val" 
              :checked="modelValue.type === type.val" 
              @change="update('type', type.val)"
              class="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">{{ type.label }}</span>
          </label>
        </div>
        
        <input 
          v-if="modelValue.type === 'other'" 
          type="text" 
          :value="modelValue.typeDetail"
          @input="update('typeDetail', $event.target.value)" 
          placeholder="구체적인 사유를 입력하세요" 
          class="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      </div>
  
      <div class="mb-5">
        <label class="block text-sm font-medium text-gray-700 mb-1">체험 장소</label>
        <input 
          type="text" 
          :value="modelValue.location" 
          @input="update('location', $event.target.value)" 
          placeholder="예: 경주 불국사, 서울 국립중앙박물관" 
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">상세 계획</label>
        <textarea 
          :value="modelValue.detail" 
          @input="update('detail', $event.target.value)" 
          rows="4" 
          placeholder="체험학습을 통해 무엇을 보고 배울 것인지 구체적으로 작성해주세요."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y"
        ></textarea>
      </div>
    </section>
  </template>
  
  <script setup>
  const props = defineProps(['modelValue']);
  const emit = defineEmits(['update:modelValue']);
  
  const types = [
    { val: 'field', label: '현장체험' }, { val: 'visit', label: '친인척방문' },
    { val: 'family_trip', label: '가족여행' }, { val: 'history', label: '유적답사' },
    { val: 'home', label: '가정학습(심각)' }, { val: 'other', label: '기타' }
  ];
  
  const update = (key, val) => {
    emit('update:modelValue', { ...props.modelValue, [key]: val });
  };
  </script>