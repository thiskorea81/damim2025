<script setup>
    import { ref, onMounted } from 'vue';
    import { collection, query, orderBy, getDocs } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { BookOpen, Upload, PenTool, GitPullRequest, List as ListIcon } from 'lucide-vue-next';
    
    // 하위 컴포넌트 임포트
    import RecordList from './RecordList.vue';
    import RecordUpload from './RecordUpload.vue';
    import TeacherAiWriter from './TeacherAiWriter.vue';
    import RequestManager from './RequestManager.vue'; // AI 수정 요청 관리
    
    const records = ref([]);
    const loading = ref(false);
    const activeTab = ref('list'); // list | upload | ai_writer | requests
    const mainMode = ref('subject'); // subject(교과) | creative(창체)
    
    // 데이터 로드 함수
    const fetchRecords = async () => {
      loading.value = true;
      records.value = [];
      try {
        const q = query(collection(db, 'student_records'), orderBy('studentId', 'asc'));
        const snapshot = await getDocs(q);
        records.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.error(e);
      } finally {
        loading.value = false;
      }
    };
    
    onMounted(fetchRecords);
    </script>
    
    <template>
      <div class="h-full flex flex-col">
        <div class="bg-white border-b px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 mb-6 rounded-t-xl">
          <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen class="w-6 h-6 text-indigo-600"/> 생기부 통합 관리
          </h2>
          
          <div class="flex p-1 bg-gray-100 rounded-xl overflow-x-auto max-w-full">
            <button 
              @click="activeTab = 'list'"
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap"
              :class="activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            >
              <ListIcon class="w-4 h-4"/> 목록 관리
            </button>
            <button 
              @click="activeTab = 'requests'"
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap"
              :class="activeTab === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            >
              <GitPullRequest class="w-4 h-4"/> AI 수정 요청
            </button>
            <button 
              @click="activeTab = 'ai_writer'"
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap"
              :class="activeTab === 'ai_writer' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            >
              <PenTool class="w-4 h-4"/> AI 작성 도우미
            </button>
            <button 
              @click="activeTab = 'upload'"
              class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap"
              :class="activeTab === 'upload' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            >
              <Upload class="w-4 h-4"/> 자료 업로드
            </button>
          </div>
        </div>
    
        <div v-if="activeTab === 'list' || activeTab === 'requests'" class="flex justify-end px-6 mb-4">
          <div class="inline-flex bg-white border rounded-lg p-1 shadow-sm">
            <button 
              @click="mainMode = 'subject'"
              class="px-4 py-1.5 text-xs font-bold rounded transition"
              :class="mainMode === 'subject' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'"
            >
              교과세특
            </button>
            <button 
              @click="mainMode = 'creative'"
              class="px-4 py-1.5 text-xs font-bold rounded transition"
              :class="mainMode === 'creative' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'"
            >
              창체활동
            </button>
          </div>
        </div>
    
        <div class="flex-1 overflow-hidden px-6 pb-6">
          
          <RecordList 
            v-if="activeTab === 'list'"
            :records="records" 
            :mainMode="mainMode" 
            @refresh="fetchRecords" 
          />
    
          <RequestManager 
            v-if="activeTab === 'requests'"
            :records="records"
            :mainMode="mainMode"
            @refresh="fetchRecords"
          />
    
          <TeacherAiWriter 
            v-if="activeTab === 'ai_writer'"
          />
    
          <RecordUpload 
            v-if="activeTab === 'upload'"
            @refresh="fetchRecords"
          />
    
        </div>
      </div>
    </template>