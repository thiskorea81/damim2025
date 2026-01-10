<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { collection, addDoc, updateDoc, doc, Timestamp, query, where, getDocs } from 'firebase/firestore';
  import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { db, storage, getAppId } from '../../firebase';
  import { useSystemStore } from '../../stores/systemStore';
  import { Save, Loader2, AlertCircle, Info, Check } from 'lucide-vue-next'; // Info, Check 아이콘 추가
  
  import AbsenceInputs from './parts/AbsenceInputs.vue';
  import SignatureSection from './parts/SignatureSection.vue';
  
  const props = defineProps({ user: Object, userData: Object, editData: { type: Object, default: null } });
  const emit = defineEmits(['close', 'submitted']);
  const systemStore = useSystemStore();
  
  // [신규] 안내사항 모달 상태 (신규 작성 시에만 기본적으로 띄움, 수정 시에는 선택)
  const showInfoModal = ref(!props.editData); 
  
  const startDate = ref(props.editData?.startDate || props.editData?.period?.start || new Date().toISOString().split('T')[0]);
  const endDate = ref(props.editData?.endDate || props.editData?.period?.end || new Date().toISOString().split('T')[0]);
  const startPeriod = ref(props.editData?.period?.startPeriod || '');
  const endPeriod = ref(props.editData?.period?.endPeriod || '');
  const absenceType = ref(props.editData?.absenceType || '질병결석');
  const absenceDetail = ref(props.editData?.absenceDetail || '결석');
  const reason = ref(props.editData?.reason || '');
  const parentOpinion = ref(props.editData?.parentOpinion || '');
  const parentName = ref(props.userData?.parentName || '');
  const proofFile = ref(null);
  const proofDocType = ref(props.editData?.proofDocType || '진료확인서');
  const proofDocDetail = ref('');
  
  const sigSectionRef = ref(null);
  const isSubmitting = ref(false);
  const error = ref('');
  
  onMounted(() => {
    systemStore.fetchConfig();
    if (props.editData?.proofDocType) {
      const val = props.editData.proofDocType;
      if (val !== '진료확인서' && val !== '진단서') {
        proofDocType.value = '기타'; proofDocDetail.value = val;
      } else proofDocType.value = val;
    }
  });
  
  const duration = computed(() => {
    const s = new Date(startDate.value); const e = new Date(endDate.value);
    return Math.ceil(Math.abs(e - s) / (86400000)) + 1;
  });
  
  const checkMonthlyUsage = async () => {
    const appId = getAppId();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'submissions'),
      where('userId', '==', props.user.uid),
      where('absenceType', '==', '인정결석(생리통)')
    );
    const snapshot = await getDocs(q);
    const count = snapshot.docs.filter(d => {
      const data = d.data();
      const start = data.startDate || data.period?.start; 
      return d.id !== props.editData?.id && start && start.startsWith(currentMonth);
    }).length;
    
    const limit = systemStore.config.limits.menstrual || 1;
    return count >= limit; 
  };
  
  const handleSubmit = async () => {
    error.value = '';
    
    const today = new Date().toISOString().split('T')[0];
    if (startDate.value > today) return error.value = "신고서는 미리 작성할 수 없습니다.";
    if (startDate.value > endDate.value) return error.value = "종료일이 시작일보다 빠를 수 없습니다.";
  
    if (!reason.value || !parentName.value) return error.value = "필수 정보를 모두 입력해주세요.";
    const sigs = sigSectionRef.value.getSignatures();
    if ((sigs.isStudentEmpty && !props.editData?.signatures?.studentSig) || (sigs.isParentEmpty && !props.editData?.signatures?.parentSig)) {
      return error.value = "서명을 완료해주세요.";
    }
  
    let finalProofDocType = proofDocType.value === '기타' ? proofDocDetail.value : proofDocType.value;
    if (!finalProofDocType) return error.value = "증빙서류 종류를 입력해주세요.";
  
    isSubmitting.value = true;
    try {
      let finalType = absenceType.value;
      if (absenceType.value === '인정결석(생리통)') { 
        const limit = systemStore.config.limits.menstrual || 1;
        if (duration.value > limit) {
          if (!confirm(`⚠️ 인정결석(생리통) 기간(${duration.value}일) 초과.\n'질병${absenceDetail.value}'으로 처리됩니다.`)) { isSubmitting.value = false; return; }
          finalType = '질병결석';
        } else if (await checkMonthlyUsage()) {
          if (!confirm(`⚠️ 이번 달 인정결석(생리통) 한도 초과.\n'질병${absenceDetail.value}'으로 처리됩니다.`)) { isSubmitting.value = false; return; }
          finalType = '질병결석';
        }
      }
  
      const appId = getAppId();
      let fileUrl = props.editData?.proofFileUrl || '';
      if (proofFile.value) {
        const snap = await uploadBytes(storageRef(storage, `artifacts/${appId}/uploads/${props.user.uid}/${Date.now()}_${proofFile.value.name}`), proofFile.value);
        fileUrl = await getDownloadURL(snap.ref);
      }
  
      const docData = {
        type: '결석신고서',
        userId: props.user.uid,
        studentId: props.userData?.studentId || 'unknown',
        studentName: props.userData?.name,
        grade: props.userData?.grade, class: props.userData?.class, number: props.userData?.number,
        phone: props.userData?.phone, parentPhone: props.userData?.parentPhone,
        
        startDate: startDate.value,
        endDate: endDate.value,
        days: duration.value,
  
        period: { 
          start: startDate.value, end: endDate.value, days: duration.value, 
          startPeriod: startPeriod.value, endPeriod: endPeriod.value 
        },
        absenceType: finalType,
        absenceDetail: absenceDetail.value,
        reason: reason.value,
        parentOpinion: parentOpinion.value,
        proofFileUrl: fileUrl,
        proofDocType: finalProofDocType,
        
        signatures: {
          studentName: props.userData?.name,
          studentSig: (sigs.isStudentEmpty && props.editData?.signatures?.studentSig) ? props.editData.signatures.studentSig : sigs.student,
          parentName: parentName.value,
          parentSig: (sigs.isParentEmpty && props.editData?.signatures?.parentSig) ? props.editData.signatures.parentSig : sigs.parent
        },
        status: '제출완료',
        submittedAt: props.editData?.submittedAt || Timestamp.now()
      };
  
      if (props.editData) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'submissions', props.editData.id), docData);
      else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'submissions'), docData);
  
      alert(`제출 완료`); emit('submitted'); emit('close');
    } catch (err) { console.error(err); error.value = "오류 발생"; } 
    finally { isSubmitting.value = false; }
  };
  </script>
  
  <template>
    <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative">
      
      <h3 class="text-xl font-bold text-gray-800 mb-6 border-b-2 border-blue-600 pb-2">결석 신고서 {{ editData ? '수정' : '작성' }}</h3>
      
      <AbsenceInputs 
        :userData="userData"
        v-model:startDate="startDate" v-model:endDate="endDate"
        v-model:startPeriod="startPeriod" v-model:endPeriod="endPeriod"
        v-model:absenceType="absenceType" v-model:absenceDetail="absenceDetail"
        v-model:reason="reason" v-model:parentOpinion="parentOpinion"
        v-model:proofDocType="proofDocType" v-model:proofDocDetail="proofDocDetail"
        :fileInfo="{ name: proofFile?.name, url: editData?.proofFileUrl }"
        @file-selected="f => proofFile = f"
      />
      
      <SignatureSection ref="sigSectionRef" :studentName="userData?.name" v-model:parentName="parentName" :editData="editData" />
      
      <div v-if="error" class="text-red-500 text-sm mt-4 flex items-center"><AlertCircle class="w-4 h-4 mr-1"/> {{ error }}</div>
      
      <div class="flex gap-2 mt-6">
        <button @click="$emit('close')" class="flex-1 py-3 bg-gray-200 rounded-lg font-bold">취소</button>
        <button @click="handleSubmit" :disabled="isSubmitting" class="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold flex justify-center"><Loader2 v-if="isSubmitting" class="animate-spin mr-2"/> 제출</button>
      </div>
  
      <div v-if="showInfoModal" class="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col justify-center items-center p-6 rounded-2xl">
        <div class="bg-white border-2 border-red-100 shadow-xl rounded-xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <div class="flex flex-col items-center mb-4">
            <div class="p-3 bg-red-50 rounded-full mb-3">
              <Info class="w-8 h-8 text-red-500"/>
            </div>
            <h4 class="text-xl font-bold text-gray-800">잠깐! 제출 전 확인해주세요</h4>
          </div>
  
          <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-3 leading-relaxed border border-gray-200">
            <p class="font-bold text-red-600 flex items-start gap-2">
              <AlertCircle class="w-4 h-4 mt-0.5 shrink-0"/> 
              결석 신고서는 결석한 날로부터 5일 이내에 증빙서류를 첨부하여 제출해야 합니다.
            </p>
            
            <hr class="border-gray-200 my-2">
            
            <div>
              <span class="font-bold block mb-1 text-gray-800">1. 질병결석</span>
              <ul class="list-disc pl-4 space-y-1 text-xs">
                <li><span class="font-bold">2일 이내:</span> 학부모 의견서, 처방전, 담임확인서 등</li>
                <li><span class="font-bold">3일 이상:</span> 의사소견서 또는 진단서 등 (필수)</li>
              </ul>
            </div>
  
            <div>
              <span class="font-bold block mb-1 text-gray-800">2. 기타결석</span>
              <p class="text-xs pl-2">가정 사정(간병, 이사, 부모 봉양 등)에 의한 부득이한 결석 시 관련 증빙서류 첨부</p>
            </div>
  
            <div>
              <span class="font-bold block mb-1 text-gray-800">3. 인정결석</span>
              <p class="text-xs pl-2">청첩장, 가족관계증명서, 사망진단서 등</p>
              <p class="text-xs pl-2 text-blue-600 mt-1">* 생리결석은 학부모 의견 및 담임확인서로 갈음</p>
            </div>
          </div>
  
          <button 
            @click="showInfoModal = false"
            class="w-full mt-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Check class="w-5 h-5"/> 위 내용을 확인했습니다
          </button>
        </div>
      </div>
  
    </div>
  </template>