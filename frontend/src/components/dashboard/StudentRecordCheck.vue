<script setup>
    import { ref, onMounted, computed, watch, watchEffect } from 'vue';
    import { collection, query, where, getDocs } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { PenTool, Layers, BookOpen } from 'lucide-vue-next';
    import { calculateBytes } from '../../utils/byteCalculator';
    
    // 하위 컴포넌트
    import RecordCard from './RecordCard.vue';
    import ActivityModal from './ActivityModal.vue';
    import FeedbackModal from './FeedbackModal.vue';
    
    const props = defineProps(['user', 'userData']);
    
    // 상태
    const records = ref([]);
    const loading = ref(false);
    const mainMode = ref('creative'); // 'creative' vs 'subject'
    const activeTab = ref('자율');
    
    // 모달 상태
    const isActivityModalOpen = ref(false);
    const isFeedbackModalOpen = ref(false);
    const selectedRecordForFeedback = ref(null);
    
    const CREATIVE_KEYWORDS = ['자율', '진로', '동아리', '행동'];
    const CREATIVE_TABS = [
      { id: '자율', label: '자율활동' },
      { id: '진로', label: '진로활동' },
      { id: '동아리', label: '동아리' },
      { id: '행동', label: '행동발달' },
    ];
    
    // --- 데이터 로드 ---
    const fetchRecords = async () => {
      if (!props.userData) return;
      loading.value = true;
      records.value = []; 
    
      const grade = String(props.userData.grade || '').trim();
      const rawClass = props.userData.classNum || props.userData.class || '';
      const rawNumber = props.userData.number || '';
      const studentId = `${grade}${String(rawClass).padStart(2,'0')}${String(rawNumber).padStart(2,'0')}`; 
    
      try {
        const q = query(collection(db, 'student_records'), where('studentId', '==', studentId));
        const snap = await getDocs(q);
        records.value = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.updatedAt - a.updatedAt);
      } catch (e) {
        console.error(e);
      } finally {
        loading.value = false;
      }
    };
    
    // --- 탭 로직 ---
    const currentTabs = computed(() => {
      if (mainMode.value === 'creative') return CREATIVE_TABS;
      const subjects = new Set(records.value.map(r => r.category).filter(c => c && !CREATIVE_KEYWORDS.some(k => c.includes(k))));
      return Array.from(subjects).sort().map(s => ({ id: s, label: s }));
    });
    
    const filteredRecords = computed(() => {
      return records.value.filter(r => r.category && r.category === activeTab.value);
    });
    
    watch(mainMode, (newMode) => {
      activeTab.value = newMode === 'creative' ? '자율' : (currentTabs.value[0]?.id || '');
    });
    
    // --- 모달 핸들러 ---
    const openActivityModal = () => isActivityModalOpen.value = true;
    const openFeedbackModal = (record) => {
      selectedRecordForFeedback.value = record;
      isFeedbackModalOpen.value = true;
    };
    
    watchEffect(() => { if (props.userData) fetchRecords(); });
    </script>
    
    <template>
      <div class="flex flex-col md:flex-row gap-6 min-h-[600px]">
        <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          
          <div class="flex justify-between items-start mb-6">
            <div>
              <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Layers v-if="mainMode === 'creative'" class="w-6 h-6 text-green-600" />
                <BookOpen v-else class="w-6 h-6 text-blue-600" />
                {{ mainMode === 'creative' ? '창의적 체험활동' : '교과 세부능력' }}
              </h2>
              <p class="text-sm text-gray-500 mt-1">나의 생기부 활동 기록을 확인하고 관리합니다.</p>
            </div>
            <button @click="openActivityModal" class="bg-gray-800 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition flex items-center gap-2 shadow-sm font-bold text-sm">
              <PenTool class="w-4 h-4" /> {{ mainMode === 'creative' ? '활동 추가' : '교과 활동 추가' }}
            </button>
          </div>
    
          <div v-if="currentTabs.length > 0" class="flex border-b border-gray-200 mb-6 overflow-x-auto">
            <button v-for="tab in currentTabs" :key="tab.id" @click="activeTab = tab.id"
              class="px-5 py-3 font-bold text-sm transition-colors relative whitespace-nowrap"
              :class="activeTab === tab.id ? (mainMode === 'creative' ? 'text-green-600' : 'text-blue-600') : 'text-gray-500 hover:text-gray-700'">
              {{ tab.label }}
              <div v-if="activeTab === tab.id" class="absolute bottom-0 left-0 w-full h-0.5" :class="mainMode === 'creative' ? 'bg-green-600' : 'bg-blue-600'"></div>
            </button>
          </div>
          <div v-else class="mb-6 p-10 bg-gray-50 text-gray-400 text-sm rounded-lg text-center border-2 border-dashed">
            등록된 활동이 없습니다. 우측 상단 버튼을 눌러 추가해보세요.
          </div>
    
          <div v-if="loading" class="py-20 text-center text-gray-500">
            <div class="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-3 border-gray-400"></div>
          </div>
          
          <div v-else class="space-y-8">
            <RecordCard 
              v-for="rec in filteredRecords" 
              :key="rec.id" 
              :record="rec"
              :main-mode="mainMode"
              @request-edit="openFeedbackModal"
              @refresh="fetchRecords"
            />
          </div>
        </div>
    
        <div class="w-full md:w-48 flex flex-col gap-3 shrink-0">
          <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 h-full">
            <h3 class="text-xs font-bold text-gray-400 uppercase mb-3 px-1">Menu</h3>
            <button @click="mainMode = 'creative'" class="w-full text-left px-4 py-3 rounded-xl mb-2 transition flex items-center gap-3 font-bold"
              :class="mainMode === 'creative' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'text-gray-600 hover:bg-gray-50'">
              <Layers class="w-5 h-5" /> 창체 점검
            </button>
            <button @click="mainMode = 'subject'" class="w-full text-left px-4 py-3 rounded-xl transition flex items-center gap-3 font-bold"
              :class="mainMode === 'subject' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50'">
              <BookOpen class="w-5 h-5" /> 교과 점검
            </button>
          </div>
        </div>
    
        <ActivityModal 
          v-if="isActivityModalOpen" 
          :is-open="isActivityModalOpen"
          :main-mode="mainMode"
          :active-tab="activeTab"
          :user-data="props.userData"
          @close="isActivityModalOpen = false"
          @refresh="fetchRecords"
        />
    
        <FeedbackModal 
          v-if="isFeedbackModalOpen"
          :is-open="isFeedbackModalOpen"
          :record="selectedRecordForFeedback"
          @close="isFeedbackModalOpen = false"
          @refresh="fetchRecords"
        />
    
      </div>
    </template>