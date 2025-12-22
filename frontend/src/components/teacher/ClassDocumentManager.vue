<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { collection, query, where, getDocs, doc as firestoreDoc, deleteDoc } from 'firebase/firestore';
  import { db, getAppId } from '../../firebase';
  import { useSystemStore } from '../../stores/systemStore';
  import { Loader2 } from 'lucide-vue-next';
  import { printDocument } from '../../utils/printUtils';
  
  import DocumentListTable from './DocumentListTable.vue';
  import DocumentReviewModal from './DocumentReviewModal.vue';
  
  const props = defineProps({
    teacherData: { type: Object, required: true },
    user: { type: Object, required: true } 
  });
  
  const systemStore = useSystemStore();
  const documents = ref([]);
  const loading = ref(true);
  const filterType = ref('all');
  const selectedDoc = ref(null);
  
  const fetchDocuments = async () => {
    loading.value = true;
    await systemStore.fetchConfig();
    const appId = getAppId();
    documents.value = [];
  
    // 검색할 학년/반 (문자열로 변환하여 비교)
    const targetGrade = String(props.teacherData.assignedGrade);
    const targetClass = String(props.teacherData.assignedClass);
  
    try {
      // 1. 결석신고서 조회 (기존 로직: 문자열 비교)
      const absenceQuery = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'submissions'),
        where('grade', '==', targetGrade), 
        where('class', '==', targetClass)
      );
  
      // 2. 체험학습 신청서 조회 (수정됨)
      // *주의: DB에 숫자로 저장되었을 수도 있고 문자열로 저장되었을 수도 있음.
      // 안전하게 문자열로 변환해서 조회 시도 (저장 로직이 문자열 기반인 경우)
      // 만약 데이터가 안 뜬다면 DB 저장 타입을 확인해야 함. 일단 String으로 시도.
      const tripQuery = query(
        collection(db, 'experiential_learning'),
        where('student.grade', '==', targetGrade), // 문자열 비교 시도
        where('student.classNum', '==', targetClass)
      );
      // 혹시 숫자로 저장되어 있다면 아래 주석 해제하여 사용
      /*
      const tripQuery = query(
        collection(db, 'experiential_learning'),
        where('student.grade', '==', Number(targetGrade)), 
        where('student.classNum', '==', Number(targetClass))
      );
      */
  
      // 병렬 조회
      const [absenceSnap, tripSnap] = await Promise.allSettled([
        getDocs(absenceQuery),
        getDocs(tripQuery)
      ]);
  
      const docs = [];
  
      // 1. 결석신고서 처리
      if (absenceSnap.status === 'fulfilled') {
        absenceSnap.value.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data(), docSource: 'absence' });
        });
      } else {
        console.error("결석신고서 조회 실패:", absenceSnap.reason);
      }
  
      // 2. 체험학습 신청서 처리
      if (tripSnap.status === 'fulfilled') {
        tripSnap.value.forEach((doc) => {
          const data = doc.data();
          docs.push({
            id: doc.id,
            ...data,
            docSource: 'trip',
            // 테이블 표시용 필드 매핑
            studentName: data.student?.name,
            number: data.student?.number,
            submittedAt: data.createdAt, // 작성일
            type: '체험학습',
            reason: data.plan?.location, // 사유 대신 장소 표시
            period: { // 기간 포맷 통일
              start: data.period?.startDate,
              end: data.period?.endDate,
              totalDays: data.period?.totalDays
            }
          });
        });
      } else {
        // 🔥 여기서 색인 에러가 주로 발생합니다. 콘솔 확인 필수!
        console.error("체험학습 조회 실패 (색인 확인 필요):", tripSnap.reason);
        if (tripSnap.reason.code === 'failed-precondition') {
          alert("체험학습 목록을 불러오려면 Firestore 색인이 필요합니다.\n개발자 도구(F12) 콘솔의 링크를 클릭해주세요.");
        }
      }
  
      // 날짜순 정렬 (최신순)
      docs.sort((a, b) => {
        const t1 = a.submittedAt?.seconds || 0;
        const t2 = b.submittedAt?.seconds || 0;
        return t2 - t1;
      });
  
      documents.value = docs;
  
    } catch (err) { 
      console.error("전체 데이터 로드 중 치명적 오류:", err); 
      alert("데이터를 불러오는 중 오류가 발생했습니다."); 
    } finally { 
      loading.value = false; 
    }
  };
  
  const handleDelete = async (docId) => {
    const targetDoc = documents.value.find(d => d.id === docId);
    if (!targetDoc) return;
  
    if (!confirm("정말 삭제하시겠습니까?")) return;
  
    try {
      if (targetDoc.docSource === 'trip') {
        await deleteDoc(firestoreDoc(db, 'experiential_learning', docId));
      } else {
        await deleteDoc(firestoreDoc(db, 'artifacts', getAppId(), 'public', 'data', 'submissions', docId));
      }
      
      alert("삭제되었습니다."); 
      selectedDoc.value = null; 
      await fetchDocuments();
    } catch (e) { 
      console.error(e);
      alert("삭제 실패"); 
    }
  };
  
  const handlePrint = (doc) => {
    printDocument(doc, props.teacherData, systemStore.config.approvalLine);
  };
  
  const filteredDocs = computed(() => {
    if (filterType.value === 'all') return documents.value;
    if (filterType.value === '체험학습신청') return documents.value.filter(doc => doc.type === '체험학습');
    if (filterType.value === '결석신고서') return documents.value.filter(doc => doc.type !== '체험학습');
    return documents.value;
  });
  
  onMounted(fetchDocuments);
  </script>
  
  <template>
    <div class="manager-container">
      <div class="header">
        <h2 class="title">{{ teacherData.assignedGrade }}학년 {{ teacherData.assignedClass }}반 문서함</h2>
        <div class="filters">
          <select v-model="filterType" class="select-box">
            <option value="all">전체 보기</option>
            <option value="결석신고서">결석신고서</option>
            <option value="체험학습신청">체험학습신청서</option>
          </select>
          <button @click="fetchDocuments" class="refresh-btn">새로고침</button>
        </div>
      </div>
  
      <div v-if="loading" class="py-10 text-center"><Loader2 class="animate-spin mx-auto"/></div>
      <div v-else-if="documents.length === 0" class="py-10 text-center text-gray-400">
        제출된 문서가 없습니다.
      </div>
      <DocumentListTable v-else :documents="filteredDocs" :loading="loading" @select="doc => selectedDoc = doc" @delete="handleDelete" />
      
      <DocumentReviewModal 
        v-if="selectedDoc" 
        :doc="selectedDoc" 
        :teacherData="teacherData"
        :user="user"
        @close="selectedDoc = null" 
        @delete="handleDelete" 
        @update="fetchDocuments" 
        @open-print="handlePrint" 
      />
    </div>
  </template>
  
  <style scoped>
  .manager-container { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .title { font-size: 1.25rem; font-weight: 800; color: #1f2937; }
  .filters { display: flex; gap: 0.5rem; }
  .select-box { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.5rem; }
  .refresh-btn { padding: 0.5rem 1rem; background: #f3f4f6; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
  .refresh-btn:hover { background: #e5e7eb; }
  </style>