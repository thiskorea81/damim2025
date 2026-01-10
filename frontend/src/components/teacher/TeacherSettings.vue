<script setup>
  import { ref, reactive, onMounted } from 'vue';
  import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
  import { db, getAppId } from '../../firebase';
  import { Settings, Save, Loader2 } from 'lucide-vue-next';
  
  // 분리된 하위 컴포넌트 import
  import StudentAccess from './settings/StudentAccess.vue';
  import TeacherProfile from './settings/TeacherProfile.vue';
  import AiConfig from './settings/AiConfig.vue';
  
  const props = defineProps({
    user: { type: Object, required: true },
    userData: { type: Object, required: true }
  });
  
  const isSaving = ref(false);
  
  // 1. 교사 개인 설정 데이터
  const form = reactive({
    duties: [],
    subjects: [],
    clubs: [],
    apiKeys: { gemini: '', gpt: '' } // 여기서 입력받음
  });
  
  // 2. 전역 설정 데이터
  const globalSettings = reactive({
    showGradeTab: false,
    showRecordTab: false,
    showAppStatus: true,
    showAbsence: true,
    showFieldTrip: true,
    enableStudentAi: false,
    gradeAnalysisPrompt: ''
  });
  
  // 데이터 로드
  onMounted(async () => {
    // A. 교사 개인 설정 로드
    if (props.userData) {
      form.duties = props.userData.duties || [];
      form.subjects = props.userData.subjects || [];
      form.clubs = props.userData.clubs || [];
      
      // [수정] 개인 프로필에 저장된 키가 있다면 불러오기 (우선순위 1)
      if (props.userData.apiKeys) {
          form.apiKeys.gemini = props.userData.apiKeys.gemini || '';
          form.apiKeys.gpt = props.userData.apiKeys.gpt || '';
      }
    }
  
    // B. 전역 설정 로드
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        Object.assign(globalSettings, {
          showGradeTab: data.showGradeTab ?? false,
          showRecordTab: data.showRecordTab ?? false,
          showAppStatus: data.showAppStatus ?? true,
          showAbsence: data.showAbsence ?? true,
          showFieldTrip: data.showFieldTrip ?? true,
          enableStudentAi: data.enableStudentAi ?? false,
          gradeAnalysisPrompt: data.gradeAnalysisPrompt ?? `당신은 학생들의 성적을 분석하고...`
        });
  
        // [수정] 만약 개인 프로필에 키가 없었다면, 전역 설정의 키를 불러와서 입력창에 채움 (우선순위 2)
        if (!form.apiKeys.gemini && data.geminiApiKey) form.apiKeys.gemini = data.geminiApiKey;
        if (!form.apiKeys.gpt && data.gptApiKey) form.apiKeys.gpt = data.gptApiKey;
      }
    } catch (e) {
      console.error("설정 로드 실패:", e);
    }
  });
  
  // 저장 로직
  const handleSave = async () => {
    if (!confirm("설정을 저장하시겠습니까?")) return;
    
    isSaving.value = true;
    try {
      const appId = getAppId();
      
      // 1. 교사 개인 프로필 업데이트 (내 정보)
      const userRef = doc(db, 'artifacts', appId, 'users', props.user.uid);
      await updateDoc(userRef, {
        duties: form.duties,
        subjects: form.subjects,
        clubs: form.clubs,
        apiKeys: form.apiKeys // 개인 정보에도 백업 저장
      });
  
      // 2. 전역 설정 저장 (AI Writer가 참조하는 곳)
      // [중요] 여기에 gptApiKey와 geminiApiKey를 명시적으로 저장해야 함
      const settingsToSave = {
        ...globalSettings,
        geminiApiKey: form.apiKeys.gemini, // [핵심 수정] Gemini 키 저장
        gptApiKey: form.apiKeys.gpt,       // [핵심 수정] GPT 키 저장
        sharedApiKey: globalSettings.enableStudentAi ? form.apiKeys.gemini : '' // 학생용 공유 키
      };
  
      await setDoc(doc(db, 'settings', 'global'), settingsToSave, { merge: true });
  
      alert("모든 설정이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      isSaving.value = false;
    }
  };
  </script>
  
  <template>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <Settings class="w-6 h-6 text-gray-700"/>
          <h2 class="text-xl font-bold text-gray-800">교사 환경 설정</h2>
        </div>
        
        <button 
          @click="handleSave" 
          :disabled="isSaving" 
          class="flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition disabled:opacity-50 text-sm"
        >
          <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin mr-2"/>
          <Save v-else class="w-4 h-4 mr-2"/>
          저장
        </button>
      </div>
  
      <div class="space-y-8">
        
        <StudentAccess :settings="globalSettings" />
  
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
          <TeacherProfile :form="form" />
  
          <AiConfig :apiKeys="form.apiKeys" :settings="globalSettings" />
        </div>
  
        <div class="flex justify-end pt-6 border-t border-gray-100">
          <button 
            @click="handleSave" 
            :disabled="isSaving" 
            class="flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition disabled:opacity-50"
          >
            <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin mr-2"/>
            <Save v-else class="w-4 h-4 mr-2"/>
            설정 저장
          </button>
        </div>
  
      </div>
    </div>
  </template>