<template>
    <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-blue-600 mb-4">4. 보호자 및 인솔자</h2>
      
      <div class="mb-6">
        <h3 class="text-sm font-bold text-gray-800 mb-2 px-1 border-l-4 border-gray-800">보호자 정보</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" :value="modelValue.parentName" @input="update('parentName', $event.target.value)" placeholder="성명" :class="inputBaseClass" />
          <input type="text" :value="modelValue.parentRel" @input="update('parentRel', $event.target.value)" placeholder="관계" :class="inputBaseClass" />
          <input type="tel" :value="modelValue.parentPhone" @input="update('parentPhone', $event.target.value)" placeholder="연락처" :class="inputBaseClass" />
        </div>
      </div>
  
      <div>
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-sm font-bold text-gray-800 px-1 border-l-4 border-gray-800">인솔자 정보</h3>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="isSame" @change="sync" class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
            <span class="text-sm text-gray-600">보호자와 동일</span>
          </label>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select :value="modelValue.guideType" @change="update('guideType', $event.target.value)" :class="[inputBaseClass, 'bg-white']">
            <option value="parent">부모</option>
            <option value="grandparent">조부모</option>
            <option value="relative">친척</option>
            <option value="other">기타</option>
          </select>
          
          <input type="text" :value="modelValue.guideName" :readonly="isSame" @input="update('guideName', $event.target.value)" placeholder="인솔자 성명" 
                 :class="[inputBaseClass, isSame ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : '']" />
          
          <input type="tel" :value="modelValue.guidePhone" :readonly="isSame" @input="update('guidePhone', $event.target.value)" placeholder="인솔자 연락처" 
                 :class="[inputBaseClass, isSame ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : '']" />
        </div>
      </div>
    </section>
  </template>
  
  <script setup>
  import { ref, watch } from 'vue';
  
  const props = defineProps(['modelValue']);
  const emit = defineEmits(['update:modelValue']);
  const isSame = ref(true);
  
  const inputBaseClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors';
  
  const update = (key, val) => {
    const newData = { ...props.modelValue, [key]: val };
    emit('update:modelValue', newData);
  };
  
  const sync = () => {
    if (isSame.value) {
      emit('update:modelValue', {
        ...props.modelValue,
        guideName: props.modelValue.parentName,
        guidePhone: props.modelValue.parentPhone,
        guideType: 'parent'
      });
    }
  };
  
  watch(() => [props.modelValue.parentName, props.modelValue.parentPhone], () => {
    if(isSame.value) sync();
  });
  </script>