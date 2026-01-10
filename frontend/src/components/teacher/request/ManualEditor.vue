<script setup>
    import { ref, computed } from 'vue';
    import { Save, X, Edit } from 'lucide-vue-next';
    import { calculateBytes } from '../../../utils/byteCalculator';
    
    const props = defineProps({
      initialContent: String,
      studentName: String
    });
    const emit = defineEmits(['close', 'save']);
    
    const content = ref(props.initialContent || '');
    const byteSize = computed(() => calculateBytes(content.value));
    
    const handleSave = () => {
      if (!content.value.trim()) return alert("내용을 입력해주세요.");
      emit('save', content.value);
    };
    </script>
    
    <template>
      <div class="absolute inset-0 bg-white z-50 flex flex-col animate-in fade-in duration-200">
          
        <div class="px-5 py-3 border-b border-gray-200 bg-orange-50/50 flex justify-between items-center shrink-0">
          <div class="flex items-center gap-3">
            <div class="bg-orange-100 p-2 rounded-lg">
              <Edit class="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 class="font-bold text-gray-800 text-base">직접 수정 모드</h3>
              <p class="text-xs text-gray-500 font-bold">{{ studentName }} 학생</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <span class="text-sm font-mono font-bold text-gray-600 bg-white px-3 py-1.5 rounded border">
              {{ byteSize }} Bytes
            </span>
            <button @click="$emit('close')" class="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition">
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>
    
        <div class="flex-1 p-0 relative bg-white">
          <textarea 
            v-model="content"
            class="w-full h-full p-8 text-base leading-8 resize-none focus:outline-none font-sans text-gray-800"
            placeholder="여기에 내용을 작성하세요..."
          ></textarea>
        </div>
    
        <div class="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2 shrink-0">
          <button 
            @click="$emit('close')" 
            class="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition"
          >
            취소
          </button>
          <button 
            @click="handleSave" 
            class="px-4 py-2 rounded-lg text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-sm flex items-center gap-2 transition"
          >
            <Save class="w-4 h-4" />
            수정 완료 (저장)
          </button>
        </div>
    
      </div>
    </template>