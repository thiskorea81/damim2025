<script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'; // onSnapshot 추가
  import { db } from '../../../firebase';
  import { Plane, AlertCircle, FileText, Printer, Edit3, Loader2 } from 'lucide-vue-next';
  
  const props = defineProps(['user']);
  const emit = defineEmits(['edit', 'print-notification']); // 통보서 출력 이벤트 포함
  
  const items = ref([]);
  const loading = ref(true);
  let unsubscribe = null; // 리스너 해제용 변수
  
  onMounted(() => {
    if (!props.user) return;
  
    const q = query(
      collection(db, 'experiential_learning'),
      where('userId', '==', props.user.uid),
      orderBy('createdAt', 'desc')
    );
  
    // [핵심] 실시간 구독 시작
    unsubscribe = onSnapshot(q, (snapshot) => {
      items.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      loading.value = false;
    }, (error) => {
      console.error("데이터 불러오기 실패:", error);
      loading.value = false;
    });
  });
  
  // 컴포넌트가 사라질 때 리스너 해제 (메모리 누수 방지)
  onUnmounted(() => {
    if (unsubscribe) unsubscribe();
  });
  
  // 날짜 포맷
  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
  };
  
  // 기간 포맷
  const formatPeriod = (item) => {
    if (item.period?.startDate) return `${item.period.startDate} ~ ${item.period.endDate}`;
    if (item.startDate) return `${item.startDate} ~ ${item.endDate}`;
    return '-';
  };
  
  const statusClass = (s) => {
    if (s === 'approved') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200'; // pending
  };
  
  const statusText = (s) => {
    if (s === 'approved') return '승인됨';
    if (s === 'rejected') return '반려됨';
    return '검토중';
  };
  </script>
  
  <template>
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-gray-800 flex items-center gap-2">
          <Plane class="w-5 h-5 text-green-600"/> 체험학습 신청 내역
        </h3>
      </div>
  
      <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div v-if="loading" class="text-center py-10 text-gray-400">
          <Loader2 class="w-6 h-6 animate-spin mx-auto mb-2"/> 불러오는 중...
        </div>
        <div v-else-if="items.length === 0" class="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
          <AlertCircle class="w-8 h-8 mx-auto mb-2 opacity-50"/>
          신청 내역이 없습니다.
        </div>
  
        <div v-else class="space-y-3">
          <div v-for="item in items" :key="item.id" class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            
            <div class="absolute top-4 right-4 flex flex-col items-end gap-2">
              <span :class="['px-3 py-1 rounded-full text-xs font-bold border', statusClass(item.status)]">
                {{ statusText(item.status) }}
              </span>
              <button v-if="item.status === 'approved'" 
                      @click="$emit('print-notification', item)"
                      class="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition">
                <Printer class="w-3 h-3"/> 통보서 출력
              </button>
            </div>
  
            <div class="pr-20">
              <h4 class="font-bold text-gray-800 mb-1 text-lg">{{ item.plan?.location || item.location }}</h4>
              <p class="text-sm text-gray-500 flex items-center gap-2 mb-2">
                <span class="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600">기간</span>
                {{ formatPeriod(item) }}
                <span class="text-xs text-blue-600 font-bold">({{ item.period?.totalDays || item.totalDays }}일간)</span>
              </p>
              <p class="text-xs text-gray-400">신청일: {{ formatDate(item.createdAt) }}</p>
            </div>
            
            <div v-if="item.status === 'rejected' && item.rejectReason" class="mt-3 bg-red-50 p-3 rounded-lg text-sm text-red-700 border border-red-100">
              <span class="font-bold mr-1">반려 사유:</span> {{ item.rejectReason }}
              <button @click="$emit('edit', item)" class="text-xs underline ml-2 text-red-500 hover:text-red-700">수정해서 다시 제출하기</button>
            </div>
  
          </div>
        </div>
      </div>
    </div>
  </template>