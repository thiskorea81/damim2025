<script setup>
    import { ref, computed } from 'vue';
    import { doc, deleteDoc } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { User } from 'lucide-vue-next';
    
    // 하위 컴포넌트
    import StudentSidebar from './StudentSidebar.vue';
    import RecordDetail from './RecordDetail.vue';
    
    const props = defineProps(['records', 'mainMode']);
    const emit = defineEmits(['refresh']);
    
    const selectedRecordId = ref(null);
    const selectedCategory = ref('');
    const searchQuery = ref('');
    
    const CREATIVE_KEYWORDS = ['자율', '진로', '동아리', '행동'];
    
    // 데이터 필터링
    const filteredRecords = computed(() => {
      return props.records.filter(r => {
        const isCreative = CREATIVE_KEYWORDS.some(k => r.category && r.category.includes(k));
        if (props.mainMode === 'creative' && !isCreative) return false;
        if (props.mainMode === 'subject' && isCreative) return false;
        
        if (selectedCategory.value && r.category !== selectedCategory.value) return false;
        
        if (searchQuery.value) {
          const query = searchQuery.value.toLowerCase();
          const matchName = r.name?.toLowerCase().includes(query);
          const matchId = r.studentId?.includes(query);
          if (!matchName && !matchId) return false;
        }
        return true;
      });
    });
    
    const availableCategories = computed(() => {
      const categories = new Set(props.records.map(r => r.category).filter(Boolean));
      return Array.from(categories).sort();
    });
    
    const selectedRecord = computed(() => {
      return props.records.find(r => r.id === selectedRecordId.value);
    });
    
    // --- 일괄 삭제 처리 ---
    const handleBulkDelete = async (ids) => {
      if (!confirm(`선택한 ${ids.length}개의 생기부 데이터를 정말 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`)) return;
      
      try {
        const deletePromises = ids.map(id => deleteDoc(doc(db, 'student_records', id)));
        await Promise.all(deletePromises);
        
        // 만약 현재 보고 있던 상세 페이지의 학생이 삭제되었다면 선택 해제
        if (selectedRecordId.value && ids.includes(selectedRecordId.value)) {
          selectedRecordId.value = null;
        }
        
        alert(`${ids.length}건이 삭제되었습니다.`);
        emit('refresh');
      } catch (e) {
        console.error(e);
        alert("삭제 중 오류가 발생했습니다: " + e.message);
      }
    };
    
    const handleRefresh = () => emit('refresh');
    const handleSelect = (id) => selectedRecordId.value = id;
    </script>
    
    <template>
      <div class="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
        
        <StudentSidebar 
          :records="filteredRecords"
          :selected-id="selectedRecordId"
          :categories="availableCategories"
          v-model:searchQuery="searchQuery"
          v-model:selectedCategory="selectedCategory"
          @select="handleSelect"
          @delete-selected="handleBulkDelete"
        />
    
        <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          <div v-if="!selectedRecord" class="flex-1 flex flex-col items-center justify-center text-gray-300">
            <User class="w-16 h-16 mb-4 opacity-20" />
            <p>왼쪽 목록에서 학생을 선택하여<br>히스토리 확인 및 승인을 진행하세요.</p>
          </div>
    
          <RecordDetail 
            v-else
            :record="selectedRecord"
            @refresh="handleRefresh"
            @deselect="selectedRecordId = null"
          />
        </div>
    
      </div>
    </template>