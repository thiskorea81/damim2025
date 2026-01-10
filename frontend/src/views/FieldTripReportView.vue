<script setup>
    import { ref, onMounted } from 'vue';
    import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
    import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
    import { db, storage } from '../firebase';
    import { FileCheck, Loader2, Edit, Trash2, Calendar, MapPin } from 'lucide-vue-next';
    
    // 폼 컴포넌트 불러오기
    import FieldTripReportForm from '../components/forms/FieldTripReportForm.vue';
    
    const props = defineProps(['user', 'userData', 'editData']);
    const emit = defineEmits(['close']);
    
    const loading = ref(false);
    const submitting = ref(false);
    const activeTab = ref('pending'); // 'pending'(작성대기) | 'submitted'(내 보고서)
    
    const applications = ref([]); // 작성 가능한 신청서 목록
    const myReports = ref([]);    // 이미 제출한 보고서 목록
    
    const selectedApp = ref(null);    // 신규 작성 시 선택한 신청서
    const editingReport = ref(null);  // 수정 시 선택한 보고서
    
    // 1. 데이터 불러오기 (신청서 + 보고서)
    const fetchData = async () => {
      loading.value = true;
      const uid = props.user.uid;
      
      try {
        // A. 승인된 신청서 조회 (userId 기준)
        // 인덱스 에러 방지를 위해 orderBy는 JS에서 처리하거나 복합 인덱스 필요
        const appQ = query(collection(db, 'experiential_learning'), where('userId', '==', uid));
        const appSnap = await getDocs(appQ);
        const allApps = appSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
        // B. 이미 제출한 보고서 조회 (userId 기준)
        const repQ = query(collection(db, 'trip_reports'), where('userId', '==', uid));
        const repSnap = await getDocs(repQ);
        myReports.value = repSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                                      .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    
        // C. 작성 대기 목록 필터링 (상태가 approved이고, 아직 보고서를 안 쓴 것)
        const reportedAppIds = new Set(myReports.value.map(r => r.appId));
        
        applications.value = allApps
          .filter(app => app.status === 'approved' && !reportedAppIds.has(app.id))
          .sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
    
      } catch (e) {
        console.error("데이터 로드 실패:", e);
      } finally {
        loading.value = false;
      }
    };
    
    onMounted(() => {
      fetchData();
      // 내 신청현황에서 수정 버튼 누르고 들어온 경우
      if (props.editData && props.editData.type === '결과보고서') {
        activeTab.value = 'submitted';
        // 로딩 후 해당 ID 찾아서 수정 모드 진입 로직을 추가할 수도 있음
      }
    });
    
    // 2. 날짜 포맷 (안전한 접근)
    const formatDate = (app) => {
      if (!app) return '';
      // 데이터 구조가 period 객체 안에 있을 수도 있고, 최상위에 있을 수도 있음
      const start = app.period?.startDate || app.startDate || '';
      const end = app.period?.endDate || app.endDate || '';
      if (!start) return '-';
      return end ? `${start} ~ ${end}` : start;
    };
    
    // 3. 수정 모드 진입
    const startEdit = (report) => {
      // 수정 시 폼에 보여줄 신청서 정보(목적지 등)를 보고서 데이터 기반으로 가짜 객체 생성
      selectedApp.value = {
        location: report.destination,
        protector: report.chaperone,
        learningType: report.learningType,
        startDate: report.period // 기간 문자열 그대로 전달
      };
      editingReport.value = report;
    };
    
    // 4. 삭제 로직
    const deleteReport = async (reportId) => {
      if(!confirm("정말 삭제하시겠습니까? 삭제 후 다시 작성해야 합니다.")) return;
      try {
        await deleteDoc(doc(db, 'trip_reports', reportId));
        alert("삭제되었습니다.");
        await fetchData(); 
      } catch(e) {
        alert("삭제 실패: " + e.message);
      }
    };
    
    // 5. 저장/수정 처리 (핵심: undefined 방지)
    const handleFormSubmit = async (formData) => {
      if (!confirm(editingReport.value ? "수정하시겠습니까?" : "제출하시겠습니까?")) return;
      submitting.value = true;
    
      try {
        const uploadPhoto = async (file, suffix) => {
          if (!file) return null;
          const path = `reports/${props.user.uid}/${Date.now()}_${suffix}.jpg`;
          const imgRef = storageRef(storage, path);
          await uploadBytes(imgRef, file);
          return await getDownloadURL(imgRef);
        };
    
        // 사진 URL 준비 (기존 URL 유지 또는 새 파일 업로드)
        // DB에서 가져온 값이 없을 경우를 대비해 || null 처리
        let p1Url = editingReport.value?.photo1 || null;
        let p2Url = editingReport.value?.photo2 || null;
        let tUrl  = editingReport.value?.ticket || null;
    
        // 새 파일이 있으면 업로드
        if (formData.isPhoto1New && formData.photo1) p1Url = await uploadPhoto(formData.photo1, '1');
        if (formData.isPhoto2New && formData.photo2) p2Url = await uploadPhoto(formData.photo2, '2');
        if (formData.isTicketNew && formData.ticket) tUrl = await uploadPhoto(formData.ticket, 'tk');
    
        // 공통 저장 데이터 (undefined가 없도록 || null 처리 필수)
        const commonData = {
          title: formData.title || '',
          content: formData.content || '',
          photo1: p1Url,
          photo2: p2Url,
          ticket: tUrl, 
          studentSign: formData.studentSignData || null,
          parentSign: formData.parentSignData || null,
          status: 'submitted'
        };
    
        if (editingReport.value) {
          // [수정]
          await updateDoc(doc(db, 'trip_reports', editingReport.value.id), {
            ...commonData,
            updatedAt: serverTimestamp()
          });
          alert("수정되었습니다.");
        } else {
          // [신규]
          // selectedApp에서 값을 가져올 때도 안전하게 접근
          const app = selectedApp.value || {};
          const plan = app.plan || {};
          const guardian = app.guardian || {};
    
          await addDoc(collection(db, 'trip_reports'), {
            ...commonData,
            userId: props.user.uid,
            appId: app.id || null,
            
            // 학생 정보 (Props에서 가져옴)
            studentId: props.userData.studentId || '',
            name: props.userData.name || '',
            grade: props.userData.grade || '',
            classNum: props.userData.classNum || props.userData.class || '',
            number: props.userData.number || '',
            
            // 메타 정보 (신청서 기반)
            period: formatDate(app),
            destination: plan.location || app.location || '',
            chaperone: app.protector || guardian.parentName || '',
            learningType: plan.typeDetail || app.learningType || '',
            
            createdAt: serverTimestamp()
          });
          alert("제출되었습니다.");
        }
    
        // 초기화 및 갱신
        editingReport.value = null;
        selectedApp.value = null;
        activeTab.value = 'submitted';
        await fetchData();
    
      } catch (e) {
        console.error("저장 오류:", e);
        alert("처리 중 오류가 발생했습니다: " + e.message);
      } finally {
        submitting.value = false;
      }
    };
    </script>
    
    <template>
      <div class="max-w-4xl mx-auto bg-white min-h-screen md:min-h-0 md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        
        <div class="bg-white border-b sticky top-0 z-10">
          <div class="px-6 py-4 flex justify-between items-center">
            <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileCheck class="w-6 h-6 text-green-600"/> 체험학습 결과보고서
            </h2>
            <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 font-bold">닫기</button>
          </div>
          
          <div class="flex px-6 gap-6" v-if="!selectedApp && !editingReport">
            <button 
              @click="activeTab = 'pending'"
              class="pb-3 text-sm font-bold border-b-2 transition"
              :class="activeTab === 'pending' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'"
            >
              작성 대기 ({{ applications.length }})
            </button>
            <button 
              @click="activeTab = 'submitted'"
              class="pb-3 text-sm font-bold border-b-2 transition"
              :class="activeTab === 'submitted' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'"
            >
              내 보고서 ({{ myReports.length }})
            </button>
          </div>
        </div>
    
        <div class="flex-1 overflow-y-auto p-6 bg-gray-50">
          
          <div v-if="loading" class="text-center py-20"><Loader2 class="w-8 h-8 animate-spin mx-auto text-gray-400"/></div>
    
          <div v-else-if="activeTab === 'pending' && !selectedApp" class="space-y-4">
            <div v-if="applications.length === 0" class="text-center py-12 text-gray-400 border border-dashed rounded-xl bg-white">
              작성할 내역이 없습니다. (승인된 신청서만 표시됩니다)
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="app in applications" :key="app.id" class="bg-white p-5 rounded-xl border hover:shadow-md transition">
                <h3 class="font-bold text-lg mb-1">{{ app.plan?.location || app.location || '장소 정보 없음' }}</h3>
                <p class="text-sm text-gray-500 mb-4 flex items-center gap-1">
                  <Calendar class="w-3 h-3"/> {{ formatDate(app) }}
                </p>
                <div class="flex justify-between items-center mt-2">
                  <span class="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-bold">승인됨</span>
                  <button @click="selectedApp = app" class="px-4 py-2 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 transition text-sm">
                    작성하기
                  </button>
                </div>
              </div>
            </div>
          </div>
    
          <div v-else-if="activeTab === 'submitted' && !editingReport" class="space-y-4">
            <div v-if="myReports.length === 0" class="text-center py-12 text-gray-400 border border-dashed rounded-xl bg-white">
              제출된 보고서가 없습니다.
            </div>
            <div v-else class="space-y-3">
              <div v-for="rep in myReports" :key="rep.id" class="bg-white p-4 rounded-xl border flex justify-between items-center group">
                <div>
                  <h3 class="font-bold text-gray-800">{{ rep.title }}</h3>
                  <p class="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin class="w-3 h-3"/> {{ rep.destination || '장소 미상' }} 
                    <span class="mx-1">|</span>
                    {{ new Date(rep.createdAt?.toDate()).toLocaleDateString() }} 제출
                  </p>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button @click="startEdit(rep)" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="수정"><Edit class="w-4 h-4"/></button>
                  <button @click="deleteReport(rep.id)" class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="삭제"><Trash2 class="w-4 h-4"/></button>
                </div>
              </div>
            </div>
          </div>
    
          <FieldTripReportForm 
            v-if="selectedApp || editingReport"
            :user-data="userData"
            :selected-app="selectedApp"
            :initial-data="editingReport"
            :formatted-period="editingReport ? editingReport.period : formatDate(selectedApp)"
            :submitting="submitting"
            @submit="handleFormSubmit"
            @cancel="selectedApp = null; editingReport = null;"
          />
    
        </div>
      </div>
    </template>