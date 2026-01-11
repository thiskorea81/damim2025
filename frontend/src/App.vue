<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth } from './firebase';
  import { useSystemStore } from './stores/systemStore';
  
  import LoadingSpinner from './components/LoadingSpinner.vue';
  import Dashboard from './components/Dashboard.vue';
  import AuthForm from './components/AuthForm.vue';
  import AdminDashboard from './components/admin/AdminDashboard.vue';
  
  const user = ref(null);
  const loading = ref(true);
  const store = useSystemStore();
  
  const userData = computed(() => store.currentUserData);
  
  onMounted(() => {
    onAuthStateChanged(auth, async (currentUser) => {
      user.value = currentUser;
      
      if (currentUser) {
        // 1. 일단 DB에서 데이터 가져오기
        await store.fetchCurrentUser(currentUser.uid);
        
        // [수정된 부분] 
        // 데이터가 있든 없든, 이메일이 admin@admin.com이면 강제로 관리자 권한 부여
        if (currentUser.email === 'admin@admin.com') {
          store.currentUserData = {
            ...(store.currentUserData || {}), // 기존 데이터가 있다면 유지
            name: '관리자',
            email: currentUser.email,
            role: 'admin' // role을 강제로 admin으로 덮어쓰기
          };
        }
      } else {
        store.currentUserData = null;
      }
      
      loading.value = false;
    });
  });
  </script>
  
  <template>
    <LoadingSpinner v-if="loading" />
    
    <AdminDashboard 
      v-else-if="user && userData?.role === 'admin'" 
    />
    
    <Dashboard 
      v-else-if="user" 
      :user="user" 
      :userData="userData" 
    />
    
    <AuthForm v-else />
  </template>