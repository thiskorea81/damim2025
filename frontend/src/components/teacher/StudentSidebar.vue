<script setup>
    import { ref, computed, watch } from 'vue';
    import { List, Filter, Search, CheckCircle, Trash2, Download } from 'lucide-vue-next';
    import { calculateBytes } from '../../utils/byteCalculator';
    
    const props = defineProps(['records', 'selectedId', 'categories', 'searchQuery', 'selectedCategory']);
    const emit = defineEmits(['update:searchQuery', 'update:selectedCategory', 'select', 'delete-selected']);
    
    const selectedIds = ref(new Set());
    
    // 검색이나 필터가 바뀌면 선택 초기화
    watch([() => props.searchQuery, () => props.selectedCategory, () => props.records], () => {
      selectedIds.value.clear();
    });
    
    const isAllSelected = computed(() => {
      return props.records.length > 0 && props.records.every(r => selectedIds.value.has(r.id));
    });
    
    const toggleSelectAll = (e) => {
      if (e.target.checked) {
        props.records.forEach(r => selectedIds.value.add(r.id));
      } else {
        selectedIds.value.clear();
      }
    };
    
    const toggleSelection = (id) => {
      if (selectedIds.value.has(id)) selectedIds.value.delete(id);
      else selectedIds.value.add(id);
    };
    
    const handleDeleteSelected = () => {
      if (selectedIds.value.size === 0) return;
      emit('delete-selected', Array.from(selectedIds.value));
      selectedIds.value.clear();
    };
    
    const getCleanContent = (text) => {
      if (!text) return '';
      let cleaned = text.replace(/^\[.*?\]\s*/, '').replace(/\s*\(.*(수정됨|요약됨|다듬음|반영됨).*\)$/, '');
      return cleaned.trim();
    };
    const getCleanBytes = (text) => calculateBytes(getCleanContent(text));
    
    // --- [신규] CSV 다운로드 로직 ---
    const downloadCsv = () => {
      if (props.records.length === 0) return alert("다운로드할 데이터가 없습니다.");
    
      // 1. 가장 긴 히스토리 길이 찾기 (헤더 생성용)
      let maxHistory = 0;
      props.records.forEach(r => {
        if (r.history && r.history.length > maxHistory) maxHistory = r.history.length;
      });
    
      // 2. CSV 헤더 생성
      const headers = ['학번', '이름', '분류', '생기부(최종확인)', '바이트수', '상태'];
      for (let i = 1; i <= maxHistory; i++) {
        headers.push(`Ver.${i} 작성자`);
        headers.push(`Ver.${i} 내용`);
      }
    
      // 3. 데이터 행 생성
      const rows = props.records.map(r => {
        // 텍스트 내의 콤마(,), 따옴표("), 줄바꿈 처리 -> CSV 표준 이스케이프
        const escapeCsv = (str) => {
          if (!str) return '';
          return `"${str.toString().replace(/"/g, '""')}"`;
        };
    
        // 기본 정보
        const row = [
          r.studentId,
          r.name,
          r.category,
          escapeCsv(r.content), // 최종 내용
          calculateBytes(r.content),
          r.status === 'confirmed' ? '최종완료' : (r.status === 'request_modify' ? '수정요청중' : '진행중')
        ];
    
        // 히스토리 정보 (오래된 순서대로 1, 2, 3...)
        const history = r.history || [];
        for (let i = 0; i < maxHistory; i++) {
          const h = history[i];
          if (h) {
            let actorName = '';
            if (h.actor === 'ai') actorName = 'AI';
            else if (h.actor === 'teacher') actorName = '선생님';
            else actorName = '학생';
    
            row.push(actorName);
            row.push(escapeCsv(h.content));
          } else {
            // 히스토리가 없는 버전은 공란 처리
            row.push('');
            row.push('');
          }
        }
        return row.join(',');
      });
    
      // 4. CSV 파일 생성 및 다운로드 (BOM 추가로 한글 깨짐 방지)
      const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // 파일명 생성 (예: 2024_생기부_목록_자율.csv)
      const categoryName = props.selectedCategory || '전체';
      const fileName = `생기부_목록_${categoryName}_${new Date().toISOString().slice(0,10)}.csv`;
    
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    </script>
    
    <template>
      <div class="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        
        <div class="p-4 border-b bg-gray-50 space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-gray-800 flex items-center gap-2">
              <List class="w-5 h-5 text-gray-600" /> 학생 목록
              <span class="text-xs text-gray-400 font-normal">({{ records.length }})</span>
            </h3>
            
            <div class="relative">
              <select 
                :value="selectedCategory"
                @input="$emit('update:selectedCategory', $event.target.value)"
                class="appearance-none bg-white border border-gray-300 text-xs py-1.5 pl-3 pr-8 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer"
              >
                <option value="">전체 분류</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
              <Filter class="w-3 h-3 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
    
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Search class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input 
                :value="searchQuery"
                @input="$emit('update:searchQuery', $event.target.value)"
                type="text" 
                placeholder="이름/학번 검색" 
                class="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
            </div>
            
            <button 
              @click="downloadCsv"
              class="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center justify-center shadow-sm"
              title="CSV로 다운로드"
            >
              <Download class="w-4 h-4" />
            </button>
          </div>
        </div>
    
        <div class="px-4 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center text-xs">
          <label class="flex items-center gap-2 cursor-pointer select-none text-gray-600 font-bold">
            <input 
              type="checkbox" 
              :checked="isAllSelected" 
              @change="toggleSelectAll"
              class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            >
            전체 선택
          </label>
          
          <button 
            v-if="selectedIds.size > 0"
            @click="handleDeleteSelected"
            class="flex items-center gap-1 text-red-600 font-bold hover:bg-red-50 px-2 py-1 rounded transition"
          >
            <Trash2 class="w-3 h-3" />
            {{ selectedIds.size }}건 삭제
          </button>
        </div>
    
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <div v-if="records.length === 0" class="text-center py-10 text-gray-400 text-sm">데이터가 없습니다.</div>
          
          <div 
            v-for="rec in records" 
            :key="rec.id"
            class="flex items-stretch rounded-xl border transition group hover:bg-gray-50 bg-white"
            :class="selectedId === rec.id ? 'border-indigo-500 ring-1 ring-indigo-500 z-10' : 'border-gray-100'"
          >
            <div class="flex items-center px-3 cursor-pointer" @click.stop="toggleSelection(rec.id)">
              <input 
                type="checkbox" 
                :checked="selectedIds.has(rec.id)"
                @change="toggleSelection(rec.id)"
                class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              >
            </div>
    
            <button 
              @click="$emit('select', rec.id)"
              class="flex-1 text-left p-3 pl-0"
            >
              <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-gray-800 text-sm">{{ rec.studentId }} {{ rec.name }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded font-bold border"
                      :class="rec.category === '진로' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-100 text-gray-600 border-gray-200'">
                  {{ rec.category }}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-2">
                <span v-if="rec.isConfirmed" class="text-[10px] flex items-center gap-1 text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                  <CheckCircle class="w-3 h-3" /> 승인됨
                </span>
                <span v-else-if="rec.status === 'request_modify'" class="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">
                  수정 요청중
                </span>
                <span v-else-if="rec.status === 'waiting_approval'" class="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                  학생 확인 완료
                </span>
                <span v-else class="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  작성 중
                </span>
                
                <span class="text-[10px] text-gray-400 ml-auto font-mono">
                  {{ getCleanBytes(rec.content) }} B
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </template>