<script setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
  import { db } from '../../../firebase';
  import { FileCheck, AlertCircle, Loader2 } from 'lucide-vue-next';
  
  const props = defineProps(['user']);
  const emit = defineEmits(['edit']);
  
  const items = ref([]);
  const loading = ref(true);
  let unsubscribe = null;
  
  onMounted(() => {
    if (!props.user) return;
    
    const q = query(
      collection(db, 'trip_reports'),
      where('userId', '==', props.user.uid),
      orderBy('createdAt', 'desc')
    );
  
    unsubscribe = onSnapshot(q, (snapshot) => {
      items.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loading.value = false;
    });
  });
  
  onUnmounted(() => { if (unsubscribe) unsubscribe(); });
  
  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
  };
  
  const statusClass = (s) => {
    if (s === 'approved') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (s === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };
  </script>
  
  <template>
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-gray-800 flex items-center gap-2">
          <FileCheck class="w-5 h-5 text-purple-600"/> 결과보고서 제출 내역
        </h3>
      </div>
  
      <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div v-if="loading" class="text-center py-10 text-gray-400">
          <Loader2 class="w-6 h-6 animate-spin mx-auto mb-2"/> 불러오는 중...
        </div>
        <div v-else-if="items.length === 0" class="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
          <AlertCircle class="w-8 h-8 mx-auto mb-2 opacity-50"/>
          제출된 보고서가 없습니다.
        </div>
  
        <div v-else class="space-y-3">
          <div v-for="item in items" :key="item.id" class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm relative group">
            <div class="absolute top-4 right-4">
              <span :class="['px-3 py-1 rounded-full text-xs font-bold border', statusClass(item.status)]">
                {{ item.status === 'approved' ? '확인됨' : (item.status === 'rejected' ? '반려됨' : '제출완료') }}
              </span>
            </div>
  
            <h4 class="font-bold text-gray-800 mb-1">{{ item.title }}</h4>
            <p class="text-sm text-gray-500 mb-1">
               <span class="font-bold text-gray-700">{{ item.destination }}</span> ({{ item.period }})
            </p>
            <p class="text-xs text-gray-400">제출일: {{ formatDate(item.createdAt) }}</p>
  
            <div v-if="item.status === 'rejected' && item.rejectReason" class="mt-3 bg-red-50 p-3 rounded-lg text-sm text-red-700 border border-red-100">
               <span class="font-bold mr-1">반려 사유:</span> {{ item.rejectReason }}
               <button @click="$emit('edit', item)" class="text-xs underline ml-2 text-red-500 hover:text-red-700">수정하기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>