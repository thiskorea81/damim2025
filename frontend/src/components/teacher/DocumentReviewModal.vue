<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { X, Printer, CheckCircle, AlertTriangle, FileText, MapPin, Edit3, Paperclip } from 'lucide-vue-next';
  import SignaturePad from '../SignaturePad.vue';
  
  const props = defineProps({
    doc: Object,
    teacherData: Object, // teacherSignature 포함
    cumulativeData: Object
  });
  
  const emit = defineEmits(['close', 'approve', 'reject', 'print']);
  
  const signaturePad = ref(null);
  const useSavedSignature = ref(false);
  
  // 결석신고서용 상태 (교사 확인 입력용)
  const absenceForm = ref({
    checkMethod: '통화',
    methodDetail: '',
    proofType: '증빙서류 없음', // 기본값
  });
  
  // 초기화
  onMounted(() => {
    if (props.teacherData?.teacherSignature) {
      useSavedSignature.value = true;
    }
    // 결석신고서일 경우, 학생이 선택한 증빙서류 타입을 기본값으로 세팅해주면 편함
    if (props.doc.type === '결석신고서' && props.doc.proofDocType) {
       // 교사가 확인할 때 학생이 낸 서류 종류를 참고하도록 설정 (선택사항)
       // absenceForm.value.proofType = props.doc.proofDocType; 
    }
  });
  
  const modalTitle = computed(() => {
    if (props.doc.type === '결석신고서') return '결석신고서 검토';
    if (props.doc.type === '체험학습') return '체험학습 신청서 검토';
    return '결과보고서 검토';
  });
  
  // 기간 정보 포맷팅
  const formattedPeriod = computed(() => {
    const d = props.doc;
    if (!d) return '-';
    if (typeof d.period === 'string') return d.period;
    if (d.period?.startDate) return `${d.period.startDate} ~ ${d.period.endDate}`;
    if (d.startDate) return `${d.startDate} ~ ${d.endDate}`;
    return '-';
  });
  
  // 총 일수 정보
  const totalDays = computed(() => {
    const d = props.doc;
    if (!d) return '';
    const days = d.totalDays || d.period?.totalDays || d.period?.days || d.days;
    return days ? `(${days}일간)` : '';
  });
  
  // 서명 이미지 경로
  const studentSigImg = computed(() => {
    const d = props.doc;
    return d.studentSign || d.studentSignImage || d.student?.studentSignImage || d.signatures?.studentSig || null;
  });
  const parentSigImg = computed(() => {
    const d = props.doc;
    return d.parentSign || d.parentSignImage || d.guardian?.parentSignImage || d.signatures?.parentSig || null;
  });
  
  const handleApprove = () => {
    let approvalPayload = {
      docId: props.doc.id,
      type: props.doc.type,
      teacherName: props.teacherData.name,
      teacherSignature: null
    };
  
    if (props.doc.type !== '결과보고서') {
      if (useSavedSignature.value && props.teacherData.teacherSignature) {
        approvalPayload.teacherSignature = props.teacherData.teacherSignature;
      } else {
        if (signaturePad.value?.isEmpty()) return alert("교사 서명이 필요합니다.");
        approvalPayload.teacherSignature = signaturePad.value.getSignatureData();
      }
    }
  
    if (props.doc.type === '결석신고서') {
      approvalPayload.teacherCheck = {
        method: absenceForm.value.checkMethod,
        methodDetail: absenceForm.value.methodDetail,
        proofType: absenceForm.value.proofType
      };
    } 
    
    emit('approve', approvalPayload);
  };
  
  const handlePrint = () => {
    emit('print', props.doc);
  };
  </script>
  
  <template>
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div class="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileText class="w-5 h-5 text-indigo-600"/> {{ modalTitle }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <X class="w-6 h-6"/>
          </button>
        </div>
  
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm grid grid-cols-2 gap-4">
            <div><span class="text-indigo-700 font-bold mr-2">학생</span> <span class="font-bold">{{ doc.name || doc.studentName }}</span></div>
            <div>
              <span class="text-indigo-700 font-bold mr-2">기간</span> 
              <span class="font-bold">{{ formattedPeriod }}</span>
              <span class="text-xs text-gray-500 ml-1 font-bold">{{ totalDays }}</span>
            </div>
            <div v-if="doc.type === '체험학습' && cumulativeData" class="col-span-2 pt-2 border-t border-indigo-200 mt-1">
               <p class="font-bold text-blue-600 text-xs">
                 [자동 계산된 누적 일수] 국내: {{ cumulativeData.domestic }}일 / 국외: {{ cumulativeData.overseas }}일
               </p>
            </div>
          </div>
  
          <div class="space-y-4">
            <h4 class="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
              <FileText class="w-4 h-4"/> 제출 내용 확인
            </h4>
  
            <div v-if="doc.type === '결석신고서'" class="space-y-4 text-sm">
              
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-white border border-gray-200 rounded p-3">
                  <span class="block text-xs font-bold text-gray-500 mb-1">구분</span>
                  <p class="font-bold text-gray-800 text-lg">{{ doc.absenceDetail || '결석' }}</p> </div>
                <div class="bg-white border border-gray-200 rounded p-3">
                  <span class="block text-xs font-bold text-gray-500 mb-1">결석 유형</span>
                  <span class="px-2 py-1 bg-gray-100 rounded text-gray-700 font-bold text-xs border">
                    {{ doc.absenceType || '질병결석' }}
                  </span>
                </div>
                <div v-if="doc.period?.startPeriod || doc.period?.endPeriod" class="col-span-2 bg-white border border-gray-200 rounded p-3">
                  <span class="block text-xs font-bold text-gray-500 mb-1">해당 교시</span>
                  <p class="text-gray-800">
                    {{ doc.period.startPeriod || '?' }}교시 ~ {{ doc.period.endPeriod || '?' }}교시
                  </p>
                </div>
              </div>
  
              <div class="bg-white border border-gray-200 rounded p-3">
                <span class="block text-xs font-bold text-gray-500 mb-1">결석 사유</span>
                <p class="text-gray-800 font-bold">{{ doc.reason }}</p>
              </div>
              <div class="bg-white border border-gray-200 rounded p-3">
                <span class="block text-xs font-bold text-gray-500 mb-1">학부모 의견</span>
                <p class="text-gray-600">{{ doc.parentOpinion || '(의견 없음)' }}</p>
              </div>
  
              <div class="bg-white border border-gray-200 rounded p-3">
                <span class="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                  <Paperclip class="w-3 h-3"/> 증빙서류 ({{ doc.proofDocType || '기타' }})
                </span>
                
                <div v-if="doc.proofFileUrl" class="relative group w-fit">
                  <img :src="doc.proofFileUrl" 
                       class="max-h-60 rounded border border-gray-300 cursor-zoom-in hover:opacity-95 transition shadow-sm"
                       onclick="window.open(this.src)" 
                       alt="증빙서류">
                  <div class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition pointer-events-none rounded">
                    <span class="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">클릭하여 원본보기</span>
                  </div>
                </div>
                <div v-else class="text-sm text-gray-400 italic py-2">
                  첨부된 증빙서류 이미지가 없습니다.
                </div>
              </div>
            </div>
  
            <div v-else-if="doc.type === '체험학습'" class="space-y-2 text-sm">
              <p><strong>장소:</strong> {{ doc.plan?.location || doc.location }}</p>
              <p><strong>계획:</strong> {{ doc.plan?.detail || doc.reason }}</p>
            </div>
            
            <div v-else class="space-y-2 text-sm">
              <p class="font-bold">{{ doc.title }}</p>
              <p class="whitespace-pre-wrap text-gray-600">{{ doc.content }}</p>
              <div class="flex gap-2 mt-2">
                 <img v-if="doc.photo1" :src="doc.photo1" class="h-20 rounded border cursor-pointer" onclick="window.open(this.src)">
                 <img v-if="doc.photo2" :src="doc.photo2" class="h-20 rounded border cursor-pointer" onclick="window.open(this.src)">
                 <img v-if="doc.ticket" :src="doc.ticket" class="h-20 rounded border cursor-pointer" onclick="window.open(this.src)">
              </div>
            </div>
  
            <div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-dashed">
              <div class="flex flex-col items-center p-3 bg-gray-50 rounded-lg border">
                <span class="text-xs font-bold text-gray-500 mb-2">학생 서명</span>
                <img v-if="studentSigImg" :src="studentSigImg" class="h-12 object-contain" alt="학생 서명">
                <span v-else class="text-xs text-red-400">(서명 없음)</span>
              </div>
              <div class="flex flex-col items-center p-3 bg-gray-50 rounded-lg border">
                <span class="text-xs font-bold text-gray-500 mb-2">보호자 서명</span>
                <img v-if="parentSigImg" :src="parentSigImg" class="h-12 object-contain" alt="보호자 서명">
                <span v-else class="text-xs text-red-400">(서명 없음)</span>
              </div>
            </div>
          </div>
  
          <div v-if="doc.status !== 'approved'" class="bg-gray-50 p-5 rounded-xl border border-gray-200 mt-6">
            
            <div v-if="doc.type === '결석신고서'" class="mb-4 grid grid-cols-2 gap-4">
               <div>
                 <label class="block text-xs font-bold mb-1">확인 방법</label>
                 <select v-model="absenceForm.checkMethod" class="w-full text-sm border rounded p-1"><option>통화</option><option>면담</option><option>기타</option></select>
               </div>
               <div>
                 <label class="block text-xs font-bold mb-1">증빙 서류 (담임 확인용)</label>
                 <select v-model="absenceForm.proofType" class="w-full text-sm border rounded p-1"><option>증빙서류 없음</option><option>병원진료영수증</option><option>투약봉지</option><option>병원처방전</option><option>진단서/소견서</option></select>
               </div>
            </div>
  
            <div v-if="doc.type !== '결과보고서'">
              <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-bold text-gray-700">담임교사 서명</label>
                <div v-if="teacherData.teacherSignature" class="flex items-center gap-2">
                  <input type="checkbox" id="useSaved" v-model="useSavedSignature" class="w-4 h-4 text-indigo-600 rounded cursor-pointer">
                  <label for="useSaved" class="text-xs text-gray-600 cursor-pointer font-bold select-none">등록된 서명 사용</label>
                </div>
              </div>
  
              <div v-if="useSavedSignature && teacherData.teacherSignature" class="h-32 border rounded-lg bg-white flex flex-col items-center justify-center relative">
                <img :src="teacherData.teacherSignature" class="h-24 object-contain">
                <span class="absolute bottom-2 right-2 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 font-bold flex items-center gap-1">
                  <CheckCircle class="w-3 h-3"/> 저장된 서명 적용
                </span>
              </div>
              <div v-else class="h-32 border rounded-lg bg-white overflow-hidden relative">
                <SignaturePad ref="signaturePad" />
                <div class="absolute top-2 right-2 pointer-events-none text-xs text-gray-400 flex items-center gap-1">
                  <Edit3 class="w-3 h-3"/> 직접 서명
                </div>
              </div>
            </div>
  
            <div v-else class="text-center py-2">
              <p class="text-sm font-bold text-green-600 flex items-center justify-center gap-2">
                <CheckCircle class="w-4 h-4"/> 내용 확인 완료 (별도 서명 불필요)
              </p>
            </div>
          </div>
        </div>
  
        <div class="p-4 border-t bg-gray-50 flex justify-between items-center">
          <button @click="handlePrint" class="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-white transition text-sm">
            <Printer class="w-4 h-4 mr-2"/> 인쇄/PDF
          </button>
          <div class="flex gap-2" v-if="doc.status !== 'approved'">
            <button @click="$emit('reject')" class="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200 transition text-sm">
              반려
            </button>
            <button @click="handleApprove" class="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-md text-sm flex items-center">
              <CheckCircle class="w-4 h-4 mr-2"/> 승인 완료
            </button>
          </div>
        </div>
  
      </div>
    </div>
  </template>