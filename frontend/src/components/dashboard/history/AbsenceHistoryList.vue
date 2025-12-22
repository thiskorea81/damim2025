<script setup>
    import { ref, onMounted } from 'vue';
    import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
    import { db } from '../../../firebase'; // 경로 주의 (상황에 맞게 ../ 조정)
    import { Loader2, Edit, Trash2 } from 'lucide-vue-next';
    
    // getAppId가 firebase.js에 없다면 제거하거나, 있다면 import 하세요.
    // 여기서는 일반적인 상황을 가정해 artifacts 경로 대신 'absences' 컬렉션을 사용하는지,
    // 아니면 제공해주신 그대로 'artifacts/...' 경로를 사용하는지 확인이 필요합니다.
    // 일단 주신 코드 그대로 'artifacts' 경로를 사용합니다.
    import { getAppId } from '../../../firebase'; 
    
    const props = defineProps({
      user: Object
    });
    
    const emit = defineEmits(['edit']);
    
    const history = ref([]);
    const loading = ref(true);
    
    const formatDate = (timestamp) => {
      if (!timestamp) return '-';
      const date = timestamp.toDate();
      return `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`;
    };
    
    const getStatusLabel = (status) => {
      if (status === '제출완료') return '진행중';
      return status;
    };
    
    const getStatusClass = (status) => {
      switch (status) {
        case '승인': return 'bg-blue-100 text-blue-700 border-blue-200';
        case '반려': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
      }
    };
    
    const fetchHistory = async () => {
      if (!props.user) return;
      loading.value = true;
      
      try {
        const appId = getAppId ? getAppId() : 'default'; // getAppId 함수가 없다면 예외처리 필요
        
        // [중요] 제공해주신 코드는 'submissions' 하위 컬렉션을 사용합니다.
        // 만약 이전 대화처럼 'absences' 컬렉션을 쓴다면 경로를 수정해야 합니다.
        // 여기서는 주신 코드를 존중하여 그대로 유지합니다.
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'submissions'),
          where('userId', '==', props.user.uid)
        );
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        history.value = list;
      } catch (e) {
        console.error("결석신고서 로드 실패:", e);
        // 혹시 컬렉션이 없어서 에러가 난다면 absences 컬렉션 시도 (fallback)
        // fetchFromAbsencesCollection(); 
      } finally {
        loading.value = false;
      }
    };
    
    const handleDelete = async (item) => {
      if (item.status === '승인') return alert('이미 승인된 문서는 삭제할 수 없습니다.');
      if (!confirm('정말 삭제하시겠습니까?')) return;
      
      try {
        const appId = getAppId ? getAppId() : 'default';
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'submissions', item.id));
        alert('삭제되었습니다.');
        fetchHistory();
      } catch (e) {
        console.error(e);
        alert('삭제 실패');
      }
    };
    
    const handleEdit = (item) => {
      if (item.status === '승인') return alert('이미 승인된 문서는 수정할 수 없습니다.');
      emit('edit', item);
    };
    
    onMounted(fetchHistory);
    </script>
    
    <template>
      <div> <div class="header">
          <h3 class="title">📋 결석신고서 내역</h3>
          <button @click="fetchHistory" class="refresh-btn">새로고침</button>
        </div>
    
        <div v-if="loading" class="text-center py-12"><Loader2 class="animate-spin mx-auto text-blue-500"/></div>
    
        <div v-else-if="history.length === 0" class="empty-state">
          제출한 내역이 없습니다.
        </div>
    
        <div v-else class="table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th>종류</th>
                <th>기간</th>
                <th>사유</th>
                <th>제출일</th>
                <th>진행상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in history" :key="item.id">
                <td>
                  <span class="type-badge">{{ item.type || '결석계' }}</span>
                  <div v-if="item.absenceType === '생리결석'" class="sub-badge">생리</div>
                </td>
                
                <td class="text-sm">
                  {{ item.period?.start || item.startDate }} <br> ~ {{ item.period?.end || item.endDate }}
                </td>
                
                <td class="text-left max-w-[150px]">
                  <div class="truncate text-sm text-gray-700">{{ item.reason }}</div>
                </td>
    
                <td class="text-xs text-gray-500">
                  {{ formatDate(item.submittedAt || item.createdAt) }}
                </td>
    
                <td>
                  <span :class="['status-badge', getStatusClass(item.status)]">
                    {{ getStatusLabel(item.status) }}
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
    /* 제공해주신 CSS 그대로 사용 (일부 공통화 가능하지만 독립성 위해 유지) */
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
    .sub-badge { font-size: 0.7rem; background: #fce7f3; color: #db2777; display: inline-block; padding: 0 4px; border-radius: 4px; margin-top: 2px; }
    .status-badge { font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 999px; font-weight: 700; border: 1px solid transparent; display: inline-block; min-width: 60px; }
    .action-group { display: flex; justify-content: center; gap: 0.5rem; }
    .icon-btn { padding: 0.4rem; border-radius: 0.375rem; transition: background 0.2s; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .icon-btn.edit { color: #2563eb; background: #eff6ff; } .icon-btn.edit:hover { background: #dbeafe; }
    .icon-btn.delete { color: #ef4444; background: #fef2f2; } .icon-btn.delete:hover { background: #fee2e2; }
    </style>