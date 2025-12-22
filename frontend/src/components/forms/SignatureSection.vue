<template>
    <section class="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <p class="font-bold text-gray-800 text-lg mb-2">
        위와 같이 「학교장허가 교외체험학습」을 신청합니다.
      </p>
      <p class="text-gray-500 mb-8">{{ today }}</p>
  
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        
        <div class="flex flex-col items-center">
          <label class="block text-sm font-bold text-gray-700 mb-2">보호자 서명</label>
          
          <div class="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 mb-3">
            <SignaturePad 
              v-model="localParentSignImage" 
              @endStroke="$emit('update:parentSignImage', localParentSignImage)"
            />
          </div>
  
          <div class="flex items-end justify-center gap-2 w-full">
            <span class="font-bold text-gray-700 w-16 text-right pb-1">성 명</span>
            <input 
              type="text" 
              :value="parentSign" 
              @input="$emit('update:parentSign', $event.target.value)" 
              placeholder="보호자 성명" 
              class="w-32 text-center border-b-2 border-gray-300 pb-1 focus:border-blue-600 focus:outline-none transition-colors bg-transparent"
            />
            <span class="text-gray-400 pb-1">(인)</span>
          </div>
        </div>
  
        <div class="flex flex-col items-center">
          <label class="block text-sm font-bold text-gray-700 mb-2">학생 서명</label>
          
          <div class="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 mb-3">
             <SignaturePad 
              v-model="localStudentSignImage" 
              @endStroke="$emit('update:studentSignImage', localStudentSignImage)"
            />
          </div>
  
          <div class="flex items-end justify-center gap-2 w-full">
            <span class="font-bold text-gray-700 w-16 text-right pb-1">성 명</span>
            <input 
              type="text" 
              :value="studentSign" 
              @input="$emit('update:studentSign', $event.target.value)" 
              placeholder="학생 성명" 
              class="w-32 text-center border-b-2 border-gray-300 pb-1 focus:border-blue-600 focus:outline-none transition-colors bg-transparent"
            />
            <span class="text-gray-400 pb-1">(인)</span>
          </div>
        </div>
      </div>
  
      <button 
        @click="$emit('submit')"
        class="w-full md:w-auto px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
      >
        <CheckCircle class="w-5 h-5" />
        신청서 제출하기
      </button>
    </section>
  </template>
  
  <script setup>
  import { ref, watch } from 'vue';
  import { CheckCircle } from 'lucide-vue-next';
  import SignaturePad from '../SignaturePad.vue'; // 경로 확인 필요
  
  const props = defineProps(['parentSign', 'studentSign', 'parentSignImage', 'studentSignImage']);
  const emit = defineEmits(['update:parentSign', 'update:studentSign', 'update:parentSignImage', 'update:studentSignImage', 'submit']);
  
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // 로컬 상태로 서명 이미지 관리 (v-model 연동)
  const localParentSignImage = ref(props.parentSignImage);
  const localStudentSignImage = ref(props.studentSignImage);
  
  watch(() => props.parentSignImage, (newVal) => localParentSignImage.value = newVal);
  watch(() => props.studentSignImage, (newVal) => localStudentSignImage.value = newVal);
  </script>