<script setup>
    import { ref, onMounted } from 'vue';
    import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { Printer, CheckCircle, Search, Calendar } from 'lucide-vue-next'; // XCircle, FileText 등 미사용 아이콘 정리
    
    const applications = ref([]);
    const loading = ref(false);
    const selectedApp = ref(null);
    const showApproveModal = ref(false);
    
    // 승인 시 입력할 데이터
    const approvalData = ref({
      cumulativeDomestic: 0, // 누적 국내
      cumulativeOverseas: 0, // 누적 국외
      allowedDomestic: 20,   // 학교 규정 (예시)
      allowedOverseas: 20
    });
    
    // 데이터 로드
    const fetchApplications = async () => {
      loading.value = true;
      try {
        const q = query(collection(db, 'trip_applications'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        applications.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error(e);
      } finally {
        loading.value = false;
      }
    };
    
    onMounted(fetchApplications);
    
    // 날짜 포맷 (통보서용)
    const formatDateRange = (app) => {
      const start = new Date(app.startDate);
      const end = new Date(app.endDate);
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
      const fDate = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    
      if (app.type === 'half_am') return `${fDate(start)} (오전 08:30 ~ 12:30)`;
      if (app.type === 'half_pm') return `${fDate(start)} (오후 12:30 ~ 16:30)`;
      return `${fDate(start)} ~ ${fDate(end)} (${diffDays})일간`;
    };
    
    // 승인 처리 및 통보서 출력
    const handleApprove = async () => {
      if (!confirm("승인 처리하고 통보서를 출력하시겠습니까?")) return;
    
      try {
        // 1. DB 업데이트 (승인 상태, 누적일수, 승인일)
        await updateDoc(doc(db, 'trip_applications', selectedApp.value.id), {
          status: 'approved',
          approvalDate: serverTimestamp(),
          cumulativeDomestic: approvalData.value.cumulativeDomestic,
          cumulativeOverseas: approvalData.value.cumulativeOverseas
        });
    
        // 2. 통보서 인쇄창 열기
        printNotification(selectedApp.value);
        
        // 3. UI 갱신
        showApproveModal.value = false;
        selectedApp.value = null;
        await fetchApplications();
    
      } catch (e) {
        alert("처리 실패: " + e.message);
      }
    };
    
    // 통보서 인쇄 함수 (HTML 생성)
    const printNotification = (app) => {
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      const today = new Date();
      const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    
      // [중요 수정] script 태그 닫는 부분에 역슬래시(\)를 추가하여 <\/script>로 작성해야 함
      const htmlContent = `
        <html>
          <head>
            <title>교외체험학습 통보서</title>
            <style>
              body { font-family: "Malgun Gothic", serif; padding: 40px; line-height: 1.6; }
              .header { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 40px; text-decoration: underline; }
              .content { font-size: 16px; margin-bottom: 30px; }
              .row { margin-bottom: 15px; display: flex; }
              .label { width: 120px; font-weight: bold; }
              .value { flex: 1; border-bottom: 1px solid #000; padding-left: 10px; }
              .message { text-align: center; margin: 50px 0; font-size: 18px; font-weight: bold; }
              .date { text-align: center; margin-bottom: 30px; }
              .signature { text-align: right; margin-bottom: 50px; font-size: 16px; }
              .footer { border-top: 2px solid #000; padding-top: 20px; font-size: 14px; }
              .footer p { margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="header">학교장허가 교외체험학습 통보서</div>
            
            <div class="content">
              <div class="row">
                <span class="label">성 명</span>
                <span class="value">${app.name}</span>
              </div>
              <div class="row">
                <span class="label">학년 반 번</span>
                <span class="value">${app.grade}학년 ${app.classNum || app.class}반 ${app.number}번</span>
              </div>
              <div class="row">
                <span class="label">본교허용일수</span>
                <span class="value">국내(${approvalData.value.allowedDomestic})일, 국외(${approvalData.value.allowedOverseas})일</span>
              </div>
              <div class="row">
                <span class="label">허가 기간</span>
                <span class="value">${formatDateRange(app)}</span>
              </div>
              <div class="row">
                <span class="label">누적 사용 기간</span>
                <span class="value">금회포함 누적: 국내(${approvalData.value.cumulativeDomestic})일, 국외(${approvalData.value.cumulativeOverseas})일</span>
              </div>
            </div>
    
            <div class="message">위와 같이 허가 처리되었음을 알려 드립니다.</div>
    
            <div class="date">${dateString}</div>
    
            <div class="signature">
              상당고등학교 (${app.grade})학년 (${app.classNum || app.class})반 &nbsp;&nbsp; 담임교사 : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(서명)
            </div>
    
            <div class="signature" style="text-align: center; font-weight: bold; font-size: 20px;">
              보호자님 귀하
            </div>
    
            <div class="footer">
              <p>** 결과 보고서에 사진(체험학습 장소를 배경으로 보호자와 학생이 함께 있는 사진을 포함하여 2장 이상), 티켓 등을 첨부합니다.</p>
              <p>** 연속 5일 이상 교외체험학습 시 주 1회 이상 보호자(혹은 인솔자)가 담임교사와 통화하여 학생의 안전, 건강을 확인합니다.</p>
              <p>** 교외체험학습(가정학습 포함) 기간 안전사고 등 돌발상황 발생에 대비하여 학교와 연락체계를 유지하고 사안 발생 시 신속 대응(조치)합니다.</p>
            </div>
            <script>
              window.onload = function() { window.print(); }
            <\/script> 
          </body>
        </html>
      `;
      // 위 <\/script> 부분이 핵심 수정 사항입니다.
    
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    };
    </script>
    
    <template>
      <div class="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
        <div class="px-6 py-4 border-b flex justify-between items-center">
          <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Printer class="w-5 h-5 text-indigo-600"/> 체험학습 신청 관리 및 통보서 발급
          </h2>
          <button @click="fetchApplications" class="p-2 hover:bg-gray-100 rounded-full"><Search class="w-4 h-4"/></button>
        </div>
    
        <div class="flex-1 overflow-y-auto p-6">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-500 font-bold border-b">
              <tr>
                <th class="px-4 py-3">신청일</th>
                <th class="px-4 py-3">학생</th>
                <th class="px-4 py-3">기간</th>
                <th class="px-4 py-3">장소</th>
                <th class="px-4 py-3">상태</th>
                <th class="px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="app in applications" :key="app.id" class="hover:bg-gray-50">
                <td class="px-4 py-3">{{ new Date(app.createdAt?.toDate()).toLocaleDateString() }}</td>
                <td class="px-4 py-3 font-bold">{{ app.grade }}-{{ app.classNum }}-{{ app.number }} {{ app.name }}</td>
                <td class="px-4 py-3">{{ app.startDate }} ~ {{ app.endDate }}</td>
                <td class="px-4 py-3">{{ app.location }}</td>
                <td class="px-4 py-3">
                  <span v-if="app.status === 'approved'" class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">승인됨</span>
                  <span v-else class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">대기중</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button 
                    @click="selectedApp = app; showApproveModal = true;"
                    class="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-bold transition"
                  >
                    {{ app.status === 'approved' ? '재출력' : '승인/출력' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
    
        <div v-if="showApproveModal && selectedApp" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle class="w-5 h-5 text-green-600"/> 체험학습 승인 처리
            </h3>
            
            <div class="space-y-4 mb-6">
              <div class="bg-gray-50 p-3 rounded text-sm">
                <p><span class="font-bold">학생:</span> {{ selectedApp.name }}</p>
                <p><span class="font-bold">기간:</span> {{ formatDateRange(selectedApp) }}</p>
                <p><span class="font-bold">장소:</span> {{ selectedApp.location }}</p>
              </div>
    
              <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">금회 포함 누적 국내 사용일</label>
                <input v-model="approvalData.cumulativeDomestic" type="number" class="w-full border rounded px-3 py-2 text-sm">
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 mb-1">금회 포함 누적 국외 사용일</label>
                <input v-model="approvalData.cumulativeOverseas" type="number" class="w-full border rounded px-3 py-2 text-sm">
              </div>
            </div>
    
            <div class="flex justify-end gap-2">
              <button @click="showApproveModal = false" class="px-4 py-2 bg-gray-200 rounded text-sm font-bold">취소</button>
              <button @click="handleApprove" class="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold flex items-center gap-2">
                <Printer class="w-4 h-4"/> 승인 및 통보서 인쇄
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>