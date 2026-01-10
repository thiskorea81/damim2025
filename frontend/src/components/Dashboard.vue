// frontend/src/components/Dashboard.vue
<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { signOut } from 'firebase/auth';
  import { auth, db } from '../firebase';
  import { doc, getDoc } from 'firebase/firestore';
  import { LogOut, GraduationCap, BookOpen } from 'lucide-vue-next';
  
  // --- 컴포넌트 임포트 ---
  import TabMenu from './dashboard/TabMenu.vue';
  import ProfileCard from './dashboard/ProfileCard.vue';
  import StudentHistory from './dashboard/StudentHistory.vue';
  import ForceChangePassword from './dashboard/parts/ForceChangePassword.vue';
  import EditProfileModal from './dashboard/parts/EditProfileModal.vue';
  
  // [신청서 폼] (학생/교사 공용 View)
  import AbsenceForm from './forms/AbsenceForm.vue';
  import ExperientialLearningForm from '../views/ExperientialLearningForm.vue'; // 학생용 신청 폼
  import FieldTripReportView from '../views/FieldTripReportView.vue';       // 결과보고서 View
  
  // [학생용 기능]
  import MyGrade from './grade/MyGrade.vue';
  import StudentRecordCheck from './dashboard/StudentRecordCheck.vue';
  
  // [교사용 기능]
  import ClassDocumentManager from './teacher/ClassDocumentManager.vue';
  import StudentManager from './teacher/StudentManager.vue';
  import TeacherSettings from './teacher/TeacherSettings.vue'; 
  import GradeManager from './teacher/GradeManager.vue';
  import StudentRecordManager from './teacher/StudentRecordManager.vue'; 
  // [신규] 교사용 체험학습 승인/출력 관리자
  import TeacherFieldTripManager from '../components/teacher/TeacherFieldTripManager.vue'; 
  
  const props = defineProps({
    user: { type: Object, required: true },
    userData: { type: Object, default: null }
  });
  
  const activeTab = ref('profile');
  const safeRole = computed(() => props.userData?.role || 'unknown');
  const editTargetData = ref(null);
  
  const showPasswordModal = computed(() => props.userData?.mustChangePassword === true);
  const showProfileModal = computed(() => props.userData?.isNewUser === true);
  
  // [설정] 전역 설정 상태
  const globalSettings = ref({ 
    showGradeTab: false, 
    showRecordTab: false,
    showAppStatus: true,
    showAbsence: true,
    showFieldTrip: true
  });
  
  // 설정 로드 함수
  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) {
        globalSettings.value = snap.data();
      }
    } catch (e) {
      console.error("설정 로드 실패:", e);
    }
  };
  
  onMounted(() => {
    loadSettings();
  });
  
  const handleLogout = async () => {
    if(confirm("로그아웃 하시겠습니까?")) await signOut(auth);
  };
  
  const handleEditRequest = (data) => {
    editTargetData.value = data;
    if (data.type === '결석신고서') activeTab.value = 'absence';
    else if (data.type === '체험학습') activeTab.value = 'trip_app';
    else if (data.type === '결과보고서') activeTab.value = 'trip_report';
    else alert("수정 가능한 항목이 아닙니다.");
  };
  
  const handleFormClose = () => {
    editTargetData.value = null;
    // 교사는 학생관리로, 학생은 내역으로 복귀
    if (safeRole.value === 'teacher') activeTab.value = 'students';
    else activeTab.value = 'history';
  };
  </script>
  
  <template>
    <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      <ForceChangePassword v-if="showPasswordModal" :user="user" />
      <EditProfileModal 
        v-if="!showPasswordModal && showProfileModal" 
        :user="user" 
        :userData="userData" 
        :safeRole="safeRole" 
        :forceOpen="true" 
      />
  
      <nav class="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16 items-center">
            
            <div 
              class="flex items-center gap-3 cursor-pointer group" 
              @click="activeTab = 'profile'"
            >
              <div class="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm group-hover:bg-blue-700 transition-colors">
                <GraduationCap class="w-5 h-5" />
              </div>
              <span class="font-extrabold text-xl text-gray-800 tracking-tight group-hover:text-blue-600 transition-colors">
                Teacher Diary
              </span>
            </div>
  
            <button 
              @click="handleLogout" 
              class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <LogOut class="w-4 h-4" />
              <span class="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </nav>
  
      <main class="flex-1 w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        <div class="mb-6">
           <TabMenu 
             v-model:activeTab="activeTab" 
             :userRole="safeRole" 
             :settings="globalSettings"
           />
        </div>
  
        <ProfileCard v-if="activeTab === 'profile'" :user="user" :userData="userData" />
  
        <template v-if="safeRole !== 'teacher'">
          <StudentHistory 
            v-if="activeTab === 'history'" 
            :user="user" 
            @edit="handleEditRequest" 
          />
          
          <AbsenceForm 
            v-if="activeTab === 'absence'" 
            :user="user" 
            :userData="userData" 
            :editData="editTargetData" 
            @close="handleFormClose" 
            @submitted="handleFormClose" 
          />
          
          <MyGrade 
            v-if="activeTab === 'grades' && globalSettings.showGradeTab" 
            :user="user" 
            :userData="userData" 
          />
          
          <StudentRecordCheck 
            v-if="activeTab === 'records' && globalSettings.showRecordTab" 
            :user="user" 
            :userData="userData" 
          />
  
          <div v-if="activeTab === 'trip_app'">
            <ExperientialLearningForm 
              :user="user" 
              :userData="userData" 
              :editData="editTargetData"
              @close="handleFormClose"
            />
          </div>
  
          <div v-if="activeTab === 'trip_report'">
             <FieldTripReportView 
               :user="user" 
               :userData="userData"
               :editData="editTargetData"
               @close="handleFormClose"
             />
          </div>
        </template>
  
        <template v-if="safeRole === 'teacher'">
          <StudentManager 
            v-if="activeTab === 'students'" 
            :teacherData="userData" 
            :user="user" 
          />
          
          <ClassDocumentManager 
            v-if="activeTab === 'class_docs'" 
            :teacherData="userData" 
            :user="user" 
          />
          
          <TeacherSettings 
            v-if="activeTab === 'settings'" 
            :user="user" 
            :userData="userData" 
          />
  
          <GradeManager 
            v-if="activeTab === 'grade_mgmt'" 
          />
          
          <StudentRecordManager 
            v-if="activeTab === 'record_mgmt'" 
          />
  
          <AbsenceForm 
            v-if="activeTab === 'absence'" 
            :user="user" 
            :userData="userData" 
            @close="activeTab = 'students'" 
          />
          
          <ExperientialLearningForm 
            v-if="activeTab === 'trip_app'"
              :user="user" 
              :userData="userData" 
              :editData="editTargetData"
              @close="handleFormClose"
            />
  
          <FieldTripReportView 
            v-if="activeTab === 'trip_report'" 
            :user="user" 
            :userData="userData" 
            @close="activeTab = 'students'"
          />
        </template>
  
      </main>
    </div>
  </template>