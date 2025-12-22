<script setup>
import { ref } from 'vue';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, getAppId } from '../../firebase';
import { useSystemStore } from '../../stores/systemStore';
import { 
  UserPlus, GraduationCap, Baby, School, 
  Phone, Mail, Lock, AlertCircle, CheckCircle, Loader2, User
} from 'lucide-vue-next';

const emit = defineEmits(['switch-mode']);
const systemStore = useSystemStore();

const email = ref('');
const password = ref('');
const name = ref('');
const role = ref('student');

// 상세 정보
const grade = ref('');
const cls = ref('');
const num = ref('');
const userPhone = ref('');
const childName = ref('');
const parentName = ref('');
const parentPhone = ref('');
const gender = ref('male');

const isSubmitting = ref(false);
const error = ref('');
const successMsg = ref('');
const appId = getAppId();

const getKoreanErrorMessage = (code) => {
  if (code === 'auth/email-already-in-use') return '이미 가입된 이메일입니다.';
  if (code === 'auth/invalid-email') return '유효하지 않은 이메일 형식입니다.';
  if (code === 'auth/weak-password') return '비밀번호는 6자 이상이어야 합니다.';
  return '오류: ' + code;
};

const handleSignUp = async () => {
  error.value = '';
  if (!name.value.trim()) { error.value = '이름을 입력해주세요.'; return; }
  
  if (role.value === 'student' && (!grade.value || !cls.value || !num.value || !userPhone.value || !parentName.value || !parentPhone.value)) {
     error.value = '모든 정보를 입력해주세요.'; return;
  }

  isSubmitting.value = true;

  try {
    // 이메일 도메인 자동 완성
    let signupEmail = email.value.trim();
    if (!signupEmail.includes('@')) {
       const domain = systemStore.config.domain || 'school.kr';
       signupEmail = `${signupEmail}@${domain}`;
    }

    // 1. 대기 명단 확인
    const preUserRef = doc(db, 'artifacts', appId, 'pre_users', signupEmail);
    const preUserSnap = await getDoc(preUserRef);
    const isPreRegistered = preUserSnap.exists();
    const preData = isPreRegistered ? preUserSnap.data() : null;

    // 2. 계정 생성
    const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, password.value);
    const newUser = userCredential.user;
    
    const finalName = preData?.name || name.value;
    await updateProfile(newUser, { displayName: finalName });

    // 3. 데이터 구성
    let userProfile = {
      email: signupEmail,
      name: finalName,
      role: preData?.role || role.value, 
      joinedAt: new Date().toISOString(),
      mustChangePassword: isPreRegistered ? true : false,
      isNewUser: isPreRegistered ? true : false 
    };

    if (userProfile.role === 'student') {
      const fGrade = preData?.grade || String(grade.value);
      const fClass = preData?.class || String(cls.value).padStart(2,'0');
      const fNum = preData?.number || String(num.value).padStart(2,'0');
      
      userProfile = { 
        ...userProfile, 
        studentId: preData?.studentId || `${fGrade}${fClass}${fNum}`,
        grade: fGrade, class: fClass, number: fNum, 
        phone: userPhone.value,
        parentName: parentName.value, parentPhone: parentPhone.value,
        gender: preData?.gender || gender.value 
      };
    } else if (userProfile.role === 'parent') {
      userProfile = { ...userProfile, childName: childName.value, phone: userPhone.value };
    } else if (userProfile.role === 'teacher') {
      userProfile = { ...userProfile, assignedGrade: String(grade.value), assignedClass: String(cls.value).padStart(2,'0') };
    }

    // 4. 저장 (신규 경로 + 구버전 경로)
    await setDoc(doc(db, 'artifacts', appId, 'users', newUser.uid), userProfile);
    await setDoc(doc(db, 'artifacts', appId, 'users', newUser.uid, 'profile', 'info'), userProfile);

    // 5. 대기 명단 정리
    if (isPreRegistered) {
      await deleteDoc(preUserRef);
    }
    
    successMsg.value = '가입 완료! 잠시 후 로그인됩니다...';
    setTimeout(() => { window.location.reload(); }, 1500);

  } catch (err) {
    console.error(err);
    error.value = getKoreanErrorMessage(err.code);
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="px-8 pb-8">
    <div class="flex bg-gray-100 p-1 rounded-lg mb-6">
      <button 
        type="button" 
        @click="role = 'student'" 
        :class="['flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-all', role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
      >
        <GraduationCap class="w-4 h-4"/> 학생
      </button>
      <button 
        type="button" 
        @click="role = 'parent'" 
        :class="['flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-all', role === 'parent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
      >
        <Baby class="w-4 h-4"/> 학부모
      </button>
      <button 
        type="button" 
        @click="role = 'teacher'" 
        :class="['flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-all', role === 'teacher' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
      >
        <School class="w-4 h-4"/> 교사
      </button>
    </div>

    <form @submit.prevent="handleSignUp" class="flex flex-col gap-4">
      
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-1">이름</label>
        <input 
          type="text" 
          required 
          v-model="name" 
          placeholder="본인 성함" 
          class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-colors placeholder-gray-400"
        />
      </div>

      <div v-if="role === 'student'" class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
        <p class="text-xs font-bold text-indigo-800 uppercase">학생 필수 정보</p>
        
        <div class="flex gap-4 bg-white p-2 rounded-lg border border-indigo-100">
          <label class="flex items-center gap-2 text-sm font-medium text-indigo-900 cursor-pointer">
            <input type="radio" v-model="gender" value="male" class="text-indigo-600 focus:ring-indigo-500"> 남학생
          </label>
          <label class="flex items-center gap-2 text-sm font-medium text-indigo-900 cursor-pointer">
            <input type="radio" v-model="gender" value="female" class="text-indigo-600 focus:ring-indigo-500"> 여학생
          </label>
        </div>

        <div class="flex gap-2">
          <input type="number" v-model="grade" placeholder="학년" class="flex-1 w-full px-3 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 outline-none" />
          <input type="number" v-model="cls" placeholder="반" class="flex-1 w-full px-3 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 outline-none" />
          <input type="number" v-model="num" placeholder="번호" class="flex-1 w-full px-3 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 outline-none" />
        </div>

        <div class="relative">
          <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400"/>
          <input type="tel" v-model="userPhone" placeholder="학생 연락처" class="w-full pl-9 pr-3 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 outline-none"/>
        </div>

        <p class="text-xs font-bold text-gray-600 mt-2 uppercase">보호자 정보</p>
        <div class="relative">
          <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="text" v-model="parentName" placeholder="보호자 성함" class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:border-gray-500 outline-none"/>
        </div>
        <div class="relative">
          <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="tel" v-model="parentPhone" placeholder="보호자 연락처" class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:border-gray-500 outline-none"/>
        </div>
      </div>

      <div v-if="role === 'parent'" class="bg-pink-50 border border-pink-200 rounded-lg p-4 space-y-3">
         <p class="text-xs font-bold text-pink-800 uppercase">자녀 및 연락처 정보</p>
         <input type="text" v-model="childName" placeholder="자녀 이름" class="w-full px-3 py-2 border border-pink-200 rounded text-sm focus:border-pink-500 outline-none"/>
         <input type="tel" v-model="userPhone" placeholder="연락처" class="w-full px-3 py-2 border border-pink-200 rounded text-sm focus:border-pink-500 outline-none"/>
      </div>
      
      <div v-if="role === 'teacher'" class="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
         <p class="text-xs font-bold text-green-800 uppercase">담당 학급 정보 (선택)</p>
         <div class="flex gap-2">
           <input type="number" v-model="grade" placeholder="학년" class="flex-1 w-full px-3 py-2 border border-green-200 rounded text-sm focus:border-green-500 outline-none"/>
           <input type="number" v-model="cls" placeholder="반" class="flex-1 w-full px-3 py-2 border border-green-200 rounded text-sm focus:border-green-500 outline-none"/>
         </div>
      </div>

      <div>
        <label class="block text-sm font-bold text-gray-700 mb-1">아이디 (이메일)</label>
        <div class="relative">
          <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            required 
            v-model="email" 
            placeholder="예: 10101" 
            class="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-colors placeholder-gray-400"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-bold text-gray-700 mb-1">비밀번호</label>
        <div class="relative">
          <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="password" 
            required 
            v-model="password" 
            placeholder="••••••••" 
            class="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-colors placeholder-gray-400"
          />
        </div>
      </div>

      <div v-if="error" class="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
        <AlertCircle class="w-4 h-4 flex-shrink-0"/> {{ error }}
      </div>
      <div v-if="successMsg" class="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
        <CheckCircle class="w-4 h-4 flex-shrink-0"/> {{ successMsg }}
      </div>

      <button 
        type="submit" 
        :disabled="isSubmitting" 
        class="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
      >
        <Loader2 v-if="isSubmitting" class="w-5 h-5 animate-spin" />
        <span v-else>가입하기</span>
      </button>
    </form>

    <div class="text-center mt-4">
      <button 
        type="button" 
        @click="$emit('switch-mode')" 
        class="text-sm text-blue-600 font-bold hover:underline bg-transparent border-none cursor-pointer"
      >
        이미 계정이 있으신가요? 로그인하기
      </button>
    </div>
  </div>
</template>