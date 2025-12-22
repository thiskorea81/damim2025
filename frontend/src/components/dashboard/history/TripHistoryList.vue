<script setup>
    import { ref, onMounted } from 'vue';
    import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
    import { db } from '../../../firebase';
    import { Loader2, Edit, Trash2 } from 'lucide-vue-next';
    
    const props = defineProps({ user: Object });
    const emit = defineEmits(['edit']);
    
    const history = ref([]);
    const loading = ref(true);
    
    const formatDate = (timestamp) => {
      if (!timestamp) return '-';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`;
    };
    
    const getStatusClass = (status) => {
      switch (status) {
        case '승인': return 'bg-green-100 text-green-700 border-green-200';
        case '반려': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
      }
    };
    
    const fetchHistory = async () => {
      if (!props.user) return;
      loading.value = true;
      try {
        // 체험학습 컬렉션 조회
        const q = query(
          collection(db, 'experiential_learning'),
          where('userId', '==', props.user.uid)
        );
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
        
        // 최신순 정렬 (createdAt 기준)
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        history.value = list;
      } catch (e) {
        console.error(e);
      } finally {
        loading.value = false;
      }
    };
    
    const handleDelete = async (item) => {
      if (item.status === '승인') return alert('이미 승인된 문서는 삭제할 수 없습니다.');
      if (!confirm('정말 삭제하시겠습니까?')) return;
      
      try {
        await deleteDoc(doc(db, 'experiential_learning', item.id));
        alert('삭제되었습니다.');
        fetchHistory();
      } catch (e) {
        alert('삭제 실패');
      }
    };
    
    const handleEdit = (item) => {
      if (item.status === '승인') return alert('승인된 문서는 수정 불가합니다.');
      emit('edit', item);
    };
    
    onMounted(fetchHistory);
    </script>
    
    <template>
      <div>
        <div class="header">
          <h3 class="title">✈️ 체험학습 신청 내역</h3>
          <button @click="fetchHistory" class="refresh-btn">새로고침</button>
        </div>
    
        <div v-if="loading" class="text-center py-12"><Loader2 class="animate-spin mx-auto text-green-500"/></div>
    
        <div v-else-if="history.length === 0" class="empty-state">
          신청 내역이 없습니다.
        </div>
    
        <div v-else class="table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th>구분</th>
                <th>기간</th>
                <th>장소</th>
                <th>제출일</th>
                <th>진행상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in history" :key="item.id">
                <td><span class="type-badge text-green-700">체험학습</span></td>
                
                <td class="text-sm">
                  {{ item.period?.startDate }} <br> ~ {{ item.period?.endDate }}
                  <div class="text-xs text-blue-500 font-bold mt-1">({{ item.period?.totalDays }}일간)</div>
                </td>
                
                <td class="text-left max-w-[150px]">
                  <div class="truncate text-sm text-gray-700 font-medium">{{ item.plan?.location }}</div>
                </td>
    
                <td class="text-xs text-gray-500">
                  {{ formatDate(item.createdAt) }}
                </td>
    
                <td>
                  <span :class="['status-badge', getStatusClass(item.status)]">
                    {{ item.status }}
                  </span>
                </td>
    
                <td>
                  <div class="action-group">
                    <template v-if="item.status !== '승인'">
                      <button @click="handleEdit(item)" class="icon-btn edit" title="수정"><Edit class="w-4 h-4"/></button>
                      <button @click="handleDelete(item)" class="icon-btn delete" title="삭제"><Trash2 class="w-4 h-4"/></button>
                    </template>
                    <span v-else class="text-xs text-gray-400 font-bold">완료</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    
    <style scoped>
    /* 동일한 스타일 적용 */
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .title { font-size: 1.25rem; font-weight: 800; color: #1f2937; }
    .refresh-btn { font-size: 0.85rem; color: #6b7280; text-decoration: underline; background: none; border: none; cursor: pointer; }
    .refresh-btn:hover { color: #2563eb; }
    .empty-state { text-align: center; padding: 3rem; color: #9ca3af; background: #f9fafb; border-radius: 0.5rem; border: 1px dashed #d1d5db; }
    .table-wrapper { overflow-x: auto; }
    .history-table { width: 100%; border-collapse: collapse; min-width: 600px; }
    .history-table th { background: #f3f4f6; text-align: center; padding: 0.75rem; font-size: 0.85rem; color: #4b5563; font-weight: 700; border-bottom: 2px solid #e5e7eb; }
    .history-table td { padding: 1rem 0.75rem; border-bottom: 1px solid #f3f4f6; text-align: center; vertical-align: middle; }
    .history-table tr:hover { background: #f9fafb; }
    .type-badge { font-weight: 700; color: #374151; font-size: 0.9rem; }
    .status-badge { font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 999px; font-weight: 700; border: 1px solid transparent; display: inline-block; min-width: 60px; }
    .action-group { display: flex; justify-content: center; gap: 0.5rem; }
    .icon-btn { padding: 0.4rem; border-radius: 0.375rem; transition: background 0.2s; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .icon-btn.edit { color: #2563eb; background: #eff6ff; } .icon-btn.edit:hover { background: #dbeafe; }
    .icon-btn.delete { color: #ef4444; background: #fef2f2; } .icon-btn.delete:hover { background: #fee2e2; }
    </style>