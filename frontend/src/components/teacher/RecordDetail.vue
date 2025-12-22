<script setup>
    import { ref, watch, computed } from 'vue';
    import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { 
      Clock, FileText, Trash2, Edit, Save, CheckCircle, GitCommit 
    } from 'lucide-vue-next';
    import { calculateBytes } from '../../utils/byteCalculator';
    
    const props = defineProps(['record']);
    const emit = defineEmits(['refresh', 'deselect']);
    
    const isEditing = ref(false);
    const editContent = ref('');
    
    // 선택된 학생이 바뀌면 에디터 초기화
    watch(() => props.record.id, () => {
      isEditing.value = false;
      editContent.value = '';
    });
    
    // --- 유틸리티 ---
    const getCleanContent = (text) => {
      if (!text) return '';
      return text.replace(/^\[.*?\]\s*/, '').replace(/\s*\(.*(수정됨|요약됨|다듬음|반영됨).*\)$/, '').trim();
    };
    const getCleanBytes = (text) => calculateBytes(getCleanContent(text));
    
    // --- 액션 핸들러 ---
    const confirmRecord = async () => {
      if (!confirm(`'${props.record.name}' 학생의 생기부를 최종 승인하시겠습니까?`)) return;
      try {
        await updateDoc(doc(db, 'student_records', props.record.id), {
          status: 'confirmed', isConfirmed: true, confirmedAt: serverTimestamp()
        });
        emit('refresh');
        alert("최종 승인되었습니다.");
      } catch (e) { alert(e.message); }
    };
    
    const cancelConfirm = async () => {
      if (!confirm('승인을 취소하고 수정 가능 상태로 돌리시겠습니까?')) return;
      try {
        await updateDoc(doc(db, 'student_records', props.record.id), {
          isConfirmed: false, status: 'reopened' 
        });
        emit('refresh');
      } catch (e) { alert(e.message); }
    };
    
    const deleteRecord = async () => {
      if (!confirm("정말 삭제하시겠습니까? 복구할 수 없습니다.")) return;
      try {
        await deleteDoc(doc(db, 'student_records', props.record.id));
        emit('deselect');
        emit('refresh');
      } catch (e) { alert(e.message); }
    };
    
    const startEdit = () => {
      editContent.value = getCleanContent(props.record.content);
      isEditing.value = true;
    };
    
    const saveEdit = async () => {
      if (!editContent.value.trim()) return alert("내용을 입력해주세요.");
      try {
        const currentHistory = props.record.history || [];
        const lastVersion = currentHistory.length > 0 ? currentHistory[currentHistory.length - 1].version : 0;
        const newVersion = {
          version: lastVersion + 1,
          actor: 'teacher',
          action: 'manual_edit',
          content: editContent.value,
          timestamp: new Date().toISOString(),
          byteSize: calculateBytes(editContent.value),
          summary: '선생님 직접 수정'
        };
        await updateDoc(doc(db, 'student_records', props.record.id), {
          content: editContent.value,
          history: [...currentHistory, newVersion],
          status: 'modified_by_teacher',
          isConfirmed: false,
          updatedAt: serverTimestamp()
        });
        isEditing.value = false;
        emit('refresh');
        alert("수정되었습니다.");
      } catch (e) { alert(e.message); }
    };
    
    // 히스토리 역순 정렬 (최신이 위로)
    const reversedHistory = computed(() => [...(props.record.history || [])].reverse());
    </script>
    
    <template>
      <div class="flex flex-col h-full">
        <div class="p-5 border-b bg-gray-50 flex justify-between items-start">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h2 class="text-xl font-bold text-gray-900">{{ record.studentId }} {{ record.name }}</h2>
              <span class="text-sm font-medium text-gray-500 px-2 py-0.5 bg-white border rounded">{{ record.category }}</span>
            </div>
            <div class="text-xs text-gray-500 flex gap-3">
              <span class="flex items-center gap-1"><Clock class="w-3 h-3" /> 최근 수정: {{ new Date(record.updatedAt?.toDate()).toLocaleString() }}</span>
              <span class="flex items-center gap-1 font-mono"><FileText class="w-3 h-3" /> {{ getCleanBytes(record.content) }} Bytes</span>
            </div>
          </div>
          <button @click="deleteRecord" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="삭제">
            <Trash2 class="w-5 h-5" />
          </button>
        </div>
    
        <div class="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">
          
          <div v-if="isEditing" class="bg-white p-4 rounded-xl border-2 border-indigo-500 shadow-md mb-6 animate-in slide-in-from-top-2">
            <h4 class="text-sm font-bold text-indigo-600 mb-2 flex items-center gap-2"><Edit class="w-4 h-4" /> 선생님 직접 수정</h4>
            <textarea v-model="editContent" rows="6" class="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"></textarea>
            <div class="flex justify-between items-center mt-3">
              <span class="text-xs text-gray-500 font-mono">{{ calculateBytes(editContent) }} bytes</span>
              <div class="flex gap-2">
                <button @click="isEditing = false" class="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">취소</button>
                <button @click="saveEdit" class="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1"><Save class="w-3 h-3" /> 저장하기</button>
              </div>
            </div>
          </div>
    
          <div v-for="(hist, idx) in reversedHistory" :key="idx" class="flex gap-4 group">
            <div class="flex flex-col items-center w-8 shrink-0 relative">
              <div class="w-0.5 h-full bg-gray-200 absolute top-0 bottom-0 z-0 group-last:h-0" v-if="idx !== (record.history.length - 1)"></div>
              <div class="w-8 h-8 rounded-full z-10 flex items-center justify-center shadow-sm border-2 bg-white"
                   :class="{
                     'border-green-500 text-green-600': hist.version === 1,
                     'border-purple-500 text-purple-600': hist.actor === 'ai',
                     'border-indigo-500 text-indigo-600': hist.actor === 'teacher',
                     'border-blue-500 text-blue-600': hist.actor === 'student'
                   }">
                <span v-if="hist.actor === 'teacher'" class="text-[10px] font-bold">쌤</span>
                <span v-else-if="hist.actor === 'student'" class="text-[10px] font-bold">학</span>
                <span v-else-if="hist.version === 1" class="text-[10px] font-bold">원</span>
                <GitCommit v-else class="w-4 h-4" />
              </div>
            </div>
            <div class="flex-1 bg-white rounded-xl border p-4 shadow-sm"
                 :class="idx === 0 ? 'border-gray-300 ring-1 ring-gray-100' : 'border-gray-200 opacity-80 hover:opacity-100 transition'">
              <div class="flex justify-between items-center mb-2 border-b pb-2 border-gray-100">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2 py-0.5 rounded"
                        :class="{
                          'bg-indigo-100 text-indigo-700': hist.actor === 'teacher',
                          'bg-purple-100 text-purple-700': hist.actor === 'ai',
                          'bg-blue-100 text-blue-700': hist.actor === 'student',
                          'bg-green-100 text-green-700': hist.version === 1
                        }">
                    Ver.{{ hist.version }} {{ hist.actor === 'ai' ? 'AI' : (hist.actor === 'teacher' ? '선생님' : '학생') }}
                  </span>
                  <span class="text-[10px] text-gray-400">{{ new Date(hist.timestamp).toLocaleString() }}</span>
                </div>
                <span class="text-xs font-mono text-gray-400">{{ getCleanBytes(hist.content) }} B</span>
              </div>
              <div v-if="hist.summary" class="mb-2 text-xs text-gray-500 font-medium">📌 {{ hist.summary }}</div>
              <div v-if="hist.relatedRequest" class="mb-2 bg-blue-50 p-2 rounded text-xs text-blue-700">🗣️ 학생 요청: "{{ hist.relatedRequest }}"</div>
              <p class="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">{{ getCleanContent(hist.content) }}</p>
            </div>
          </div>
        </div>
    
        <div class="p-4 border-t bg-white flex justify-between items-center z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
          <div class="text-xs text-gray-400">
            상태: <span class="font-bold" :class="record.isConfirmed ? 'text-green-600' : (record.status === 'waiting_approval' ? 'text-blue-600' : 'text-gray-600')">
              {{ record.isConfirmed ? '최종 승인 완료' : (record.status === 'waiting_approval' ? '학생 확인 완료 (승인 대기)' : '진행 중') }}
            </span>
          </div>
          <div class="flex gap-2">
            <button v-if="!isEditing && !record.isConfirmed" @click="startEdit" class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 text-sm font-bold flex items-center gap-2 transition"><Edit class="w-4 h-4" /> 직접 수정</button>
            <button v-if="record.isConfirmed" @click="cancelConfirm" class="px-4 py-2 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 text-sm font-bold transition">승인 취소</button>
            <button v-else @click="confirmRecord" class="px-5 py-2 text-white bg-green-600 rounded-xl hover:bg-green-700 text-sm font-bold flex items-center gap-2 shadow-sm transition transform active:scale-95"><CheckCircle class="w-4 h-4" /> 최종 승인 (확정)</button>
          </div>
        </div>
      </div>
    </template>