<script setup>
  import { ref, onMounted, watch } from 'vue'; // watch 추가
  import { useRouter } from 'vue-router';
  import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
  import { db } from '../firebase'; 
  import { Send, Loader2 } from 'lucide-vue-next';
  
  // 폼 구성 요소
  import StudentInfo from '../components/forms/StudentInfo.vue';
  import PeriodSelection from '../components/forms/PeriodSelection.vue';
  import LearningPlan from '../components/forms/LearningPlan.vue';
  import GuardianInfo from '../components/forms/GuardianInfo.vue';
  import SignatureSection from '../components/forms/parts/SignatureSection.vue';
  
  const props = defineProps(['user', 'userData']);
  const router = useRouter(); 
  const isSubmitting = ref(false);
  
  const signatureRef = ref(null);
  
  const form = ref({
    student: { 
      name: '', grade: '', classNum: '', number: '', phone: '', 
      studentSignImage: null 
    },
    period: { 
      type: 'daily', startDate: '', endDate: '', halfTime: 'AM', totalDays: 0, isRuleChecked: false 
    },
    plan: { 
      type: 'family_trip', typeDetail: '', location: '', detail: '' 
    },
    guardian: { 
      parentName: '', parentRel: '부모', parentPhone: '', 
      parentSignImage: null, 
      guideType: 'parent', guideTypeDetail: '', guideName: '', guidePhone: '' 
    }
  });
  
  // [핵심] 사용자 데이터로 폼 채우기 함수 (분리됨)
  const updateFormFromUserData = () => {
    if (props.userData) {
      const d = props.userData;
      
      form.value.student.name = d.name || '';
      form.value.student.grade = d.grade || '';
      
      // [수정] 반 정보 매핑 강화 (d.class가 가장 일반적임)
      form.value.student.classNum = d.class || d.classNum || d.assignedClass || d.classroom || '';
      
      form.value.student.number = d.number || '';
      form.value.student.phone = d.phone || '';
      
      form.value.guardian.parentName = d.guardian || d.parentName || '';
      form.value.guardian.parentPhone = d.guardianPhone || d.parentPhone || '';
    }
  };
  
  // 1. 마운트 시 실행
  onMounted(() => {
    updateFormFromUserData();
  });
  
  // 2. [중요] 데이터가 늦게 로드될 경우를 대비해 감시
  watch(() => props.userData, () => {
    updateFormFromUserData();
  }, { deep: true, immediate: true });
  
  const handleSubmit = async () => {
    // 1. 기본 유효성 검사
    if (!form.value.period.isRuleChecked) return alert('불허 기간 확인에 체크해주세요.');
    if (form.value.period.totalDays <= 0) return alert('기간을 올바르게 선택해주세요.');
    if (!form.value.plan.location || !form.value.plan.detail) return alert('장소와 계획을 입력해주세요.');
    
    // 2. 서명 데이터 가져오기
    if (!signatureRef.value) return;
    const sigData = signatureRef.value.getSignatures();
  
    // 3. 서명 유효성 검사
    if (sigData.isStudentEmpty) return alert('학생 서명이 필요합니다.');
    if (sigData.isParentEmpty) return alert('보호자 서명이 필요합니다.');
  
    if (!confirm(`총 ${form.value.period.totalDays}일간의 신청서를 제출하시겠습니까?`)) return;
    isSubmitting.value = true;
  
    try {
      form.value.student.studentSignImage = sigData.student;
      form.value.guardian.parentSignImage = sigData.parent;
  
      const payload = {
        userId: props.user?.uid, 
        type: '체험학습',         
        student: form.value.student,
        period: form.value.period,
        plan: form.value.plan,
        guardian: form.value.guardian,
        status: 'pending',        
        createdAt: serverTimestamp(), 
        
        // 검색용 필드
        userName: form.value.student.name,
        userGrade: form.value.student.grade,
        userClass: form.value.student.classNum,
        userNumber: form.value.student.number,
        startDate: form.value.period.startDate,
        totalDays: form.value.period.totalDays
      };
  
      await addDoc(collection(db, 'experiential_learning'), payload);
  
      alert('신청서가 성공적으로 제출되었습니다.');
      // 필요한 경우 router.push('/') 등으로 이동
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('제출 중 오류가 발생했습니다.');
    } finally {
      isSubmitting.value = false;
    }
  };
  </script>
  
  <template>
    <div class="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div class="max-w-3xl mx-auto">
        <h1 class="text-3xl font-bold text-center text-gray-800 mb-8 tracking-tight">
          교외체험학습 신청서 작성
        </h1>
  
        <div class="space-y-6">
          <StudentInfo v-model="form.student" />
          <PeriodSelection v-model="form.period" />
          <LearningPlan v-model="form.plan" />
          <GuardianInfo v-model="form.guardian" />
          
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <SignatureSection 
               ref="signatureRef"
               :studentName="form.student.name"
               :parentName="form.guardian.parentName"
               @update:parentName="(val) => form.guardian.parentName = val"
             />
  
             <div class="mt-8">
               <button 
                 @click="handleSubmit"
                 :disabled="isSubmitting"
                 class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Loader2 v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" />
                 <Send v-else class="w-5 h-5 mr-2" />
                 신청서 제출하기
               </button>
             </div>
          </div>
  
        </div>
      </div>
    </div>
  </template>