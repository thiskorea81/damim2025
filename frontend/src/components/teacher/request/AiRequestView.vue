<script setup>
    import { ref } from 'vue';
    import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
    import { db } from '../../../firebase';
    import { 
      Bot, User, ArrowRight, Cpu, Loader2, Edit, GitPullRequest 
    } from 'lucide-vue-next';
    import { calculateBytes } from '../../../utils/byteCalculator';
    import { generateGemini, generateGpt } from '../../../utils/aiUtils';
    
    const props = defineProps(['record']);
    const emit = defineEmits(['refresh', 'open-manual']);
    
    const aiProcessing = ref(false);
    const selectedModel = ref('gemini');
    
    // --- API Key 가져오기 ---
    const getSystemApiKey = async (modelType) => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'global'));
        if (snap.exists()) {
          const data = snap.data();
          return modelType === 'gemini' ? (data.geminiApiKey || data.sharedApiKey) : data.gptApiKey;
        }
        return null;
      } catch (e) { console.error(e); return null; }
    };
    
    // --- AI 실행 로직 ---
    const runAiBatchProcess = async () => {
      if (!props.record) return;
      aiProcessing.value = true;
      
      try {
        const apiKey = await getSystemApiKey(selectedModel.value);
        if (!apiKey) throw new Error("API Key가 설정되지 않았습니다.");
    
        let currentHistory = props.record.history || [];
        // 초기화 방어 코드
        if (currentHistory.length === 0) {
          currentHistory = [{
            version: 1, actor: 'teacher', action: 'legacy_init',
            content: props.record.content || '', timestamp: new Date().toISOString(),
            byteSize: calculateBytes(props.record.content || ''), summary: '초기 원본'
          }];
        }
    
        const studentRequest = props.record.studentFeedback || props.record.requirements || "요청 사항 없음";
        
        const systemPrompt = `
    당신은 생활기록부 작성을 돕는 AI 교사입니다.
    [기존 내용]: ${props.record.content || ""}
    [학생 요청사항]: "${studentRequest}"
    [지침]: 명사형 종결(~함), 마크다운 금지, 이름 포함 금지, 요청사항 반영.
    `;
    
        let newContent = await (selectedModel.value === 'gemini' ? generateGemini(apiKey, systemPrompt) : generateGpt(apiKey, systemPrompt));
        newContent = newContent.replace(/\*\*/g, '').replace(/\[AI\]/g, '').trim();
    
        const newVersion = {
          version: (currentHistory[currentHistory.length - 1]?.version || 1) + 1,
          actor: 'ai', model: selectedModel.value, action: 'ai_revision',
          content: newContent, timestamp: new Date().toISOString(),
          byteSize: calculateBytes(newContent),
          summary: `AI(${selectedModel.value === 'gemini' ? 'Gemini' : 'GPT'}) 수정`,
          relatedRequest: studentRequest
        };
        
        await updateDoc(doc(db, 'student_records', props.record.id), {
          content: newContent,
          history: [...currentHistory, newVersion],
          status: 'ai_processed',
          hasFeedback: false, studentFeedback: null,
          updatedAt: serverTimestamp()
        });
        emit('refresh');
    
      } catch (e) {
        alert("AI 처리 실패: " + e.message);
      } finally {
        aiProcessing.value = false;
      }
    };
    </script>
    
    <template>
      <div class="flex flex-col h-full bg-white">
        
        <div class="p-4 border-b bg-indigo-50/30 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 class="text-sm font-bold text-gray-900 flex items-center gap-2">
              {{ record.studentId }} {{ record.name }}
              <span class="text-[10px] font-normal text-gray-500 bg-white px-1.5 py-0.5 rounded border">{{ record.category }}</span>
            </h2>
          </div>
          
          <div class="flex items-center gap-2">
            <select v-model="selectedModel" class="text-xs border rounded px-2 py-1.5 bg-white font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="gemini">Gemini</option>
              <option value="gpt">GPT-4</option>
            </select>
    
            <button 
              @click="runAiBatchProcess" 
              :disabled="aiProcessing" 
              class="px-3 py-1.5 rounded text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50 transition"
            >
              <Loader2 v-if="aiProcessing" class="w-3 h-3 animate-spin" />
              <Cpu v-else class="w-3 h-3" /> AI 실행
            </button>
    
            <button 
              @click="$emit('open-manual')" 
              class="px-3 py-1.5 rounded text-xs font-bold bg-white border border-gray-300 text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-1 transition"
            >
              <Edit class="w-3 h-3" /> 직접 수정
            </button>
          </div>
        </div>
    
        <div class="px-5 py-3 bg-blue-50 border-b border-blue-100">
            <div class="flex items-start gap-2">
              <span class="text-blue-600 text-[10px] font-bold mt-0.5 whitespace-nowrap">요청사항:</span>
              <p class="text-xs font-bold text-gray-800 leading-relaxed">
                "{{ record.studentFeedback || record.requirements || '별도 요청사항 없음' }}"
              </p>
            </div>
        </div>
    
        <div class="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
          <div v-if="!record.history || record.history.length === 0" class="text-center py-10 text-gray-400">
            <GitPullRequest class="w-10 h-10 mx-auto mb-2 opacity-20"/>
            <p class="text-xs">수정 내역이 없습니다.</p>
          </div>
    
          <div v-for="(hist, idx) in (record.history || [])" :key="idx" class="flex gap-4 group">
            <div class="flex flex-col items-center w-8 shrink-0 relative">
              <div class="w-0.5 h-full bg-gray-300 absolute top-0 bottom-0 z-0 group-last:h-0"></div>
              <div class="w-8 h-8 rounded-full z-10 flex items-center justify-center shadow-sm border-2 bg-white"
                :class="hist.actor === 'teacher' ? 'border-orange-500 text-orange-600' : (hist.actor === 'ai' ? 'border-purple-500 text-purple-600' : 'border-blue-500 text-blue-600')"
              >
                <User v-if="hist.actor === 'teacher'" class="w-4 h-4" />
                <Bot v-else-if="hist.actor === 'ai'" class="w-4 h-4" />
                <span v-else class="text-[10px] font-bold">학</span>
              </div>
            </div>
    
            <div class="flex-1 bg-white rounded-xl border p-4 shadow-sm" :class="hist.actor === 'teacher' ? 'border-orange-200' : 'border-gray-200'">
              <div class="flex justify-between items-start mb-2 pb-2 border-b border-gray-100">
                <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  Ver.{{ hist.version }} {{ hist.actor === 'teacher' ? '선생님 직접 수정' : (hist.actor === 'ai' ? 'AI 수정' : '학생 작성') }}
                </span>
                <span class="text-[10px] font-mono text-gray-400">{{ hist.byteSize }} B</span>
              </div>
              
              <div v-if="hist.relatedRequest" class="mb-2 px-2 py-1 bg-gray-50 rounded border border-gray-100 flex items-center gap-1">
                 <ArrowRight class="w-3 h-3 text-gray-400"/>
                 <span class="text-[10px] text-gray-500 truncate max-w-[200px]">{{ hist.relatedRequest }}</span>
              </div>
    
              <div class="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">{{ hist.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>