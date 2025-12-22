<script setup>
    import { ref } from 'vue';
    import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
    import { db } from '../../firebase';
    import Papa from 'papaparse';
    import { Upload } from 'lucide-vue-next';
    import { calculateBytes } from '../../utils/byteCalculator';
    
    const emit = defineEmits(['refresh']);
    const loading = ref(false);
    const logs = ref([]);
            
    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;
    
      loading.value = true;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          let count = 0;
          for (const row of results.data) {
            if (!row['학번'] || !row['생기부']) continue;
            
            const initialContent = row['생기부'];
            
            // [핵심] 최초 히스토리 생성 (덮어쓰기 방지용 원본)
            const history = [{
              version: 1,
              actor: 'teacher',
              action: 'create',
              content: initialContent,
              timestamp: new Date().toISOString(),
              byteSize: calculateBytes(initialContent),
              summary: '최초 원본 업로드'
            }];
    
            await addDoc(collection(db, 'student_records'), {
              studentId: String(row['학번']),
              name: row['이름'] || row['성명'] || row['학생명'] || '이름없음',
              category: row['분류'] || '기타',
              content: initialContent,
              history: history, // 히스토리 필드 필수
              status: 'confirmed', // 업로드 직후는 확정 상태
              byteSize: calculateBytes(initialContent),
              updatedAt: serverTimestamp()
            });
            count++;
          }
          logs.value.unshift(`✅ ${file.name}: ${count}건 업로드 완료 (원본 저장됨)`);
          emit('refresh'); 
          loading.value = false;
        }
      });
    };
    </script>
    
    <template>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-2xl mx-auto mt-10">
        <div class="mb-6 p-10 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl">
          <Upload class="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 class="text-lg font-bold text-gray-700 mb-2">생기부 자료 업로드</h3>
          <p class="text-sm text-gray-400 mb-6">업로드된 내용은 자동으로 'Ver.1 원본'으로 저장됩니다.</p>
          
          <label class="cursor-pointer bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition inline-flex items-center gap-2 font-bold"
                 :class="{ 'opacity-50 cursor-not-allowed': loading }">
            <span v-if="loading">처리 중...</span>
            <span v-else>파일 선택하기 (.csv)</span>
            <input type="file" class="hidden" accept=".csv" @change="handleFileUpload" :disabled="loading" />
          </label>
        </div>
        
        <div class="space-y-2 text-left h-40 overflow-y-auto">
          <div v-for="(log, i) in logs" :key="i" class="text-sm text-green-600 bg-green-50 p-2 rounded">{{ log }}</div>
        </div>
      </div>
    </template>