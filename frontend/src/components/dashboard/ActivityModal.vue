<script setup>
    import { ref } from 'vue';
    import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { Send, X } from 'lucide-vue-next';
    import { calculateBytes } from '../../utils/byteCalculator';
    
    const props = defineProps(['isOpen', 'mainMode', 'activeTab', 'userData']);
    const emit = defineEmits(['close', 'refresh']);
    
    const category = ref(props.mainMode === 'creative' ? props.activeTab : '');
    const content = ref('');
    const requirements = ref('');
    const isSubmitting = ref(false);
    
    const submit = async () => {
      if (!category.value.trim()) return alert("과목명(영역)을 입력해주세요.");
      if (!content.value.trim()) return alert("내용을 입력해주세요.");
    
      isSubmitting.value = true;
      try {
        const grade = String(props.userData.grade || '');
        const classNum = String(props.userData.classNum || props.userData.class || '').padStart(2, '0');
        const number = String(props.userData.number || '').padStart(2, '0');
        const studentId = `${grade}${classNum}${number}`;
    
        const history = [{
          version: 1,
          actor: 'student',
          action: 'create',
          content: content.value,
          requirements: requirements.value, // 초기 요청사항 기록
          timestamp: new Date().toISOString(),
          byteSize: calculateBytes(content.value),
          summary: '학생 초안'
        }];
    
        await addDoc(collection(db, 'student_records'), {
          studentId,
          name: props.userData.name || '학생',
          category: category.value,
          content: content.value,
          requirements: requirements.value,
          history,
          status: 'submitted',
          byteSize: calculateBytes(content.value),
          updatedAt: serverTimestamp()
        });
    
        alert("제출되었습니다.");
        emit('refresh');
        emit('close');
      } catch (e) {
        alert("오류: " + e.message);
      } finally {
        isSubmitting.value = false;
      }
    };
    </script>
    
    <template>
      <div v-if="isOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          <div class="p-5 border-b flex justify-between items-center bg-gray-50">
            <h3 class="font-bold text-lg text-gray-800">✨ {{ mainMode === 'creative' ? activeTab : '교과' }} 활동 추가</h3>
            <button @click="emit('close')" class="text-gray-400 hover:text-gray-600"><X class="w-6 h-6" /></button>
          </div>
          
          <div class="p-6 space-y-4">
            <div v-if="mainMode === 'subject'">
              <label class="block text-sm font-bold text-gray-700 mb-2">과목명</label>
              <input v-model="category" type="text" placeholder="예: 국어, 수학I" class="w-full border border-gray-300 rounded-xl px-4 py-3 font-bold">
            </div>
            <div v-else>
               <label class="block text-sm font-bold text-gray-700 mb-2">영역</label>
               <input type="text" :value="activeTab" disabled class="w-full bg-gray-100 text-gray-500 border border-gray-300 rounded-xl px-4 py-3">
            </div>
    
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">활동 내용</label>
              <textarea v-model="content" rows="6" placeholder="활동 내용을 작성해주세요." class="w-full border border-gray-300 rounded-xl p-4 resize-none"></textarea>
              <div class="text-right mt-1"><span class="text-xs font-mono text-gray-400">{{ calculateBytes(content) }} bytes</span></div>
            </div>
    
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-2">선생님께 바라는 점 (선택)</label>
              <input v-model="requirements" type="text" placeholder="예: '구체적인 수치를 포함해주세요'" class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm">
            </div>
          </div>
    
          <div class="p-5 border-t bg-gray-50 flex justify-end gap-3">
            <button @click="emit('close')" class="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-medium">취소</button>
            <button @click="submit" :disabled="isSubmitting" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center gap-2">
              <Send class="w-4 h-4" /> 제출하기
            </button>
          </div>
        </div>
      </div>
    </template>