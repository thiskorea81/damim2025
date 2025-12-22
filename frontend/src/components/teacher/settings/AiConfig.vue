<script setup>
    import { Cpu, Key, MessageSquare, AlertCircle } from 'lucide-vue-next';
    
    const props = defineProps({
      apiKeys: { type: Object, required: true },
      settings: { type: Object, required: true }
    });
    </script>
    
    <template>
      <div class="space-y-6">
        
        <div class="p-5 bg-gray-50 rounded-xl border border-gray-100">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Key class="w-4 h-4 text-gray-600"/> API Key 관리
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 mb-1">Gemini API Key</label>
              <div class="relative">
                <Cpu class="w-4 h-4 absolute left-3 top-2.5 text-gray-400"/>
                <input 
                  v-model="apiKeys.gemini" 
                  type="password" 
                  placeholder="AIzaSy..." 
                  class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 mb-1">GPT API Key</label>
              <div class="relative">
                <Cpu class="w-4 h-4 absolute left-3 top-2.5 text-gray-400"/>
                <input 
                  v-model="apiKeys.gpt" 
                  type="password" 
                  placeholder="sk-..." 
                  class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
              </div>
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-2">* 입력된 API Key는 교사의 브라우저와 DB에만 저장되며, 학생의 요청 시 이를 사용하여 AI를 호출합니다.</p>
        </div>
    
        <div class="p-5 bg-purple-50 rounded-xl border border-purple-100">
          <h3 class="font-bold text-purple-800 mb-4 flex items-center gap-2">
            <MessageSquare class="w-4 h-4"/> 성적 분석 프롬프트 설정
          </h3>
          
          <div class="mb-4">
            <div class="text-xs text-purple-600 bg-white p-3 rounded border border-purple-100 mb-2 leading-relaxed" v-pre>
              <strong>💡 프롬프트 작성 팁:</strong><br/>
              아래 변수를 사용하면 학생별 데이터로 자동 치환됩니다.<br/>
              - <code>{{NAME}}</code> : 학생 이름 (예: 김철수)<br/>
              - <code>{{DATA}}</code> : 학생의 이번 학기 성적 데이터 전체
            </div>
    
            <textarea 
              v-model="settings.gradeAnalysisPrompt" 
              rows="6"
              class="w-full p-4 border border-purple-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              placeholder="예: 당신은 입시 전문가입니다. {{NAME}} 학생의 성적 데이터 {{DATA}}를 분석하여 강점과 약점을 파악해주세요."
            ></textarea>
          </div>
    
          <div class="flex items-start gap-2 text-xs text-purple-700 bg-purple-100/50 p-2 rounded">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5"/>
            <p>이 프롬프트는 학생이 '내 성적 AI 분석' 버튼을 눌렀을 때 사용됩니다. 구체적인 지시사항을 적을수록 더 좋은 분석 결과가 나옵니다.</p>
          </div>
        </div>
    
      </div>
    </template>