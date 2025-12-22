<script setup>
    import { ref, computed, onMounted } from 'vue';
    import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { 
      Clock, GitPullRequest, Bot, RefreshCw, AlertTriangle, 
      ArrowRight, Cpu, Loader2, Settings 
    } from 'lucide-vue-next';
    import { calculateBytes } from '../../utils/byteCalculator';
    import { generateGemini, generateGpt } from '../../utils/aiUtils';
    
    const props = defineProps(['records', 'mainMode']);
    const emit = defineEmits(['refresh']);
    
    const selectedRecordId = ref(null);
    const aiProcessing = ref(false); 
    const selectedModel = ref('gemini'); // gemini | gpt
    
    const CREATIVE_KEYWORDS = ['자율', '진로', '동아리', '행동'];
    
    // [추가] API Key 및 설정 상태
    const apiKeys = ref({ gemini: '', gpt: '' });
    const analysisPrompt = ref(''); // (필요 시 사용)
    
    // --- [설정 로드] DB에서 API Key 가져오기 ---
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'global'));
        if (snap.exists()) {
          const data = snap.data();
          
          // DB 필드명 매핑 (상황에 맞게 조정)
          // geminiApiKey가 없으면 sharedApiKey를 Gemini용으로 사용
          apiKeys.value = {
            gemini: data.geminiApiKey || data.sharedApiKey || '',
            gpt: data.gptApiKey || ''
          };
          
          // 프롬프트 설정이 있다면 로드
          if (data.gradeAnalysisPrompt) {
            analysisPrompt.value = data.gradeAnalysisPrompt;
          }
        }
      } catch (e) { 
        console.error("설정 로드 실패:", e); 
      }
    };
    
    onMounted(() => {
      loadSettings();
    });
    
    // --- 필터링 및 대기열 로직 ---
    const filteredRecords = computed(() => {
      return props.records.filter(r => {
        const isCreative = CREATIVE_KEYWORDS.some(k => r.category && r.category.includes(k));
        if (props.mainMode === 'creative' && !isCreative) return false;
        if (props.mainMode === 'subject' && isCreative) return false;
        return true;
      });
    });
    
    const requestQueue = computed(() => {
      return filteredRecords.value.filter(r => r.status === 'request_modify' || r.status === 'submitted');
    });
    
    const selectedRecord = computed(() => {
      return props.records.find(r => r.id === selectedRecordId.value);
    });
    
    // --- AI 로직 ---
    const runAiBatchProcess = async (record) => {
      if (!record) return;
    
      // 1. 키 존재 여부 확인
      const currentKey = selectedModel.value === 'gemini' ? apiKeys.value.gemini : apiKeys.value.gpt;
      
      if (!currentKey) {
        alert(`[오류] ${selectedModel.value === 'gemini' ? 'Gemini' : 'GPT'} API Key가 설정되지 않았습니다.\n관리자 설정(settings/global)을 확인해주세요.`);
        return;
      }
    
      aiProcessing.value = true;
      
      try {
        // 2. 방어 코드: 히스토리 초기화
        let currentHistory = record.history;
        if (!currentHistory || !Array.isArray(currentHistory) || currentHistory.length === 0) {
          currentHistory = [{
            version: 1,
            actor: 'teacher',
            action: 'legacy_init',
            content: record.content || '',
            timestamp: new Date().toISOString(),
            byteSize: calculateBytes(record.content || ''),
            summary: '초기 원본 (기록 복구됨)'
          }];
        }
    
        const lastHistory = currentHistory[currentHistory.length - 1];
        const studentRequest = record.studentFeedback || record.requirements || "내용을 문맥에 맞게 다듬어주세요.";
        const currentContent = record.content || "";
    
        // 3. 프롬프트 구성
        const systemPrompt = `
    당신은 생활기록부 작성을 돕는 AI 교사입니다. 아래 내용을 학생의 요청에 맞춰 수정해주세요.
    
    [기존 내용]:
    ${currentContent}
    
    [학생 요청사항]:
    "${studentRequest}"
    
    [작성 지침]:
    1. 학생의 요청사항을 반영하되, 교육적이고 긍정적인 '해요체'나 '평어'가 아닌 **생기부 스타일(명사형 종결, ~함/임)**로 작성하세요.
    2. 학생의 역량이 드러나도록 구체적으로 서술하세요.
    3. 결과물에는 인사말, 설명, 부가적인 멘트를 제외하고 **수정된 텍스트 본문만** 출력하세요.
    4. **[중요]** '**' (볼드체), '*' (기울임), '[AI]' 같은 마크다운 문법이나 특수기호를 절대 사용하지 마세요. 오직 순수 텍스트만 출력하세요.
    `;
    
        // 4. AI 생성 호출
        let newContent = "";
        let aiSummary = "";
        
        if (selectedModel.value === 'gemini') {
          newContent = await generateGemini(currentKey, systemPrompt);
          aiSummary = `[Gemini] 요청사항을 반영하여 내용을 생성했습니다.`;
        } else {
          newContent = await generateGpt(currentKey, systemPrompt);
          aiSummary = `[GPT] 요청사항을 반영하여 내용을 생성했습니다.`;
        }
    
        // [수정 2] 후처리: 혹시라도 포함된 마크다운 기호(**) 강제 삭제
        newContent = newContent.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    
        // 특이사항 체크
        let isImportant = false;
        if (studentRequest.includes("서울대") || studentRequest.includes("의대") || studentRequest.includes("합격")) {
          isImportant = true;
          aiSummary += " (주의: 민감한 진로 키워드 포함)";
        }
    
        // 5. 새 버전 생성
        const newVersion = {
          version: (lastHistory?.version || 1) + 1,
          actor: 'ai',
          model: selectedModel.value,
          action: 'ai_revision',
          content: newContent,
          timestamp: new Date().toISOString(),
          byteSize: calculateBytes(newContent),
          summary: aiSummary,
          isImportant: isImportant,
          relatedRequest: studentRequest
        };
        
        const newHistory = [...currentHistory, newVersion];
    
        // 6. DB 업데이트
        await updateDoc(doc(db, 'student_records', record.id), {
          content: newContent,
          history: newHistory,
          status: 'ai_processed',
          hasFeedback: false,
          studentFeedback: null,
          updatedAt: serverTimestamp()
        });
    
        emit('refresh');
        
      } catch (e) {
        console.error(e);
        alert("AI 처리 실패: " + e.message);
      } finally {
        aiProcessing.value = false;
      }
    };
    </script>
    
    <template>
      <div class="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
          
        <div class="w-full md:w-80 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
            <div>
              <h3 class="font-bold text-gray-800 flex items-center gap-2">
                <Clock class="w-4 h-4 text-indigo-600" /> AI 대기열
              </h3>
              <p class="text-[10px] text-gray-400 mt-0.5">선택된 모드: {{ mainMode === 'creative' ? '창체' : '교과' }}</p>
            </div>
            <span class="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{{ requestQueue.length }}</span>
          </div>
          
          <div class="flex-1 overflow-y-auto p-2 space-y-2">
            <div v-if="requestQueue.length === 0" class="text-center py-10 text-gray-400 text-sm">
              대기 중인 요청이 없습니다.
            </div>
            <button 
              v-for="rec in requestQueue" 
              :key="rec.id"
              @click="selectedRecordId = rec.id"
              class="w-full text-left p-3 rounded-xl border transition hover:shadow-md relative"
              :class="selectedRecordId === rec.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-100 bg-white hover:border-indigo-200'"
            >
              <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-gray-800 text-sm">{{ rec.studentId }} {{ rec.name }}</span>
                <span class="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{{ rec.category }}</span>
              </div>
              <p class="text-xs text-gray-500 line-clamp-1">
                📢 {{ rec.studentFeedback || rec.requirements || '요청사항 없음' }}
              </p>
              <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500"></span>
            </button>
          </div>
        </div>
    
        <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          <div v-if="!selectedRecord" class="flex-1 flex flex-col items-center justify-center text-gray-400">
            <GitPullRequest class="w-16 h-16 text-gray-200 mb-4" />
            <p>왼쪽 목록에서 학생을 선택하세요.</p>
            
            <div class="mt-4 text-xs text-gray-400 flex flex-col items-center gap-1">
              <span v-if="apiKeys.gemini" class="text-green-500 flex items-center gap-1"><Cpu class="w-3 h-3"/> Gemini 준비됨</span>
              <span v-else class="text-red-400 flex items-center gap-1"><AlertTriangle class="w-3 h-3"/> Gemini 키 없음</span>
              
              <span v-if="apiKeys.gpt" class="text-green-500 flex items-center gap-1"><Cpu class="w-3 h-3"/> GPT 준비됨</span>
              <span v-else class="text-gray-300">GPT 키 없음</span>
            </div>
          </div>
    
          <div v-else class="flex flex-col h-full">
            <div class="p-5 border-b bg-indigo-50/50 flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {{ selectedRecord.studentId }} {{ selectedRecord.name }}
                  <span class="text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded border">{{ selectedRecord.category }}</span>
                </h2>
                <div class="flex items-center gap-2 mt-2 text-sm text-indigo-700">
                  <Bot class="w-4 h-4" />
                  <span class="font-bold">AI Status:</span>
                  <span>Ver.{{ (selectedRecord.history || []).length }} 대기 중</span>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <div class="relative">
                  <Cpu class="w-4 h-4 absolute left-3 top-2.5 text-gray-500 pointer-events-none" />
                  <select 
                    v-model="selectedModel" 
                    class="pl-9 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm appearance-none hover:bg-gray-50"
                  >
                    <option value="gemini">Gemini 2.5</option>
                    <option value="gpt">GPT-5 Nano</option>
                  </select>
                </div>
    
                <button 
                  @click="runAiBatchProcess(selectedRecord)"
                  :disabled="aiProcessing || (selectedRecord.status !== 'request_modify' && selectedRecord.status !== 'submitted')"
                  class="px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition"
                  :class="aiProcessing || (selectedRecord.status !== 'request_modify' && selectedRecord.status !== 'submitted') ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'"
                >
                  <Loader2 v-if="aiProcessing" class="w-4 h-4 animate-spin" />
                  <RefreshCw v-else class="w-4 h-4" />
                  {{ aiProcessing ? '생성 중...' : 'AI 수정 실행' }}
                </button>
              </div>
            </div>
    
            <div class="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-8">
              <div v-for="(hist, idx) in (selectedRecord.history || [])" :key="idx" class="flex gap-4 group">
                <div class="flex flex-col items-center w-8 shrink-0 relative">
                  <div class="w-0.5 h-full bg-gray-300 absolute top-0 bottom-0 z-0 group-last:h-0"></div>
                  <div class="w-8 h-8 rounded-full z-10 flex items-center justify-center shadow-sm border-2 bg-white"
                    :class="{
                      'border-green-600 text-green-700': hist.version === 1,
                      'border-blue-500 text-blue-600': hist.actor === 'student' && hist.version > 1,
                      'border-purple-500 text-purple-600': hist.actor === 'ai'
                    }"
                  >
                    <span v-if="hist.version === 1" class="text-[10px] font-bold">Start</span>
                    <Bot v-else-if="hist.actor === 'ai'" class="w-4 h-4" />
                    <span v-else class="text-xs font-bold">학</span>
                  </div>
                </div>
    
                <div class="flex-1 bg-white rounded-xl border p-5 shadow-sm relative"
                   :class="hist.isImportant ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'"
                >
                  <div class="flex justify-between items-start mb-3 border-b pb-3 border-gray-100">
                    <div>
                      <span class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded mr-2"
                        :class="{
                          'bg-green-100 text-green-700': hist.version === 1,
                          'bg-purple-100 text-purple-700': hist.actor === 'ai',
                          'bg-blue-100 text-blue-700': hist.actor === 'student'
                        }"
                      >
                        Ver.{{ hist.version }} {{ hist.version === 1 ? '최초 원본' : (hist.actor === 'ai' ? `AI (${hist.model === 'gemini' ? 'Gemini' : 'GPT'})` : '학생 작성') }}
                      </span>
                      <span class="text-xs text-gray-400">{{ new Date(hist.timestamp).toLocaleString() }}</span>
                    </div>
                    <span class="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded border">
                      {{ hist.byteSize }} bytes
                    </span>
                  </div>
    
                  <div v-if="hist.relatedRequest" class="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div class="flex items-center gap-2 text-xs font-bold text-blue-700 mb-1">
                      <ArrowRight class="w-3 h-3" /> 학생의 수정 요청 반영:
                    </div>
                    <p class="text-sm text-blue-800">"{{ hist.relatedRequest }}"</p>
                  </div>
    
                  <div v-if="hist.isImportant" class="mb-3 flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-xs font-bold">
                    <AlertTriangle class="w-4 h-4" /> [중요] {{ hist.summary }}
                  </div>
                  <div v-else-if="hist.summary && hist.version > 1" class="mb-3 flex items-start gap-2 text-purple-700 bg-purple-50 px-3 py-2 rounded-lg text-xs">
                    <Bot class="w-4 h-4 mt-0.5 shrink-0" /> {{ hist.summary }}
                  </div>
    
                  <div class="text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {{ hist.content }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>