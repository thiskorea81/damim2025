<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'; // getDoc 추가
  import { db } from '../../firebase';
  import { Trophy, BookOpen, AlertCircle, Filter, Bot, Loader2, Sparkles } from 'lucide-vue-next';
  import { generateGemini } from '../../utils/aiUtils'; // AI 함수 import
  
  const props = defineProps({
    user: Object,     
    userData: Object 
  });
  
  const loading = ref(false);
  const analyzing = ref(false); // AI 분석 중 상태
  const allGrades = ref([]);
  const selectedSemester = ref('전체');
  const semesterOptions = ['전체', '1학년 1학기', '1학년 2학기', '2학년 1학기', '2학년 2학기', '3학년 1학기', '3학년 2학기'];
  
  // AI 관련 상태
  const aiResult = ref('');
  const showAiBtn = ref(false);
  const sharedApiKey = ref('');
  const analysisPrompt = ref('');
  
  // 학번 생성
  const getStudentId = () => {
    if (!props.userData) return null;
    if (props.userData.studentId) return String(props.userData.studentId);
    const { grade, number } = props.userData;
    const classNum = props.userData.classNum || props.userData.class || props.userData.classroom;
    if (grade && classNum && number) {
      return `${grade}${String(classNum).padStart(2, '0')}${String(number).padStart(2, '0')}`;
    }
    return null;
  };
  
  // 성적 조회
  const fetchMyGrades = async () => {
    const studentId = getStudentId();
    if (!studentId) return;
  
    loading.value = true;
    allGrades.value = [];
    aiResult.value = ''; // 성적 새로고침 시 분석 결과 초기화
  
    try {
      const q = query(collection(db, 'grades'), where('studentId', '==', studentId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          semester: data.semester || '학기 미지정',
          uploadedAt: data.uploadedAt?.toDate ? data.uploadedAt.toDate() : new Date(),
          scores: data.scores || {} 
        };
      });
      list.sort((a, b) => b.uploadedAt - a.uploadedAt);
      allGrades.value = list;
    } catch (e) { console.error(e); } 
    finally { loading.value = false; }
  };
  
  // 설정 로드 (AI 사용 가능 여부 확인)
  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) {
        const data = snap.data();
        // AI 기능이 켜져있고, 공유 키가 있을 때만 버튼 활성화
        if (data.enableStudentAi && data.sharedApiKey) {
          showAiBtn.value = true;
          sharedApiKey.value = data.sharedApiKey;
          analysisPrompt.value = data.gradeAnalysisPrompt || '';
        }
      }
    } catch (e) { console.error(e); }
  };
  
  const filteredGrades = computed(() => {
    if (selectedSemester.value === '전체') return allGrades.value;
    return allGrades.value.filter(g => g.semester === selectedSemester.value);
  });
  
  // AI 분석 실행
  const runAiAnalysis = async () => {
    if (!sharedApiKey.value || filteredGrades.value.length === 0) return;
    
    analyzing.value = true;
    aiResult.value = '';
  
    try {
      // 1. 현재 화면에 보이는 성적 데이터를 텍스트로 변환
      let gradeText = "";
      filteredGrades.value.forEach(exam => {
        gradeText += `\n[${exam.semester} 성적]\n`;
        for (const [subj, info] of Object.entries(exam.scores)) {
          gradeText += `- ${subj}: 원점수(${info.raw}), 성취도(${info.achievement}), 석차등급(${info.rank}), 석차(${info.rankStr}/${info.totalCount})\n`;
        }
      });
  
      // 2. 프롬프트 구성
      let finalPrompt = analysisPrompt.value;
      finalPrompt = finalPrompt.replace('{{NAME}}', props.userData.name || '학생');
      finalPrompt = finalPrompt.replace('{{DATA}}', gradeText);
  
      // 3. AI 호출 (기본적으로 Gemini 사용)
      const response = await generateGemini(sharedApiKey.value, finalPrompt);
      aiResult.value = response;
  
    } catch (e) {
      console.error(e);
      alert("AI 분석 중 오류가 발생했습니다: " + e.message);
    } finally {
      analyzing.value = false;
    }
  };
  
  watch(() => props.userData, fetchMyGrades, { deep: true });
  
  onMounted(() => {
    fetchMyGrades();
    loadSettings();
  });
  </script>
  
  <template>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
      
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <Trophy class="w-7 h-7 mr-3 text-yellow-500"/> 내 성적 조회
          </h2>
          <p class="text-sm text-gray-500 mt-1 pl-10" v-if="userData">
            {{ userData.grade }}학년 {{ userData.classNum || userData.class }}반 {{ userData.name }}
            <span class="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">학번: {{ getStudentId() || '미확인' }}</span>
          </p>
        </div>
        
        <div class="flex gap-2">
          <button 
            v-if="showAiBtn && filteredGrades.length > 0"
            @click="runAiAnalysis" 
            :disabled="analyzing"
            class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50 shadow-sm"
          >
            <Loader2 v-if="analyzing" class="w-4 h-4 animate-spin"/>
            <Sparkles v-else class="w-4 h-4 text-yellow-300"/>
            {{ analyzing ? '분석 중...' : 'AI 성적 분석' }}
          </button>
  
          <div class="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <Filter class="w-4 h-4 text-gray-500 mr-2" />
            <select v-model="selectedSemester" class="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer">
              <option v-for="opt in semesterOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>
      </div>
  
      <div v-if="aiResult" class="mb-8 p-6 bg-purple-50 border border-purple-100 rounded-2xl animate-fade-in">
        <div class="flex items-center gap-2 mb-4 text-purple-800 font-bold border-b border-purple-200 pb-2">
          <Bot class="w-5 h-5"/> AI 선생님의 분석 결과
        </div>
        <div class="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
          {{ aiResult }}
        </div>
      </div>
  
      <div v-if="loading" class="text-center py-20 text-gray-400">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        데이터를 불러오는 중...
      </div>
  
      <div v-else-if="filteredGrades.length === 0" class="text-center py-16 bg-gray-50 rounded-xl border border-dashed text-gray-400">
        <BookOpen class="w-12 h-12 mx-auto mb-3 text-gray-300"/>
        <p class="font-bold text-gray-500">성적 내역이 없습니다.</p>
      </div>
  
      <div v-else class="space-y-10">
        <div v-for="exam in filteredGrades" :key="exam.id" class="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <div class="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <span class="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">{{ exam.semester }}</span>
              <h3 class="font-bold text-lg">종합 성적표</h3>
            </div>
            <span class="text-xs text-slate-400">{{ exam.uploadedAt.toLocaleDateString() }}</span>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-center whitespace-nowrap">
              <thead class="bg-gray-50 text-gray-500 uppercase text-xs font-semibold tracking-wider border-b">
                <tr>
                  <th class="px-4 py-3 text-left w-32">과목명</th>
                  <th class="px-4 py-3">원점수</th>
                  <th class="px-4 py-3">성취도</th>
                  <th class="px-4 py-3">석차등급</th>
                  <th class="px-4 py-3 text-gray-400">석차/수강자수</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(info, subjectName) in exam.scores" :key="subjectName" class="hover:bg-blue-50/30">
                  <td class="px-4 py-3.5 text-left font-bold text-gray-800 bg-white border-r border-gray-100">{{ subjectName }}</td>
                  <td class="px-4 py-3.5 text-gray-700">{{ info.raw || '-' }}</td>
                  <td class="px-4 py-3.5 font-bold" :class="{'text-blue-600': info.achievement === 'A', 'text-red-500': info.achievement === 'E'}">{{ info.achievement || '-' }}</td>
                  <td class="px-4 py-3.5">
                    <span v-if="info.rank && !isNaN(info.rank)" :class="['px-2 py-0.5 rounded text-xs font-bold border', Number(info.rank)===1?'bg-yellow-100 text-yellow-700 border-yellow-200':'bg-gray-100 text-gray-600 border-gray-200']">{{ info.rank }}등급</span>
                    <span v-else>-</span>
                  </td>
                  <td class="px-4 py-3.5 text-gray-500 text-xs">{{ info.rankStr || '-' }} / {{ info.totalCount || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <style scoped>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
  </style>