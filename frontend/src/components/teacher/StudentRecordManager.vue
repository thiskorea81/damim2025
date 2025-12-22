<script setup>
    import { ref, onMounted, provide } from 'vue';
    import { collection, getDocs, query, orderBy } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { Upload, List, GitPullRequest, Layers, BookOpen } from 'lucide-vue-next';
    
    // --- 하위 컴포넌트 임포트 ---
    import RecordUpload from './RecordUpload.vue';
    import RecordList from './RecordList.vue';
    import RequestManager from './RequestManager.vue';
    
    // --- 상태 변수 ---
    const currentTab = ref('requests'); // 기본 탭: 수정요청
    const mainMode = ref('creative');   // 'creative'(창체) vs 'subject'(교과)
    const loading = ref(false);
    const records = ref([]);
    
    // --- 데이터 불러오기 (공통 사용) ---
    const fetchRecords = async () => {
      loading.value = true;
      try {
        const q = query(collection(db, 'student_records'), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        records.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error("데이터 로드 실패:", e);
      } finally {
        loading.value = false;
      }
    };
    
    onMounted(fetchRecords);
    </script>
    
    <template>
      <div class="bg-gray-50 min-h-screen p-6 font-sans">
        
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 mb-6 flex justify-between items-center">
          <div class="flex gap-2">
            <button 
              @click="currentTab = 'upload'"
              class="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition"
              :class="currentTab === 'upload' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'"
            >
              <Upload class="w-4 h-4" /> 자료 업로드
            </button>
            <button 
              @click="currentTab = 'list'"
              class="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition"
              :class="currentTab === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'"
            >
              <List class="w-4 h-4" /> 전체 목록 관리
            </button>
            <button 
              @click="currentTab = 'requests'"
              class="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition relative"
              :class="currentTab === 'requests' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'"
            >
              <GitPullRequest class="w-4 h-4" /> 
              수정 요청 / AI 관리
            </button>
          </div>
    
          <div class="flex bg-gray-100 p-1 rounded-lg">
            <button 
              @click="mainMode = 'creative'"
              class="px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1"
              :class="mainMode === 'creative' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400'"
            >
              <Layers class="w-3 h-3" /> 창체
            </button>
            <button 
              @click="mainMode = 'subject'"
              class="px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1"
              :class="mainMode === 'subject' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400'"
            >
              <BookOpen class="w-3 h-3" /> 교과
            </button>
          </div>
        </div>
    
        <RecordUpload 
          v-if="currentTab === 'upload'" 
          @refresh="fetchRecords" 
        />
    
        <RecordList 
          v-if="currentTab === 'list'" 
          :records="records"
          :main-mode="mainMode"
          @refresh="fetchRecords" 
        />
    
        <RequestManager 
          v-if="currentTab === 'requests'"
          :records="records"
          :main-mode="mainMode"
          @refresh="fetchRecords"
        />
    
      </div>
    </template>