<script setup>
    import { ref, onMounted } from 'vue';
    import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
    import { db } from '../../../firebase';
    import { Loader2, FileCheck, ChevronRight, AlertCircle } from 'lucide-vue-next';
    
    const props = defineProps({
      user: Object
    });
    
    const emit = defineEmits(['edit']);
    
    const reports = ref([]);
    const loading = ref(true);
    
    const fetchReports = async () => {
      loading.value = true;
      try {
        // userId 기준으로 내 보고서 조회
        const q = query(
          collection(db, 'trip_reports'),
          where('userId', '==', props.user.uid)
          // 색인 문제 발생 시 orderBy 제거하거나 복합 색인 생성 필요
          // orderBy('createdAt', 'desc') 
        );
        
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
    
        // 클라이언트 사이드 정렬 (색인 오류 방지용)
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        reports.value = list;
      } catch (e) {
        console.error("보고서 로드 실패:", e);
      } finally {
        loading.value = false;
      }
    };
    
    onMounted(fetchReports);
    
    const handleClick = (item) => {
      // 상위 컴포넌트로 이벤트 전달 (type: '결과보고서' 명시)
      emit('edit', { type: '결과보고서', ...item });
    };
    
    // 상태 뱃지 스타일
    const getStatusClass = (status) => {
      if (status === 'submitted') return 'bg-blue-50 text-blue-600 border-blue-100';
      if (status === 'approved') return 'bg-green-50 text-green-600 border-green-100'; // 교사가 확인했다면
      return 'bg-gray-50 text-gray-500 border-gray-100';
    };
    </script>
    
    <template>
      <div class="h-full flex flex-col">
        <div v-if="loading" class="flex-1 flex justify-center items-center">
          <Loader2 class="w-8 h-8 animate-spin text-gray-400"/>
        </div>
    
        <div v-else-if="reports.length === 0" class="flex-1 flex flex-col justify-center items-center text-gray-400">
          <AlertCircle class="w-10 h-10 mb-2 opacity-20"/>
          <p class="text-sm">제출된 결과보고서가 없습니다.</p>
        </div>
    
        <div v-else class="space-y-3 overflow-y-auto pr-2 pb-4">
          <div 
            v-for="item in reports" 
            :key="item.id"
            @click="handleClick(item)"
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-300 hover:bg-purple-50/30 transition cursor-pointer group"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                <FileCheck class="w-5 h-5"/>
              </div>
              <div>
                <h4 class="font-bold text-gray-800 text-sm line-clamp-1">{{ item.title || '제목 없음' }}</h4>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ item.period }}
                </p>
              </div>
            </div>
    
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded border" :class="getStatusClass(item.status)">
                {{ item.status === 'submitted' ? '제출완료' : (item.status === 'approved' ? '확인됨' : '대기') }}
              </span>
              <ChevronRight class="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition"/>
            </div>
          </div>
        </div>
      </div>
    </template>