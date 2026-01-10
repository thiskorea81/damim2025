<script setup>
  import { 
    FileText, Send, ClipboardList, BookOpen, CheckCircle, 
    List, Users, Settings, Trophy, FileCheck 
  } from 'lucide-vue-next';
  
  defineProps({
    activeTab: String,
    userRole: String,
    settings: Object
  });
  defineEmits(['update:activeTab']);
  
  const baseTabClass = 'flex items-center px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap shadow-sm transition-all duration-200 outline-none select-none';
  const inactiveClass = 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:shadow border border-transparent';
  const activeStudentClass = 'bg-blue-50 text-blue-600 ring-2 ring-blue-200 border-transparent';
  const activeTeacherClass = 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 border-transparent hover:bg-emerald-600';
  </script>
  
  <template>
    <nav class="flex gap-3 mb-6 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
      
      <button @click="$emit('update:activeTab', 'profile')" :class="[baseTabClass, activeTab === 'profile' ? activeStudentClass : inactiveClass]">
        <CheckCircle class="w-4 h-4 mr-2" /> 내 정보
      </button>
      
      <template v-if="userRole !== 'teacher'">
        <button v-if="settings?.showAppStatus !== false" @click="$emit('update:activeTab', 'history')" :class="[baseTabClass, activeTab === 'history' ? activeStudentClass : inactiveClass]">
          <List class="w-4 h-4 mr-2" /> 내 신청 현황
        </button>
        <button v-if="settings?.showGradeTab" @click="$emit('update:activeTab', 'grades')" :class="[baseTabClass, activeTab === 'grades' ? activeStudentClass : inactiveClass]">
          <Trophy class="w-4 h-4 mr-2" /> 내 성적
        </button>
        <button v-if="settings?.showRecordTab" @click="$emit('update:activeTab', 'records')" :class="[baseTabClass, activeTab === 'records' ? activeStudentClass : inactiveClass]">
          <BookOpen class="w-4 h-4 mr-2" /> 생기부 점검
        </button>
  
        <button v-if="settings?.showAbsence !== false" @click="$emit('update:activeTab', 'absence')" :class="[baseTabClass, activeTab === 'absence' ? activeStudentClass : inactiveClass]">
          <FileText class="w-4 h-4 mr-2" /> 결석신고서
        </button>
        <button v-if="settings?.showFieldTrip !== false" @click="$emit('update:activeTab', 'trip_app')" :class="[baseTabClass, activeTab === 'trip_app' ? activeStudentClass : inactiveClass]">
          <Send class="w-4 h-4 mr-2" /> 체험학습신청
        </button>
        <button v-if="settings?.showFieldTrip !== false" @click="$emit('update:activeTab', 'trip_report')" :class="[baseTabClass, activeTab === 'trip_report' ? activeStudentClass : inactiveClass]">
          <FileCheck class="w-4 h-4 mr-2" /> 결과보고서
        </button>
      </template>
  
      <template v-if="userRole === 'teacher'">
        <button @click="$emit('update:activeTab', 'students')" :class="[baseTabClass, activeTab === 'students' ? activeTeacherClass : inactiveClass]">
          <Users class="w-4 h-4 mr-2" /> 학생 관리
        </button>
        <button @click="$emit('update:activeTab', 'grade_mgmt')" :class="[baseTabClass, activeTab === 'grade_mgmt' ? activeTeacherClass : inactiveClass]">
          <Trophy class="w-4 h-4 mr-2" /> 성적 관리
        </button>
        <button @click="$emit('update:activeTab', 'record_mgmt')" :class="[baseTabClass, activeTab === 'record_mgmt' ? activeTeacherClass : inactiveClass]">
          <BookOpen class="w-4 h-4 mr-2" /> 생기부 관리
        </button>
        <button @click="$emit('update:activeTab', 'class_docs')" :class="[baseTabClass, activeTab === 'class_docs' ? activeTeacherClass : inactiveClass]">
          <ClipboardList class="w-4 h-4 mr-2" /> 학급 문서함
        </button>
        
        <div class="w-px h-6 bg-gray-300 mx-1"></div> <button @click="$emit('update:activeTab', 'absence')" :class="[baseTabClass, activeTab === 'absence' ? activeTeacherClass : inactiveClass]">
          <FileText class="w-4 h-4 mr-2" /> 결석신고
        </button>
        <button @click="$emit('update:activeTab', 'trip_app')" :class="[baseTabClass, activeTab === 'trip_app' ? activeTeacherClass : inactiveClass]">
          <Send class="w-4 h-4 mr-2" /> 체험학습
        </button>
        <button @click="$emit('update:activeTab', 'trip_report')" :class="[baseTabClass, activeTab === 'trip_report' ? activeTeacherClass : inactiveClass]">
          <FileCheck class="w-4 h-4 mr-2" /> 결과보고
        </button>
  
        <div class="w-px h-6 bg-gray-300 mx-1"></div> <button @click="$emit('update:activeTab', 'settings')" :class="[baseTabClass, activeTab === 'settings' ? activeTeacherClass : inactiveClass]">
          <Settings class="w-4 h-4 mr-2" /> 설정
        </button>
      </template>
    </nav>
  </template>