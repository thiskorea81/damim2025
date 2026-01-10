<script setup>
  import { ref, onMounted } from 'vue';
  import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
  import { db } from '../../../firebase';
  import { Loader2, Plane, ChevronRight, AlertCircle, Printer } from 'lucide-vue-next';
  
  const props = defineProps(['user']);
  const emit = defineEmits(['edit', 'print-notification']); // print 이벤트 추가
  
  const trips = ref([]);
  const loading = ref(true);
  
  const fetchTrips = async () => {
    loading.value = true;
    try {
      const q = query(
        collection(db, 'experiential_learning'),
        where('userId', '==', props.user.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 정렬
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      trips.value = list;
    } catch (e) {
      console.error(e);
    } finally {
      loading.value = false;
    }
  };
  
  onMounted(fetchTrips);
  
  // [수정] 상태 텍스트 한글화
  const getStatusText = (status) => {
    if (status === 'approved') return '승인'; // '승인'으로 변경
    if (status === 'rejected') return '반려';
    if (status === 'submitted') return '대기'; // pending도 대기
    return '대기';
  };
  
  const getStatusClass = (status) => {
    if (status === 'approved') return 'bg-green-50 text-green-700 border-green-200';
    if (status === 'rejected') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-gray-50 text-gray-500 border-gray-200';
  };
  </script>
  
  <template>
    <div class="h-full flex flex-col">
      <div v-if="loading" class="flex-1 flex justify-center items-center">
        <Loader2 class="w-8 h-8 animate-spin text-gray-400"/>
      </div>
      
      <div v-else-if="trips.length === 0" class="flex-1 flex flex-col justify-center items-center text-gray-400">
        <AlertCircle class="w-10 h-10 mb-2 opacity-20"/>
        <p class="text-sm">신청 내역이 없습니다.</p>
      </div>
  
      <div v-else class="space-y-3 overflow-y-auto pr-2 pb-4">
        <div 
          v-for="item in trips" 
          :key="item.id"
          class="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50/30 transition group relative"
        >
          <div class="flex-1 cursor-pointer flex items-center gap-3" @click="$emit('edit', item)">
            <div class="p-2 bg-orange-100 text-orange-600 rounded-lg shrink-0">
              <Plane class="w-5 h-5"/>
            </div>
            <div>
              <h4 class="font-bold text-gray-800 text-sm line-clamp-1">{{ item.plan?.location || item.location || '장소 미상' }}</h4>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ item.period?.startDate }} 신청
              </p>
            </div>
          </div>
  
          <div class="flex items-center gap-2 z-10">
             <button 
               v-if="item.status === 'approved'"
               @click.stop="$emit('print-notification', item)"
               class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
               title="통보서 출력"
             >
               <Printer class="w-4 h-4"/>
             </button>
  
            <span class="text-[10px] font-bold px-2 py-0.5 rounded border" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </span>
            <ChevronRight class="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition"/>
          </div>
        </div>
      </div>
    </div>
  </template>