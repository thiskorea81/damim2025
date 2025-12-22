<script setup>
    import { ref, onMounted } from 'vue';
    import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { Send, X } from 'lucide-vue-next';
    
    const props = defineProps(['isOpen', 'record']);
    const emit = defineEmits(['close', 'refresh']);
    
    const feedbackText = ref("");
    const isSubmitting = ref(false);
    
    onMounted(() => {
      if (props.record) {
        feedbackText.value = props.record.studentFeedback || "";
      }
    });
    
    const submit = async () => {
      if (!feedbackText.value.trim()) return alert("요청 내용을 입력해주세요.");
      isSubmitting.value = true;
      try {
        const docRef = doc(db, 'student_records', props.record.id);
        await updateDoc(docRef, {
          status: 'request_modify',
          hasFeedback: true,
          studentFeedback: feedbackText.value,
          feedbackDate: serverTimestamp()
        });
        alert("수정 요청이 전송되었습니다.");
        emit('refresh');
        emit('close');
      } catch (e) {
        alert("오류: " + e.message);
      } finally {
        isSubmitting.value = false;
      }
    };
    
    // [Clean Util Duplicate] 모달에서 보여줄 때도 태그 제거
    const getCleanContent = (text) => {
      if (!text) return '';
      let cleaned = text.replace(/^\[.*?\]\s*/, '');
      cleaned = cleaned.replace(/\s*\(.*(수정됨|요약됨|다듬음|반영됨).*\)$/, '');
      return cleaned.trim();
    };
    </script>
    
    <template>
      <div v-if="isOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div class="p-5 border-b flex justify-between items-center bg-gray-50">
            <h3 class="font-bold text-lg text-gray-800">📝 수정 요청하기</h3>
            <button @click="emit('close')" class="text-gray-400 hover:text-gray-600"><X class="w-6 h-6" /></button>
          </div>
          
          <div class="p-6">
            <div class="mb-4 bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
              <p class="font-bold mb-2">💡 현재 내용 (참고용):</p>
              <div class="max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                <p class="text-xs text-blue-600 leading-relaxed whitespace-pre-wrap">{{ getCleanContent(record?.content) }}</p>
              </div>
            </div>
            
            <label class="block text-sm font-bold text-gray-700 mb-2">수정 요청 사항</label>
            <textarea v-model="feedbackText" rows="4" placeholder="어떤 부분을 어떻게 수정하고 싶은지 구체적으로 적어주세요." class="w-full border border-gray-300 rounded-xl p-4 resize-none text-sm"></textarea>
          </div>
    
          <div class="p-5 border-t bg-gray-50 flex justify-end gap-3">
            <button @click="emit('close')" class="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-medium">취소</button>
            <button @click="submit" :disabled="isSubmitting" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center gap-2">
              <Send class="w-4 h-4" /> 요청 보내기
            </button>
          </div>
        </div>
      </div>
    </template>
    
    <style scoped>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    </style>