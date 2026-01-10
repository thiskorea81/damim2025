<script setup>
    import { ref, reactive, computed, onMounted } from 'vue';
    import { doc, getDoc } from 'firebase/firestore'; 
    import { db } from '../../firebase';
    import { 
      PenTool, BookOpen, Layers, Sparkles, Copy, 
      RotateCcw, Save, AlertCircle, Check, Cpu, Loader2
    } from 'lucide-vue-next';
    import { calculateBytes } from '../../utils/byteCalculator';
    import { generateGemini, generateGpt } from '../../utils/aiUtils';
    
    // --- 설정 상수 ---
    const CATEGORIES = [
      { id: 'subject', label: '교과 세특', defaultBytes: 1500, icon: BookOpen },
      { id: 'autonomous', label: '자율 활동', defaultBytes: 1500, icon: Layers },
      { id: 'career', label: '진로 활동', defaultBytes: 2100, icon: Layers },
      { id: 'club', label: '동아리 활동', defaultBytes: 1500, icon: Layers },
      { id: 'behavior', label: '행동 특성', defaultBytes: 1500, icon: Layers },
    ];
    
    // --- 상태 변수 ---
    const currentTab = ref(CATEGORIES[0]); 
    const selectedModel = ref('gemini');   
    const isLoading = ref(false);
    const showCopyAlert = ref(false);
    
    const form = reactive({
      studentName: '',
      activityContent: '', 
      keywords: '',        
      resultContent: ''    
    });
    
    const apiKeys = ref({ gemini: '', gpt: '' });
    
    // --- 설정 로드 ---
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'global'));
        if (snap.exists()) {
          const data = snap.data();
          apiKeys.value = { 
            gemini: data.geminiApiKey || data.sharedApiKey || '', 
            gpt: data.gptApiKey || '' 
          };
        }
      } catch (e) {
        console.error("API Key Load Error:", e);
      }
    };
    
    onMounted(() => {
      loadSettings();
    });
    
    // --- 바이트 계산 유틸리티 ---
    const currentBytes = computed(() => calculateBytes(form.resultContent));
    const isOverLimit = computed(() => currentBytes.value > currentTab.value.defaultBytes);
    
    // 탭 변경
    const selectTab = (category) => {
      currentTab.value = category;
      form.resultContent = ''; 
    };
    
    // --- AI 생성 로직 ---
    const handleGenerate = async () => {
      if (!form.activityContent.trim()) return alert("학생의 활동 내용을 입력해주세요.");
    
      const apiKey = selectedModel.value === 'gemini' ? apiKeys.value.gemini : apiKeys.value.gpt;
      
      if (!apiKey) {
        alert(`[오류] ${selectedModel.value === 'gemini' ? 'Gemini' : 'GPT'} API Key가 설정되지 않았습니다.`);
        return;
      }
    
      isLoading.value = true;
      form.resultContent = '';
    
      try {
        // [수정] 프롬프트 강화: 이름 제외 및 바이트 수 제한 준수 요청
        const prompt = `
    당신은 고등학교 생활기록부 작성 전문가입니다. 다음 정보를 바탕으로 학생의 생기부 내용을 작성해주세요.
    
    [입력 정보]
    1. 작성 영역: ${currentTab.value.label}
    2. 활동 내용: "${form.activityContent}"
    3. 강조 키워드: "${form.keywords || '자기주도성, 성실함'}"
    4. **제한 분량**: ${currentTab.value.defaultBytes} 바이트 이내 (한글 1자=3byte, 공백/영어=1byte 기준)
    
    [작성 지침]
    1. **학생의 이름(예: ${form.studentName || 'OOO'})을 절대 포함하지 마세요.** 주어는 생략하거나 문맥에 맞게 서술하세요.
    2. **지정된 ${currentTab.value.defaultBytes} 바이트를 절대 초과하지 않도록** 내용을 간결하게 요약하여 작성하세요.
    3. 문체: '~함', '~임' 등의 명사형 종결 어미를 사용하는 생기부 표준 스타일(개조식)을 엄수하세요. (예: 탐구함, 보임, 성장함)
    4. 구조: 동기/활동 -> 구체적 과정/노력 -> 결과/성취 -> 성장/변화.
    5. **절대** 마크다운(**볼드체** 등)이나 [AI] 같은 태그를 포함하지 마세요.
    6. 오직 생기부에 입력할 텍스트만 출력하세요.
    `;
    
        let text = "";
        if (selectedModel.value === 'gemini') {
          text = await generateGemini(apiKey, prompt);
        } else {
          text = await generateGpt(apiKey, prompt);
        }
    
        // 후처리 (마크다운 및 이름 제거 보완)
        let cleanedText = text.replace(/\*\*/g, '').replace(/\[AI\]/g, '').trim();
        if (form.studentName) {
            cleanedText = cleanedText.replaceAll(form.studentName, ""); // 혹시라도 이름이 들어가면 삭제
        }
        form.resultContent = cleanedText;
    
      } catch (e) {
        console.error(e);
        alert("생성 중 오류가 발생했습니다: " + e.message);
      } finally {
        isLoading.value = false;
      }
    };
    
    // --- 복사 기능 ---
    const copyToClipboard = async () => {
      if (!form.resultContent) return;
      try {
        await navigator.clipboard.writeText(form.resultContent);
        showCopyAlert.value = true;
        setTimeout(() => showCopyAlert.value = false, 2000);
      } catch (e) {
        alert("복사 실패");
      }
    };
    </script>
    
    <template>
      <div class="flex flex-col h-[calc(100vh-100px)] bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
        
        <div class="bg-white border-b px-6 py-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
              <PenTool class="w-6 h-6 text-indigo-600"/> 생기부 AI 작가
            </h2>
            
            <div class="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button 
                @click="selectedModel = 'gemini'"
                class="px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1"
                :class="selectedModel === 'gemini' ? 'bg-white shadow text-blue-600' : 'text-gray-400'"
              >
                <Cpu class="w-3 h-3"/> Gemini
              </button>
              <button 
                @click="selectedModel = 'gpt'"
                class="px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1"
                :class="selectedModel === 'gpt' ? 'bg-white shadow text-green-600' : 'text-gray-400'"
              >
                <Cpu class="w-3 h-3"/> GPT-4
              </button>
            </div>
          </div>
    
          <div class="flex gap-2 overflow-x-auto pb-2">
            <button 
              v-for="cat in CATEGORIES" 
              :key="cat.id"
              @click="selectTab(cat)"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap"
              :class="currentTab.id === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
            >
              <component :is="cat.icon" class="w-4 h-4" />
              {{ cat.label }}
            </button>
          </div>
        </div>
    
        <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          <div class="w-full md:w-1/2 p-6 overflow-y-auto border-r bg-white">
            <div class="space-y-6">
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2">학생 이름 (참고용, 결과 제외)</label>
                <input 
                  v-model="form.studentName" 
                  type="text" 
                  placeholder="예: 홍길동"
                  class="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
              </div>
    
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2">
                  활동 내용 및 관찰 사항 <span class="text-red-500">*</span>
                </label>
                <textarea 
                  v-model="form.activityContent"
                  rows="8"
                  class="w-full border border-gray-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                  placeholder="학생의 활동, 역할, 태도 등을 입력해주세요."
                ></textarea>
              </div>
    
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2">강조할 키워드</label>
                <input 
                  v-model="form.keywords" 
                  type="text" 
                  placeholder="예: 자기주도성, 문제해결력"
                  class="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
              </div>
    
              <button 
                @click="handleGenerate"
                :disabled="isLoading"
                class="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition flex justify-center items-center gap-2 disabled:bg-gray-400"
              >
                <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
                <Sparkles v-else class="w-5 h-5 text-yellow-300" />
                {{ isLoading ? 'AI가 작성 중입니다...' : '생기부 내용 생성하기' }}
              </button>
            </div>
          </div>
    
          <div class="w-full md:w-1/2 p-6 bg-gray-50 flex flex-col">
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm font-bold text-gray-700">생성 결과</span>
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono px-2 py-1 rounded border font-bold" 
                  :class="isOverLimit ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-200'">
                  {{ currentBytes }} / {{ currentTab.defaultBytes }} Bytes
                </span>
                <button 
                  @click="copyToClipboard" 
                  class="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-100 transition relative"
                >
                  <Copy class="w-3 h-3" /> 복사
                  <span v-if="showCopyAlert" class="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded animate-fade-in-up whitespace-nowrap">
                    복사완료!
                  </span>
                </button>
              </div>
            </div>
    
            <div class="flex-1 relative">
              <textarea 
                v-model="form.resultContent"
                class="w-full h-full border border-gray-300 rounded-xl p-5 text-sm leading-7 resize-none focus:ring-2 focus:ring-indigo-500 outline-none font-sans"
                placeholder="AI가 생성한 내용이 여기에 표시됩니다."
              ></textarea>
              
              <div v-if="isLoading" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
                <Loader2 class="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                <p class="text-sm font-bold text-indigo-800 animate-pulse">AI가 바이트 수에 맞춰 작성 중입니다...</p>
              </div>
            </div>
            
            <div class="mt-3 flex items-start gap-2 text-xs text-gray-500 bg-white p-3 rounded-lg border border-gray-200">
              <AlertCircle class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p>이름이 제거되고 바이트 제한에 맞춰 생성되었습니다. NEIS 입력 전 최종 확인해주세요.</p>
            </div>
          </div>
    
        </div>
      </div>
    </template>
    
    <style scoped>
    @keyframes fadeInUp {
      from { opacity: 0; transform: translate(-50%, 5px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.3s ease-out forwards;
    }
    </style>