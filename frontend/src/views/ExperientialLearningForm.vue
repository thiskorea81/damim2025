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
          
          <SignatureSection 
            v-model:parentSign="form.guardian.parentSign"
            v-model:studentSign="form.student.studentSign"
            v-model:parentSignImage="form.guardian.parentSignImage"
            v-model:studentSignImage="form.student.studentSignImage"
            @submit="handleSubmit" 
          />
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // DB 함수 추가
  import { db } from '../firebase'; // Firebase 설정 파일 임포트
  
  import StudentInfo from '../components/forms/StudentInfo.vue';
  import PeriodSelection from '../components/forms/PeriodSelection.vue';
  import LearningPlan from '../components/forms/LearningPlan.vue';
  import GuardianInfo from '../components/forms/GuardianInfo.vue';
  import SignatureSection from '../components/forms/SignatureSection.vue';
  
  const props = defineProps(['user', 'userData']);
  // const router = useRouter(); // 필요 시 사용
  
  const form = ref({
    student: { name: '', grade: '', classNum: '', number: '', phone: '', studentSign: '', studentSignImage: null },
    period: { type: 'daily', startDate: '', endDate: '', halfTime: 'AM', totalDays: 0, isRuleChecked: false },
    plan: { type: 'family_trip', typeDetail: '', location: '', detail: '' },
    guardian: { 
      parentName: '', parentRel: '부모', parentPhone: '', parentSign: '', parentSignImage: null,
      guideType: 'parent', guideTypeDetail: '', guideName: '', guidePhone: '' 
    }
  });
  
  onMounted(() => {
    if (props.userData) {
      form.value.student.name = props.userData.name || '';
      form.value.student.grade = props.userData.grade || '';
      form.value.student.classNum = props.userData.classNum || props.userData.classroom || props.userData.class || '';
      form.value.student.number = props.userData.number || '';
      form.value.student.phone = props.userData.phone || '';
      form.value.guardian.parentName = props.userData.guardian || props.userData.parentName || '';
      form.value.guardian.parentPhone = props.userData.guardianPhone || props.userData.parentPhone || '';
    }
  });
  
  const handleSubmit = async () => {
    if (!form.value.period.isRuleChecked) return alert('불허 기간 확인에 체크해주세요.');
    if (form.value.period.totalDays === 0) return alert('기간을 올바르게 선택해주세요.');
    if (!form.value.plan.location || !form.value.plan.detail) return alert('장소와 계획을 입력해주세요.');
  
    if (!confirm('신청서를 제출하시겠습니까?')) return;
  
    try {
      // DB 저장용 데이터 구성
      const payload = {
        userId: props.user?.uid, // 로그인한 사용자 ID
        type: '체험학습',         // 구분 값
        student: form.value.student,
        period: form.value.period,
        plan: form.value.plan,
        guardian: form.value.guardian,
        status: '대기중',        // 초기 상태
        createdAt: serverTimestamp(), // 생성 시간
        
        // 검색/정렬을 위한 최상위 필드 복사
        userName: form.value.student.name,
        startDate: form.value.period.startDate,
        totalDays: form.value.period.totalDays
      };
  
      // 'experiential_learning' 컬렉션에 저장
      await addDoc(collection(db, 'experiential_learning'), payload);
  
      alert('신청서가 성공적으로 제출되었습니다.');
      
      // (선택) 제출 후 목록 탭으로 이동하고 싶다면 이벤트를 발생시키거나 라우터 이동
      // router.push('/dashboard'); 
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('제출 중 오류가 발생했습니다.');
    }
  };
  </script>