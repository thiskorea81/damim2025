<script setup>
  import { ref, onMounted } from 'vue';
  import { collection, query, orderBy, getDocs } from 'firebase/firestore';
  import { db } from '../../firebase';
  import { Upload, PenTool, GitPullRequest, List as ListIcon } from 'lucide-vue-next';
  
  // 하위 컴포넌트
  import RecordList from './RecordList.vue';
  import RecordUpload from './RecordUpload.vue';
  import TeacherAiWriter from './TeacherAiWriter.vue';
  import RequestManager from './RequestManager.vue';
  
  const records = ref([]);
  const loading = ref(false);
  const activeTab = ref('list'); // list | requests | ai_writer | upload
  const mainMode = ref('subject'); // subject | creative
  
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
  
  // 탭 정의
  const TABS = [
    { id: 'list', label: '목록', icon: ListIcon, colorClass: 'text-indigo-600' },
    { id: 'requests', label: '요청', icon: GitPullRequest, colorClass: 'text-orange-600' },
    { id: 'ai_writer', label: 'AI작성', icon: PenTool, colorClass: 'text-purple-600' },
    { id: 'upload', label: '업로드', icon: Upload, colorClass: 'text-green-600' }
  ];
  </script>
  
  <template>
    <div class="h-full flex gap-0 pr-14"> <div class="flex-1 h-full bg-white border border-gray-300 rounded-xl shadow-sm overflow-hidden relative z-10">
        <div class="h-full flex flex-col">
          
          <div v-if="['list', 'requests'].includes(activeTab)" class="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
            <h3 class="font-bold text-gray-700 text-sm flex items-center gap-2">
              <component :is="TABS.find(t=>t.id===activeTab).icon" class="w-4 h-4" :class="TABS.find(t=>t.id===activeTab).colorClass"/>
              {{ activeTab === 'list' ? '생기부 목록 관리' : 'AI 수정 요청 내역' }}
            </h3>
            <div class="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
              <button 
                @click="mainMode = 'subject'"
                class="px-3 py-1 text-xs font-bold rounded transition"
                :class="mainMode === 'subject' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-gray-600'"
              >
                교과세특
              </button>
              <button 
                @click="mainMode = 'creative'"
                class="px-3 py-1 text-xs font-bold rounded transition"
                :class="mainMode === 'creative' ? 'bg-purple-50 text-purple-700' : 'text-gray-400 hover:text-gray-600'"
              >
                창체활동
              </button>
            </div>
          </div>
  
          <div class="flex-1 overflow-hidden relative">
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
      </div>
  
      <div class="flex flex-col pt-8 -ml-[1px] z-20 w-12 shrink-0">
        <button 
          v-for="tab in TABS" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="group relative w-12 h-14 mb-2 flex flex-col items-center justify-center text-[10px] font-bold transition-all duration-200 rounded-r-xl border-y border-r border-l-0 outline-none"
          :class="[
            activeTab === tab.id 
              ? 'bg-white border-gray-300 text-gray-800 shadow-sm translate-x-0 z-30' 
              : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 -translate-x-1 z-0'
          ]"
        >
          <div v-if="activeTab === tab.id" class="absolute left-0 top-0 bottom-0 w-[2px] bg-white -ml-[1px]"></div>
          
          <component :is="tab.icon" class="w-5 h-5 mb-1" :class="activeTab === tab.id ? tab.colorClass : 'text-gray-400'"/>
          <span class="writing-vertical-lr">{{ tab.label }}</span>
        </button>
      </div>
  
    </div>
  </template>
  
  <style scoped>
  /* 세로 쓰기용 (필요시) - 현재는 가로 텍스트가 짧아서 그대로 둠 */
  .writing-vertical-lr {
    /* writing-mode: vertical-lr; */
  }
  </style>