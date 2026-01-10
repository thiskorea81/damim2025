<script setup>
  import { ref } from 'vue';
  import { FileText, Plane, FileCheck, Printer } from 'lucide-vue-next'; // Printer 아이콘 추가
  
  import AbsenceHistoryList from './history/AbsenceHistoryList.vue'; 
  import TripHistoryList from './history/TripHistoryList.vue';
  import ReportHistoryList from './history/ReportHistoryList.vue';
  
  const props = defineProps({
    user: Object
  });
  const emit = defineEmits(['edit']);
  
  const currentTab = ref('absence');
  
  // [신규] 학생용 통보서 출력 함수
  const printNotification = (item) => {
    // item에 저장된 누적 일수 등이 있어야 함 (저장 로직에서 누적일수도 DB에 업데이트 했다고 가정)
    // 없으면 0으로 표시되거나, 간단 정보만 출력
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    
    // 데이터 매핑
    const sName = item.student?.name || props.user.displayName || '학생';
    const grade = item.student?.grade || '';
    const classNum = item.student?.classNum || '';
    const num = item.student?.number || '';
    const start = item.period?.startDate || '';
    const end = item.period?.endDate || '';
    const totalDays = item.period?.totalDays || '';
    const loc = item.plan?.location || '';
    const cDom = item.cumulativeDomestic || 0;
    const cOver = item.cumulativeOverseas || 0;
  
    const htmlContent = `
      <html>
        <head>
          <title>통보서 확인</title>
          <style>
            body { font-family: "Malgun Gothic", serif; padding: 40px; line-height: 1.6; }
            .title { text-align: center; font-size: 24px; font-weight: bold; text-decoration: underline; margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; font-size: 14px; }
            th { background-color: #f0f0f0; text-align: center; width: 120px; }
          </style>
        </head>
        <body>
          <div class="title">학교장허가 교외체험학습 통보서</div>
          <table>
            <tr><th>성 명</th><td>${sName}</td><th>학년/반/번</th><td>${grade}학년 ${classNum}반 ${num}번</td></tr>
            <tr><th>허가기간</th><td colspan="3">${start} ~ ${end} (총 ${totalDays}일)</td></tr>
            <tr><th>장 소</th><td colspan="3">${loc}</td></tr>
            <tr><th>누적일수</th><td colspan="3">국내 ${cDom}일 / 국외 ${cOver}일</td></tr>
          </table>
          <div style="text-align: center; margin: 50px 0; font-weight: bold; font-size: 18px;">위와 같이 허가 처리되었음을 알려 드립니다.</div>
          <div style="text-align: center;">${dateString}</div>
          <div style="text-align: right; margin-top: 50px;">담임교사 (인)</div>
          <script>window.onload = function(){ window.print(); }<\/script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };
  
  const handleEdit = (item) => {
    emit('edit', item);
  };
  </script>
  
  <template>
    <div class="flex gap-0 bg-transparent">
      
      <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 z-10 min-h-[500px]">
        
        <AbsenceHistoryList 
          v-if="currentTab === 'absence'" 
          :user="user" 
          @edit="handleEdit" 
          class="h-full"
        />
  
        <TripHistoryList 
          v-if="currentTab === 'trip'" 
          :user="user" 
          @edit="handleEdit"
          @print-notification="printNotification" 
          class="h-full"
        />
  
        <ReportHistoryList
          v-if="currentTab === 'report'"
          :user="user"
          @edit="handleEdit"
          class="h-full"
        />
        
      </div>
  
      <div class="flex flex-col gap-2 pt-8 -ml-1 z-0">
        <button @click="currentTab = 'absence'" class="tab-btn" :class="currentTab === 'absence' ? 'active text-blue-600' : 'inactive'">
          <FileText class="w-5 h-5 rotate-0" /><span class="rotate-0">결석</span>
        </button>
        <button @click="currentTab = 'trip'" class="tab-btn" :class="currentTab === 'trip' ? 'active text-green-600' : 'inactive'">
          <Plane class="w-5 h-5 rotate-0" /><span class="rotate-0">체험</span>
        </button>
        <button @click="currentTab = 'report'" class="tab-btn" :class="currentTab === 'report' ? 'active text-purple-600' : 'inactive'">
          <FileCheck class="w-5 h-5 rotate-0" /><span class="rotate-0">결과</span>
        </button>
      </div>
    </div>
  </template>
  
  <style scoped>
  .tab-btn { width: 3rem; padding: 1.5rem 0; border-radius: 0 0.75rem 0.75rem 0; border-top: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transition: all 0.2s; font-size: 0.75rem; font-weight: 700; writing-mode: vertical-rl; text-orientation: upright; letter-spacing: 0.1em; }
  .active { background: white; border-left: 4px solid white; transform: translateX(4px); box-shadow: none; z-index: 20; }
  .inactive { background: #f3f4f6; color: #9ca3af; }
  .inactive:hover { background: #f9fafb; }
  </style>