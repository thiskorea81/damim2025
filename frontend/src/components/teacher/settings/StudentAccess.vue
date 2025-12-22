<script setup>
    import { Lock, Eye, EyeOff, AlertTriangle, LayoutTemplate, List, FileX, Plane, BrainCircuit } from 'lucide-vue-next';
    
    // 부모(TeacherSettings)에서 settings 객체를 받아와 양방향 바인딩
    const props = defineProps({
      settings: { type: Object, required: true }
    });
    </script>
    
    <template>
      <div class="space-y-6">
        
        <div class="p-5 bg-blue-50 rounded-xl border border-blue-100">
          <h3 class="font-bold text-blue-800 mb-4 flex items-center gap-2">
            <LayoutTemplate class="w-4 h-4"/> 주요 기능 및 AI 설정
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div class="bg-white p-3 rounded-lg border border-blue-100 flex items-center justify-between">
              <div>
                <div class="font-bold text-gray-700 text-sm">내 성적 탭</div>
                <div class="text-xs text-gray-500">학생 본인의 성적 조회</div>
              </div>
              <button 
                @click="settings.showGradeTab = !settings.showGradeTab" 
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" 
                :class="settings.showGradeTab ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'"
              >
                <Eye v-if="settings.showGradeTab" class="w-3 h-3" /> 
                <EyeOff v-else class="w-3 h-3" /> 
                {{ settings.showGradeTab ? '공개' : '비공개' }}
              </button>
            </div>
    
            <div class="bg-white p-3 rounded-lg border border-blue-100 flex items-center justify-between">
              <div>
                <div class="font-bold text-gray-700 text-sm">생기부 점검 탭</div>
                <div class="text-xs text-gray-500">자율/진로/행발 조회</div>
              </div>
              <button 
                @click="settings.showRecordTab = !settings.showRecordTab" 
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" 
                :class="settings.showRecordTab ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'"
              >
                <Eye v-if="settings.showRecordTab" class="w-3 h-3" /> 
                <EyeOff v-else class="w-3 h-3" /> 
                {{ settings.showRecordTab ? '공개' : '비공개' }}
              </button>
            </div>
    
            <div class="bg-white p-3 rounded-lg border border-blue-100 flex items-center justify-between">
              <div>
                <div class="font-bold text-gray-700 text-sm">성적 AI 분석</div>
                <div class="text-xs text-gray-500">Gemini Key 공유 필요</div>
              </div>
              <button 
                @click="settings.enableStudentAi = !settings.enableStudentAi" 
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" 
                :class="settings.enableStudentAi ? 'bg-purple-100 text-purple-600 ring-1 ring-purple-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'"
              >
                <BrainCircuit v-if="settings.enableStudentAi" class="w-3 h-3" /> 
                <Lock v-else class="w-3 h-3" /> 
                {{ settings.enableStudentAi ? '허용' : '차단' }}
              </button>
            </div>
          </div>
          
          <div v-if="settings.enableStudentAi" class="mt-3 text-xs text-purple-600 flex items-center gap-1 bg-white px-3 py-2 rounded border border-purple-100">
            <AlertTriangle class="w-3 h-3"/> 
            주의: '허용' 저장 시 입력된 Gemini API Key가 학생들의 AI 분석 기능을 위해 사용됩니다.
          </div>
        </div>
    
        <div class="p-5 bg-indigo-50 rounded-xl border border-indigo-100">
          <h3 class="font-bold text-indigo-800 mb-4 flex items-center gap-2">
            <List class="w-4 h-4"/> 신청 및 신고 메뉴 제어
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div class="bg-white p-3 rounded-lg border border-indigo-100 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <List class="w-4 h-4" />
                </div>
                <div>
                  <div class="font-bold text-gray-700 text-sm">내 신청 현황</div>
                  <div class="text-xs text-gray-400">메뉴 표시 여부</div>
                </div>
              </div>
              <button 
                @click="settings.showAppStatus = !settings.showAppStatus" 
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-1"
                :class="settings.showAppStatus ? 'bg-indigo-600 ring-indigo-200' : 'bg-gray-200 ring-transparent'"
              >
                <span 
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                  :class="settings.showAppStatus ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
    
            <div class="bg-white p-3 rounded-lg border border-indigo-100 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <FileX class="w-4 h-4" />
                </div>
                <div>
                  <div class="font-bold text-gray-700 text-sm">결석 신고서</div>
                  <div class="text-xs text-gray-400">메뉴 표시 여부</div>
                </div>
              </div>
              <button 
                @click="settings.showAbsence = !settings.showAbsence" 
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-1"
                :class="settings.showAbsence ? 'bg-indigo-600 ring-indigo-200' : 'bg-gray-200 ring-transparent'"
              >
                <span 
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                  :class="settings.showAbsence ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
    
            <div class="bg-white p-3 rounded-lg border border-indigo-100 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <Plane class="w-4 h-4" />
                </div>
                <div>
                  <div class="font-bold text-gray-700 text-sm">체험학습 신청</div>
                  <div class="text-xs text-gray-400">메뉴 표시 여부</div>
                </div>
              </div>
              <button 
                @click="settings.showFieldTrip = !settings.showFieldTrip" 
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-1"
                :class="settings.showFieldTrip ? 'bg-indigo-600 ring-indigo-200' : 'bg-gray-200 ring-transparent'"
              >
                <span 
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                  :class="settings.showFieldTrip ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
    
          </div>
        </div>
    
      </div>
    </template>