<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { collection, query, where, getDocs, doc, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';
  import { db, getAppId } from '../../firebase';
  import { useSystemStore } from '../../stores/systemStore';
  import { printDocument } from '../../utils/printUtils';
  import { ClipboardList, CheckCircle, XCircle, Clock, Printer, Loader2, FileText, Plane, FileCheck, FileDown } from 'lucide-vue-next';
  
  // 모달 컴포넌트 임포트
  import DocumentReviewModal from './DocumentReviewModal.vue';
  
  const props = defineProps(['teacherData', 'user']);
  const systemStore = useSystemStore();
  
  const documents = ref([]);
  const loading = ref(false);
  const filterType = ref('all');
  
  // 모달 제어 상태
  const showModal = ref(false);
  const selectedDoc = ref(null);
  const cumulativeData = ref({ domestic: 0, overseas: 0 }); 
  
  // 1. 문서 통합 조회
  const fetchDocuments = async () => {
    loading.value = true;
    documents.value = [];
    
    await systemStore.fetchConfig();
    const appId = getAppId();
    const targetGrade = String(props.teacherData.assignedGrade);
    const targetClass = String(props.teacherData.assignedClass);
  
    try {
      const qAbsence = query(collection(db, 'artifacts', appId, 'public', 'data', 'submissions'), where('grade', '==', targetGrade), where('class', '==', targetClass));
      const qTripApp = query(collection(db, 'experiential_learning'), where('student.grade', '==', targetGrade), where('student.classNum', '==', targetClass));
      const qTripRep = query(collection(db, 'trip_reports'), where('grade', '==', targetGrade), where('classNum', '==', targetClass));
  
      const [snapAbsence, snapTripApp, snapTripRep] = await Promise.all([getDocs(qAbsence), getDocs(qTripApp), getDocs(qTripRep)]);
  
      const docs = [];
  
      // A. 결석신고서
      snapAbsence.forEach(d => {
        const data = d.data();
        if (data.type !== '체험학습') {
          docs.push({
            id: d.id, type: '결석신고서', collectionName: 'submissions', fullPath: `artifacts/${appId}/public/data/submissions`, ...data
          });
        }
      });
  
      // B. 체험학습 신청서
      snapTripApp.forEach(d => {
        const data = d.data();
        docs.push({
          id: d.id, type: '체험학습', collectionName: 'experiential_learning',
          name: data.student?.name, grade: data.student?.grade, classNum: data.student?.classNum, number: data.student?.number,
          studentId: data.userId, 
          location: data.plan?.location, startDate: data.period?.startDate, endDate: data.period?.endDate, totalDays: Number(data.period?.totalDays || 0),
          status: data.status || 'pending', createdAt: data.createdAt, ...data
        });
      });
  
      // C. 결과보고서
      snapTripRep.forEach(d => {
        const data = d.data();
        docs.push({ id: d.id, type: '결과보고서', collectionName: 'trip_reports', ...data });
      });
  
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      documents.value = docs;
  
    } catch (e) { console.error("문서 로드 실패:", e); } finally { loading.value = false; }
  };
  
  onMounted(fetchDocuments);
  
  const filteredDocs = computed(() => {
    if (filterType.value === 'all') return documents.value;
    if (filterType.value === 'absence') return documents.value.filter(d => d.type === '결석신고서');
    if (filterType.value === 'field_trip') return documents.value.filter(d => d.type === '체험학습' || d.type === '결과보고서');
    return documents.value;
  });
  
  // [기능] 누적 일수 자동 계산
  const calculateCumulative = async (studentId, currentAppId, currentDays) => {
    if (!studentId) return { domestic: 0, overseas: 0 };
    const q = query(collection(db, 'experiential_learning'), where('userId', '==', studentId), where('status', '==', 'approved'));
    const snap = await getDocs(q);
    let total = 0;
    snap.forEach(doc => {
      if (doc.id !== currentAppId) total += Number(doc.data().period?.totalDays || 0);
    });
    return { domestic: total + currentDays, overseas: 0 };
  };
  
  // [UI Action] 미승인 문서 클릭 -> 모달 열기
  const handleDocClick = async (docItem) => {
    selectedDoc.value = docItem;
    if (docItem.type === '체험학습') {
      cumulativeData.value = await calculateCumulative(docItem.studentId, docItem.id, docItem.totalDays);
    } else {
      cumulativeData.value = null;
    }
    showModal.value = true;
  };
  
  // [UI Action] 승인된 문서 인쇄/PDF 저장
  const handleDirectPrint = (docItem) => {
    printDocument(docItem, props.teacherData, systemStore.config?.approvalLine);
  };
  
  // [Modal Event] 승인 완료 처리
  const onApprove = async (payload) => {
    if (!confirm("승인 처리하시겠습니까?")) return;
    
    try {
      const docData = selectedDoc.value;
      let updateData = { status: 'approved', approvalDate: serverTimestamp() };
  
      if (payload.type === '결석신고서') {
        updateData = { ...updateData, teacherCheck: payload.teacherCheck, teacherSignature: payload.teacherSignature };
      } else if (payload.type === '체험학습') {
        updateData = { ...updateData, cumulativeDomestic: cumulativeData.value.domestic, cumulativeOverseas: cumulativeData.value.overseas, teacherSignature: payload.teacherSignature };
      }
  
      let docRef;
      if (docData.type === '체험학습') docRef = doc(db, 'experiential_learning', docData.id);
      else if (docData.type === '결과보고서') docRef = doc(db, 'trip_reports', docData.id);
      else docRef = doc(db, docData.fullPath, docData.id);
  
      await updateDoc(docRef, updateData);
  
      // 자동 출력
      const printData = { ...docData, ...updateData, cumulativeDomestic: cumulativeData.value?.domestic || 0, cumulativeOverseas: cumulativeData.value?.overseas || 0 };
      printDocument(printData, props.teacherData, systemStore.config?.approvalLine);
  
      alert("승인 및 출력이 완료되었습니다.");
      showModal.value = false;
      await fetchDocuments();
  
    } catch (e) {
      console.error(e);
      alert("오류 발생: " + e.message);
    }
  };
  
  const onReject = async () => {
    const reason = prompt("반려 사유를 입력하세요:");
    if (!reason) return;
    try {
      const docData = selectedDoc.value;
      let docRef;
      if (docData.type === '체험학습') docRef = doc(db, 'experiential_learning', docData.id);
      else if (docData.type === '결과보고서') docRef = doc(db, 'trip_reports', docData.id);
      else docRef = doc(db, docData.fullPath, docData.id);
  
      await updateDoc(docRef, { status: 'rejected', rejectReason: reason, processedAt: serverTimestamp() });
      alert("반려되었습니다.");
      showModal.value = false;
      await fetchDocuments();
    } catch (e) { alert("오류: " + e.message); }
  };
  
  const formatPeriod = (docItem) => {
    if(docItem.period?.startDate) return `${docItem.period.startDate} ~ ${docItem.period.endDate}`;
    if(docItem.startDate) return `${docItem.startDate} ~ ${docItem.endDate}`;
    if(docItem.period && typeof docItem.period === 'string') return docItem.period;
    return '-';
  };
  </script>
  
  <template>
    <div class="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
      <div class="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList class="w-5 h-5 text-indigo-600"/> 학급 문서함
        </h2>
        <div class="flex bg-white rounded-lg p-1 border shadow-sm">
          <button @click="filterType = 'all'" :class="filterType === 'all' ? 'bg-gray-100 font-bold' : 'text-gray-500'" class="px-3 py-1 text-xs rounded transition">전체</button>
          <button @click="filterType = 'absence'" :class="filterType === 'absence' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'" class="px-3 py-1 text-xs rounded transition">결석신고</button>
          <button @click="filterType = 'field_trip'" :class="filterType === 'field_trip' ? 'bg-green-50 text-green-600 font-bold' : 'text-gray-500'" class="px-3 py-1 text-xs rounded transition">체험학습</button>
        </div>
      </div>
  
      <div class="flex-1 overflow-y-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-white text-gray-500 font-bold border-b sticky top-0 z-10 shadow-sm">
            <tr>
              <th class="px-6 py-3 w-24">구분</th>
              <th class="px-4 py-3">학생 정보</th>
              <th class="px-4 py-3">내용 요약</th>
              <th class="px-4 py-3 w-24">상태</th>
              <th class="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading"><td colspan="5" class="p-10 text-center text-gray-400">로딩 중...</td></tr>
            <tr v-else-if="filteredDocs.length === 0"><td colspan="5" class="p-10 text-center text-gray-400">제출된 문서가 없습니다.</td></tr>
            
            <tr v-for="docItem in filteredDocs" :key="docItem.id" class="hover:bg-gray-50 transition">
              <td class="px-6 py-3">
                <span class="px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-fit"
                  :class="{
                    'bg-blue-100 text-blue-700': docItem.type === '결석신고서',
                    'bg-green-100 text-green-700': docItem.type === '체험학습',
                    'bg-purple-100 text-purple-700': docItem.type === '결과보고서'
                  }">
                  <FileText v-if="docItem.type === '결석신고서'" class="w-3 h-3"/>
                  <Plane v-else-if="docItem.type === '체험학습'" class="w-3 h-3"/>
                  <FileCheck v-else class="w-3 h-3"/>
                  {{ docItem.type }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="font-bold text-gray-800">{{ docItem.name }}</div>
                <div class="font-bold text-gray-800">{{ docItem.studentName }}</div>
                <div class="text-xs text-gray-500">{{ docItem.grade }}학년 {{ docItem.classNum }}반 {{ docItem.number }}번</div>
              </td>
              <td class="px-4 py-3">
                <div v-if="docItem.type === '결석신고서'"><span class="text-gray-600 font-bold">{{ docItem.absenceType }}</span></div>
                <div v-if="docItem.type === '결석신고서'"><span class="text-gray-600 font-bold">{{ docItem.reason }}</span></div>
                <div v-else-if="docItem.type === '체험학습'"><span class="text-gray-600 font-bold">{{ docItem.location }}</span></div>
                <div v-else><span class="text-gray-600 font-bold">{{ docItem.title }}</span></div>
                <div class="text-xs text-gray-400 mt-1">{{ formatPeriod(docItem) }}</div>
              </td>
              <td class="px-4 py-3">
                <span v-if="docItem.status === 'approved'" class="text-green-600 font-bold flex items-center gap-1"><CheckCircle class="w-3 h-3"/> 승인</span>
                <span v-else-if="docItem.status === 'rejected'" class="text-red-500 font-bold flex items-center gap-1"><XCircle class="w-3 h-3"/> 반려</span>
                <span v-else class="text-orange-500 font-bold flex items-center gap-1"><Clock class="w-3 h-3"/> 대기</span>
              </td>
              
              <td class="px-4 py-3 text-right">
                
                <div v-if="docItem.status === 'approved'" class="flex justify-end gap-1">
                  <button 
                    @click="handleDirectPrint(docItem)"
                    class="px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100 text-xs font-bold transition flex items-center gap-1"
                    title="인쇄"
                  >
                    <Printer class="w-3 h-3"/> 인쇄
                  </button>
                  <button 
                    @click="handleDirectPrint(docItem)"
                    class="px-3 py-1.5 border border-red-200 text-red-700 bg-red-50 rounded hover:bg-red-100 text-xs font-bold transition flex items-center gap-1"
                    title="PDF로 저장 (인쇄창에서 PDF 선택)"
                  >
                    <FileDown class="w-3 h-3"/> PDF
                  </button>
                </div>
  
                <div v-else>
                  <button 
                    @click="handleDocClick(docItem)"
                    class="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-bold transition shadow-sm"
                  >
                    승인처리
                  </button>
                </div>
  
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  
      <DocumentReviewModal 
        v-if="showModal && selectedDoc"
        :doc="selectedDoc"
        :teacherData="teacherData"
        :cumulativeData="cumulativeData"
        @close="showModal = false"
        @approve="onApprove"
        @reject="onReject"
        @print="handleDirectPrint" 
      />
    </div>
  </template>