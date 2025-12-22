<script setup>
    import { doc, updateDoc } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { 
      CheckCircle, MessageSquare, ThumbsUp, Clock, FileText, ArrowDown, UserCheck 
    } from 'lucide-vue-next';
    import { calculateBytes } from '../../utils/byteCalculator';
    
    const props = defineProps(['record', 'mainMode']);
    const emit = defineEmits(['request-edit', 'refresh']);
    
    // 태그 제거 (AI 태그 등)
    const getCleanContent = (text) => {
      if (!text) return '';
      let cleaned = text;
      cleaned = cleaned.replace(/^\[.*?\]\s*/, ''); 
      cleaned = cleaned.replace(/\s*\(.*(수정됨|요약됨|다듬음|반영됨).*\)$/, ''); 
      return cleaned.trim();
    };
    
    // 순수 텍스트 바이트 계산 (유틸리티 함수 래퍼)
    const getCleanBytes = (text) => {
      const cleanText = getCleanContent(text || '');
      return calculateBytes(cleanText);
    };
    
    // [학생 동작] 내용 확인 완료 (수정 종료 의사 표시)
    const agreeRecord = async () => {
      if (!confirm("현재 내용에 동의하며, 선생님께 최종 승인을 요청하시겠습니까?\n\n'확인'을 누르면 수정 요청이 종료되고 선생님의 승인을 기다리게 됩니다.")) return;
      
      try {
        await updateDoc(doc(db, 'student_records', props.record.id), {
          status: 'waiting_approval', // 상태 변경: 승인 대기
          studentAgreed: true         // 학생 동의 플래그
        });
        emit('refresh');
      } catch(e) {
        alert("오류 발생: " + e.message);
      }
    };
    
    // [학생 동작] 승인 대기 취소 (다시 수정하고 싶을 때)
    const cancelAgreement = async () => {
      if (!confirm("승인 대기를 취소하고 다시 수정 요청을 하시겠습니까?")) return;
    
      try {
        await updateDoc(doc(db, 'student_records', props.record.id), {
          status: 'ai_processed', // 일반 상태로 복귀 (또는 이전 상태)
          studentAgreed: false
        });
        emit('refresh');
      } catch(e) {
        alert("오류 발생: " + e.message);
      }
    };
    </script>
    
    <template>
      <div class="bg-white rounded-xl border-2 p-6 relative transition duration-200"
           :class="{
             'border-green-100 bg-green-50/30': record.isConfirmed,          /* 선생님 최종 승인 */
             'border-blue-200 bg-blue-50/20': record.status === 'waiting_approval', /* 학생 확인 완료 */
             'border-gray-100 hover:border-blue-100': !record.isConfirmed && record.status !== 'waiting_approval'
           }">
        
        <div class="flex justify-between items-center mb-6 border-b pb-4 border-gray-100">
          <div>
            <span class="text-xs font-bold text-gray-400 block mb-1">
              {{ new Date(record.updatedAt?.toDate()).toLocaleDateString() }} 업데이트
            </span>
            <span class="text-lg font-bold text-gray-800">{{ record.category }}</span>
          </div>
          
          <div class="flex gap-2">
            <span v-if="record.isConfirmed" class="text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full flex items-center gap-1">
              <CheckCircle class="w-3 h-3" /> 최종 승인 완료
            </span>
            <span v-else-if="record.status === 'waiting_approval'" class="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full flex items-center gap-1">
              <UserCheck class="w-3 h-3" /> 승인 대기 중 (학생 확인)
            </span>
            <span v-else-if="record.status === 'request_modify'" class="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-full flex items-center gap-1">
              <Clock class="w-3 h-3" /> 수정 요청 중
            </span>
            <span v-else class="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              작성/수정 중
            </span>
          </div>
        </div>
    
        <div class="space-y-8 relative ml-2">
          <div class="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200 z-0"></div>
    
          <div v-for="(hist, idx) in (record.history || [])" :key="idx" class="relative z-10 flex gap-4 group">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 bg-white"
                 :class="{
                   'border-green-500 text-green-600': idx === 0, /* 원본 */
                   'border-purple-500 text-purple-600': hist.actor === 'ai',
                   'border-indigo-500 text-indigo-600': hist.actor === 'teacher',
                   'border-blue-500 text-blue-600': hist.actor === 'student' && idx > 0
                 }">
               <span v-if="idx === 0" class="text-[10px] font-bold">원본</span>
               <span v-else-if="hist.actor === 'teacher'" class="text-[10px] font-bold">쌤</span>
               <FileText v-else class="w-4 h-4" />
            </div>
    
            <div class="flex-1 bg-white rounded-xl border p-5 shadow-sm transition"
                 :class="(idx === record.history.length - 1 && !record.isConfirmed) ? 'border-blue-300 ring-2 ring-blue-50' : 'border-gray-200'">
              
              <div class="flex justify-between items-start mb-3 border-b pb-2 border-gray-100">
                <span class="text-xs font-bold px-2 py-0.5 rounded"
                      :class="idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'">
                  {{ idx === 0 ? '최초 원본' : (hist.actor === 'ai' ? '수정본' : (hist.actor === 'teacher' ? '선생님 수정' : '나의 작성')) }}
                </span>
                <span class="text-xs font-mono text-gray-400">{{ getCleanBytes(hist.content) }} bytes</span>
              </div>
    
              <div v-if="hist.relatedRequest" class="mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div class="flex items-center gap-1 text-xs font-bold text-gray-500 mb-1">
                  <ArrowDown class="w-3 h-3" /> 나의 요청 사항:
                </div>
                <p class="text-sm text-gray-700">"{{ hist.relatedRequest }}"</p>
              </div>
    
              <p class="text-[15px] leading-relaxed whitespace-pre-wrap text-gray-800 font-sans">
                {{ getCleanContent(hist.content) }}
              </p>
            </div>
          </div>
          
          <div v-if="record.status === 'request_modify'" class="relative z-10 flex gap-4 opacity-70">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-dashed border-gray-300 bg-gray-50">
              <Clock class="w-4 h-4 text-gray-400" />
            </div>
            <div class="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-3 flex items-center text-sm text-gray-500">
              선생님이 내용을 확인하고 있습니다...
            </div>
          </div>
    
          <div v-if="record.status === 'waiting_approval'" class="relative z-10 flex gap-4">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
              <UserCheck class="w-4 h-4" />
            </div>
            <div class="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3 flex justify-between items-center text-sm text-blue-700 font-bold">
              <span>내용 확인을 완료했습니다. 선생님 승인을 기다립니다.</span>
              <button @click="cancelAgreement" class="text-xs underline text-blue-500 hover:text-blue-700 font-normal">
                취소하기
              </button>
            </div>
          </div>
    
        </div>
    
        <div class="flex justify-end gap-2 mt-6 border-t border-gray-100 pt-4">
          
          <div v-if="record.isConfirmed" class="text-sm font-bold text-green-600 flex items-center gap-2">
            <CheckCircle class="w-5 h-5" /> 모든 절차가 완료되었습니다.
          </div>
    
          <div v-else-if="record.status === 'waiting_approval'" class="text-sm text-gray-400 flex items-center gap-2">
            <Clock class="w-4 h-4" /> 선생님의 최종 승인을 기다리는 중입니다.
          </div>
    
          <div v-else class="flex gap-2">
            <button 
              @click="emit('request-edit', record)"
              class="text-sm font-bold flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition shadow-sm bg-white"
            >
              <MessageSquare class="w-4 h-4" /> 
              {{ record.status === 'request_modify' ? '요청 내용 수정' : '수정 요청하기' }}
            </button>
    
            <button 
              v-if="record.status !== 'request_modify'"
              @click="agreeRecord"
              class="text-sm font-bold flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow-md"
            >
              <UserCheck class="w-4 h-4" />
              내용 확인 완료 (승인 요청)
            </button>
          </div>
          
        </div>
      </div>
    </template>