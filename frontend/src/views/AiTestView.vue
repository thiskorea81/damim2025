<script setup>
    import { ref, onMounted } from 'vue';
    import { auth, db, getAppId } from '../firebase';
    import { doc, getDoc } from 'firebase/firestore';
    import { generateGemini, generateGpt } from '../utils/aiUtils'; // 앞서 만든 utils import
    import { Bot, Send, Loader2, AlertCircle } from 'lucide-vue-next';
    
    const prompt = ref('');
    const response = ref('');
    const loading = ref(false);
    const model = ref('gemini'); // 'gemini' or 'gpt'
    const apiKeys = ref({ gemini: '', gpt: '' });
    const error = ref('');
    
    // DB에서 내 API Key 가져오기
    onMounted(async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const appId = getAppId();
          // 교사 정보 경로 (artifacts/appId/users/uid)
          const docRef = doc(db, 'artifacts', appId, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data().apiKeys) {
            apiKeys.value = docSnap.data().apiKeys;
          }
        } catch (e) {
          console.error("API Key 로드 실패:", e);
        }
      }
    });
    
    const handleGenerate = async () => {
      if (!prompt.value.trim()) return;
      
      loading.value = true;
      response.value = '';
      error.value = '';
    
      try {
        const key = apiKeys.value[model.value];
        if (!key) {
          throw new Error(`저장된 ${model.value === 'gemini' ? 'Gemini' : 'GPT'} API Key가 없습니다. [설정] 탭에서 키를 먼저 등록해주세요.`);
        }
    
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
      <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl mx-auto">
          
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <Bot class="w-8 h-8 text-blue-600"/>
              AI 생성 테스트
            </h1>
            <p class="text-gray-500 mt-2">저장된 API Key를 사용하여 AI 응답을 테스트합니다.</p>
          </div>
    
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            
            <div class="flex flex-col sm:flex-row gap-4 mb-6">
              <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors flex-1" :class="model === 'gemini' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'">
                <input type="radio" v-model="model" value="gemini" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                <div>
                  <span class="font-bold text-gray-800 block">Google Gemini</span>
                  <span v-if="apiKeys.gemini" class="text-xs text-green-600 font-medium">Key 확인됨</span>
                  <span v-else class="text-xs text-red-500 font-medium">Key 없음</span>
                </div>
              </label>
    
              <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors flex-1" :class="model === 'gpt' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'">
                <input type="radio" v-model="model" value="gpt" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                <div>
                  <span class="font-bold text-gray-800 block">OpenAI GPT</span>
                  <span v-if="apiKeys.gpt" class="text-xs text-green-600 font-medium">Key 확인됨</span>
                  <span v-else class="text-xs text-red-500 font-medium">Key 없음</span>
                </div>
              </label>
            </div>
    
            <div class="mb-4">
              <textarea 
                v-model="prompt" 
                rows="5" 
                placeholder="AI에게 무엇을 물어볼까요? (예: 창의적인 체험학습 주제 3가지만 추천해줘)"
                class="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all text-gray-700"
                @keydown.ctrl.enter="handleGenerate"
              ></textarea>
              <p class="text-xs text-gray-400 text-right mt-2">Ctrl + Enter로 전송</p>
            </div>
    
            <button 
              @click="handleGenerate" 
              :disabled="loading || !prompt.trim()"
              class="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
              <Send v-else class="w-5 h-5" />
              {{ loading ? '답변 생성 중...' : '질문하기' }}
            </button>
    
            <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-start gap-2 text-sm">
              <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{{ error }}</span>
            </div>
    
            <div v-if="response" class="mt-8 animate-fade-in-up">
              <div class="flex items-center gap-2 mb-3">
                <Bot class="w-5 h-5 text-blue-600"/>
                <h3 class="text-sm font-bold text-gray-600 uppercase tracking-wider">AI 답변</h3>
              </div>
              <div class="p-6 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 leading-relaxed whitespace-pre-wrap shadow-inner">
                {{ response }}
              </div>
            </div>
    
          </div>
        </div>
      </div>
    </template>
    
    <style scoped>
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.4s ease-out forwards;
    }
    </style>