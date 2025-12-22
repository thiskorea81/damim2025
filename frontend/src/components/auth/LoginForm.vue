<script setup>
import { ref, onMounted } from 'vue';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, getAppId } from '../../firebase';
import { useSystemStore } from '../../stores/systemStore';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-vue-next';

const emit = defineEmits(['switch-mode']);
const systemStore = useSystemStore();

const email = ref('');
const password = ref('');
const isSubmitting = ref(false);
const error = ref('');

// 도메인 설정 로드
onMounted(() => systemStore.fetchConfig());

const getKoreanErrorMessage = (code) => {
  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') return '이메일 또는 비밀번호가 잘못되었습니다.';
  if (code === 'auth/wrong-password') return '비밀번호가 올바르지 않습니다.';
  if (code === 'auth/email-already-in-use') return '이미 가입된 이메일입니다.';
  return '오류: ' + code;
};

const handleLogin = async () => {
  error.value = ''; 
  isSubmitting.value = true;

  // 이메일 도메인 자동 완성
  let loginEmail = email.value.trim();
  if (!loginEmail.includes('@')) {
    const domain = systemStore.config.domain || 'school.kr';
    loginEmail = `${loginEmail}@${domain}`;
  }

  try {
    // 1. 일반 로그인 시도
    await signInWithEmailAndPassword(auth, loginEmail, password.value);
  } catch (err) {
    // 2. 계정이 없는 경우 -> 대기자 명단(pre_users) 확인하여 활성화 시도
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      await tryActivateAccount(loginEmail);
    } else {
      error.value = getKoreanErrorMessage(err.code);
      isSubmitting.value = false;
    }
  }
};

const tryActivateAccount = async (targetEmail) => {
  try {
    const appId = getAppId();
    const preUserRef = doc(db, 'artifacts', appId, 'pre_users', targetEmail);
    const preUserSnap = await getDoc(preUserRef);

    if (preUserSnap.exists()) {
      const preData = preUserSnap.data();
      
      // 초기 비밀번호 확인
      if (preData.initialPassword === password.value) {
        // 계정 생성 (가입)
        const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, password.value);
        const newUser = userCredential.user;
        await updateProfile(newUser, { displayName: preData.name });

        // 프로필 DB 저장
        const userProfile = {
          ...preData,
          initialPassword: null, 
          joinedAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'artifacts', appId, 'users', newUser.uid), userProfile);
        await setDoc(doc(db, 'artifacts', appId, 'users', newUser.uid, 'profile', 'info'), userProfile);

        // 대기 명단 삭제
        await deleteDoc(preUserRef);

        // 상태 강제 갱신
        await systemStore.fetchCurrentUser(newUser.uid);

        return; 
      }
    }
    error.value = "등록되지 않은 사용자거나 비밀번호가 틀렸습니다.";
    isSubmitting.value = false;

  } catch (e) {
    console.error(e);
    if (e.code === 'auth/email-already-in-use') error.value = "이미 가입된 계정입니다. 비밀번호를 확인하세요.";
    else error.value = "계정 활성화 오류: " + e.message;
    isSubmitting.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
    <div>
      <label class="block text-sm font-bold text-gray-700 mb-1">아이디 (이메일)</label>
      <div class="relative">
        <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          required 
          v-model="email" 
          :placeholder="`예: 10101 (@${systemStore.config.domain || 'school.kr'} 자동입력)`" 
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
      <AlertCircle class="w-4 h-4 flex-shrink-0" /> 
      <span>{{ error }}</span>
    </div>

    <button 
      type="submit" 
      :disabled="isSubmitting" 
      class="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
    >
      <Loader2 v-if="isSubmitting" class="w-5 h-5 animate-spin" />
      <span v-else>로그인</span>
    </button>
    
    <div class="text-center mt-2">
      <button 
        type="button" 
        @click="$emit('switch-mode')" 
        class="text-sm text-blue-600 font-bold hover:underline bg-transparent border-none cursor-pointer"
      >
        계정이 없으신가요? 회원가입하기
      </button>
    </div>
  </form>
</template>