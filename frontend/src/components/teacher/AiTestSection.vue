<script setup>
    import { ref } from 'vue';
    import { generateGemini, generateGpt } from '../../utils/aiUtils'; // 경로 확인
    import { Bot, Send, Loader2, AlertCircle } from 'lucide-vue-next';
    
    // 부모로부터 현재 입력된 API 키를 실시간으로 받음
    const props = defineProps({
      apiKeys: {
        type: Object,
        required: true,
        default: () => ({ gemini: '', gpt: '' })
      }
    });
    
    const prompt = ref('');
    const response = ref('');
    const loading = ref(false);
    const model = ref('gemini'); // 'gemini' or 'gpt'
    const error = ref('');
    
    const handleGenerate = async () => {
      if (!prompt.value.trim()) return;
      
      error.value = '';
      response.value = '';
      loading.value = true;
    
      try {
        const key = props.apiKeys[model.value];
        if (!key) throw new Error(`${model.value === 'gemini' ? 'Gemini' : 'GPT'} API Key가 입력되지 않았습니다.`);
    
        // 선택된 모델에 따라 호출
        if (model.value === 'gemini') {
          response.value = await generateGemini(key, prompt.value);
        } else {
          response.value = await generateGpt(key, prompt.value);
        }
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    };
    </script>
    
    <template>
      <div class="mt-6 pt-6 border-t border-gray-100">
        <h3 class="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Bot class="w-4 h-4 text-blue-600"/> AI 연결 테스트
        </h3>
    
        <div class="flex gap-6 mb-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" v-model="model" value="gemini" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
            <span class="text-sm font-medium text-gray-700">Gemini</span>
            <span class="text-xs px-1.5 py-0.5 rounded font-bold" 
                  :class="apiKeys.gemini ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
              {{ apiKeys.gemini ? 'Key 입력됨' : 'Key 없음' }}
            </span>
          </label>
    
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" v-model="model" value="gpt" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
            <span class="text-sm font-medium text-gray-700">GPT</span>
            <span class="text-xs px-1.5 py-0.5 rounded font-bold" 
                  :class="apiKeys.gpt ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
              {{ apiKeys.gpt ? 'Key 입력됨' : 'Key 없음' }}
            </span>
          </label>
        </div>
    
        <div class="flex gap-2">
          <input 
            v-model="prompt" 
            @keydown.enter="handleGenerate"
            placeholder="테스트할 질문을 입력하세요 (예: 안녕?)" 
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button 
            @click="handleGenerate" 
            :disabled="loading || !prompt.trim()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-sm"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin"/>
            <Send v-else class="w-4 h-4"/>
            <span class="hidden sm:inline">전송</span>
          </button>
        </div>
    
        <div v-if="error" class="mt-3 p-2 bg-red-50 text-xs text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle class="w-3 h-3 flex-shrink-0"/> {{ error }}
        </div>
    
        <div v-if="response" class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 leading-relaxed whitespace-pre-wrap animate-fade-in">
          <div class="font-bold text-blue-600 mb-1 flex items-center gap-1">
            <Bot class="w-3 h-3"/> AI 답변:
          </div>
          {{ response }}
        </div>
      </div>
    </template>
    
    <style scoped>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
    </style>