<template>
    <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2">
        1. 학생 정보
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">성명</label>
          <input 
            type="text" 
            :value="modelValue.name" 
            readonly 
            class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed focus:outline-none"
          />
        </div>
  
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">학번</label>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <input type="number" :value="modelValue.grade" readonly class="w-full px-2 py-2 bg-gray-100 border border-gray-300 rounded-lg text-center text-gray-500" />
              <span class="absolute right-1 top-2 text-xs text-gray-400">학년</span>
            </div>
            <div class="relative flex-1">
              <input type="number" :value="modelValue.class" readonly class="w-full px-2 py-2 bg-gray-100 border border-gray-300 rounded-lg text-center text-gray-500" />
              <span class="absolute right-1 top-2 text-xs text-gray-400">반</span>
            </div>
            <div class="relative flex-1">
              <input type="number" :value="modelValue.number" readonly class="w-full px-2 py-2 bg-gray-100 border border-gray-300 rounded-lg text-center text-gray-500" />
              <span class="absolute right-1 top-2 text-xs text-gray-400">번</span>
            </div>
          </div>
        </div>
  
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">연락처</label>
          <input 
            type="tel" 
            :value="modelValue.phone" 
            @input="$emit('update:modelValue', {...modelValue, phone: $event.target.value})" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
          />
        </div>
      </div>
    </section>
  </template>
  
  <script setup>
  defineProps(['modelValue']);
  defineEmits(['update:modelValue']);
  </script>