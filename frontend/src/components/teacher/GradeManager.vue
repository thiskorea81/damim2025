<script setup>
    import { ref } from 'vue';
    import { collection, getDocs, addDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
    import { db } from '../../firebase';
    import { Upload, Trash2, Save, FileSpreadsheet, CheckSquare } from 'lucide-vue-next';
    import Papa from 'papaparse'; 
    
    const semester = ref('1학년 2학기'); // 기본값 설정 (필요에 따라 변경)
    const activeTab = ref('upload');
    const fileInput = ref(null);
    const parsedData = ref([]);
    const loading = ref(false);
    const gradesList = ref([]);
    const selectedIds = ref([]);
    
    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
    
      Papa.parse(file, {
        header: false,
        skipEmptyLines: false, // 줄바꿈 유지를 위해 false
        complete: (results) => processComplexData(results.data),
        error: (err) => alert("파일 읽기 실패: " + err.message)
      });
    };
    
    const processComplexData = (rawData) => {
      try {
        const students = [];
        let subjects = [];
        let gradePrefix = '000';
    
        // 1. 헤더 및 학년 정보 찾기
        for (let i = 0; i < Math.min(rawData.length, 15); i++) {
          const rowStr = rawData[i].join(' ');
          
          // 학년/반 추출 로직 수정
          // "2025학년도" 처럼 뒤에 '도'가 붙는 경우는 제외하고, 순수 '학년'만 찾음
          if (rowStr.includes('학년') && rowStr.includes('반')) {
            // [수정] 정규식: 숫자+학년 뒤에 '도'가 오지 않는 경우만 매칭
            const gradeMatch = rowStr.match(/(\d+)학년(?!도)/); 
            const classMatch = rowStr.match(/(\d+)반/);
            
            if (gradeMatch && classMatch) {
              // 예: 1학년 9반 -> "109"
              gradePrefix = `${gradeMatch[1]}${String(classMatch[1]).padStart(2, '0')}`;
              console.log(`학년/반 감지됨: ${gradeMatch[1]}학년 ${classMatch[1]}반 -> Prefix: ${gradePrefix}`);
            }
          }
    
          // 과목 헤더 추출 ("번호", "성명" 포함 행)
          if (rawData[i].includes('번호') && rawData[i].includes('성명')) {
            const headerRow = rawData[i];
            for (let j = 0; j < headerRow.length; j++) {
              const cell = headerRow[j] ? headerRow[j].trim() : '';
              // 3번째 열부터 과목으로 간주 (번호(0), 성명(1), 교과목(2) 제외)
              if (j > 2 && cell && cell.length > 0) {
                subjects.push({ index: j, name: cell });
              }
            }
          }
        }
    
        // 2. 학생 데이터 파싱 (5행 1세트)
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          // 번호가 숫자인지 확인 (학생 행 시작)
          if (row[0] && !isNaN(row[0]) && row[1]) {
            const studentNo = String(row[0]).trim().padStart(2, '0'); // 1 -> "01"
            const studentName = String(row[1]).trim();
            const studentId = `${gradePrefix}${studentNo}`; // 109 + 01 -> "10901"
    
            const studentData = {
              studentId: studentId,
              name: studentName,
              scores: {}
            };
    
            // 데이터 5줄 읽기
            const rows = [
              rawData[i],     // 점수
              rawData[i+1],   // 성취도
              rawData[i+2],   // 석차등급
              rawData[i+3],   // 석차
              rawData[i+4]    // 수강자수
            ];
    
            subjects.forEach(subj => {
              // 각 항목별 데이터 추출 (undefined 방지)
              const getVal = (rIdx) => (rows[rIdx] && rows[rIdx][subj.index]) ? String(rows[rIdx][subj.index]).trim() : '-';
              
              studentData.scores[subj.name] = {
                raw: getVal(0),
                achievement: getVal(1),
                rank: getVal(2),
                rankStr: getVal(3),
                totalCount: getVal(4)
              };
            });
    
            students.push(studentData);
          }
        }
    
        if (students.length === 0) {
          alert("데이터를 찾을 수 없습니다. 파일 형식을 확인해주세요.");
          return;
        }
    
        parsedData.value = students;
        console.log(`파싱 완료: ${students.length}명`);
    
      } catch (e) {
        console.error(e);
        alert("파싱 중 오류가 발생했습니다.");
      }
    };
    
    const saveGrades = async () => {
      if (!confirm(`${semester.value} 성적 ${parsedData.value.length}건을 저장하시겠습니까?`)) return;
      
      loading.value = true;
      try {
        const batchPromises = parsedData.value.map(student => {
          return addDoc(collection(db, 'grades'), {
            studentId: student.studentId,
            name: student.name,
            scores: student.scores,
            semester: semester.value,
            uploadedAt: serverTimestamp()
          });
        });
    
        await Promise.all(batchPromises);
        alert("저장 완료되었습니다.");
        parsedData.value = [];
        if(fileInput.value) fileInput.value.value = '';
        
        activeTab.value = 'manage';
        fetchGrades();
      } catch (e) {
        console.error(e);
        alert('저장 실패: ' + e.message);
      } finally {
        loading.value = false;
      }
    };
    
    const fetchGrades = async () => {
      loading.value = true;
      gradesList.value = [];
      selectedIds.value = [];
      
      try {
        // orderBy 제거 (인덱스 오류 방지)
        const q = query(collection(db, 'grades'), where('semester', '==', semester.value));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
        // JS 정렬 (학번순)
        list.sort((a, b) => (a.studentId || '').localeCompare(b.studentId || ''));
        gradesList.value = list;
      } catch (e) { console.error(e); } 
      finally { loading.value = false; }
    };
    
    const toggleAll = (e) => {
      if (e.target.checked) selectedIds.value = gradesList.value.map(g => g.id);
      else selectedIds.value = [];
    };
    
    const deleteSelected = async () => {
      if (selectedIds.value.length === 0) return;
      if (!confirm(`${selectedIds.value.length}건을 삭제하시겠습니까?`)) return;
      loading.value = true;
      try {
        await Promise.all(selectedIds.value.map(id => deleteDoc(doc(db, 'grades', id))));
        gradesList.value = gradesList.value.filter(g => !selectedIds.value.includes(g.id));
        selectedIds.value = [];
        alert('삭제 완료');
      } catch (e) { alert('오류 발생'); }
      finally { loading.value = false; }
    };
    
    const deleteGrade = async (id) => {
      if(!confirm('삭제하시겠습니까?')) return;
      try {
        await deleteDoc(doc(db, 'grades', id));
        gradesList.value = gradesList.value.filter(g => g.id !== id);
      } catch (e) { alert('삭제 실패'); }
    };
    </script>
    
    <template>
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold flex items-center gap-2">🏆 성적 관리 (종합일람표)</h2>
          <select v-model="semester" class="p-2 border rounded-lg bg-gray-50 font-bold outline-none" @change="activeTab === 'manage' && fetchGrades()">
            <option>1학년 1학기</option>
            <option>1학년 2학기</option>
            <option>2학년 1학기</option>
            <option>2학년 2학기</option>
            <option>3학년 1학기</option>
            <option>3학년 2학기</option>
          </select>
        </div>
    
        <div class="flex gap-2 mb-6 border-b border-gray-100">
          <button @click="activeTab='upload'" :class="['px-4 py-2 border-b-2', activeTab==='upload'?'border-blue-500 font-bold text-blue-600':'text-gray-500']">일괄 업로드</button>
          <button @click="activeTab='manage'; fetchGrades()" :class="['px-4 py-2 border-b-2', activeTab==='manage'?'border-blue-500 font-bold text-blue-600':'text-gray-500']">조회 및 삭제</button>
        </div>
    
        <div v-if="activeTab === 'upload'">
          <div class="mb-6 p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center relative">
            <FileSpreadsheet class="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p class="text-gray-600 font-bold mb-1">학기말 성적 종합일람표(CSV) 업로드</p>
            <p class="text-xs text-gray-400 mb-4">번호, 성명, 과목별 5행 데이터가 포함된 파일을 선택하세요.</p>
            <label class="cursor-pointer">
              <span class="bg-white border border-gray-300 px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-gray-50">파일 선택</span>
              <input type="file" ref="fileInput" @change="handleFileUpload" accept=".csv" class="hidden" />
            </label>
          </div>
          
          <div v-if="parsedData.length > 0" class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-xl flex justify-between items-center">
              <span class="font-bold text-blue-800">{{ parsedData.length }}명의 학생 데이터 감지</span>
              <button @click="saveGrades" class="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-700" :disabled="loading">
                <Save v-if="!loading" class="w-4 h-4 inline mr-1"/> {{ loading ? '저장 중...' : 'DB 저장' }}
              </button>
            </div>
            
            <div class="border rounded-lg p-4 bg-gray-50 text-sm">
              <p class="font-bold mb-2">미리보기 ({{ parsedData[0].name }}) - 학번: {{ parsedData[0].studentId }}</p>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
                <div v-for="(val, key) in parsedData[0].scores" :key="key" class="border p-2 rounded bg-white">
                  <span class="font-bold block mb-1">{{ key }}</span>
                  원점수: {{ val.raw }} / 등급: {{ val.rank }}
                </div>
              </div>
            </div>
          </div>
        </div>
    
        <div v-if="activeTab === 'manage'">
          <div v-if="gradesList.length > 0" class="mb-4 bg-red-50 p-3 rounded-lg flex justify-between items-center border border-red-100" v-show="selectedIds.length > 0">
            <span class="text-red-700 font-bold text-sm ml-2">{{ selectedIds.length }}건 선택됨</span>
            <button @click="deleteSelected" class="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-red-700 flex items-center">
              <Trash2 class="w-4 h-4 mr-1" /> 선택 삭제
            </button>
          </div>
    
          <div class="overflow-x-auto border rounded-lg max-h-[500px]">
            <table class="w-full text-sm text-left relative">
              <thead class="bg-gray-100 text-gray-700 uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th class="p-3 w-10 text-center"><input type="checkbox" @change="toggleAll" :checked="gradesList.length > 0 && selectedIds.length === gradesList.length" class="w-4 h-4"/></th>
                  <th class="p-3 w-20">학번</th>
                  <th class="p-3 w-24">이름</th>
                  <th class="p-3">과목 수</th>
                  <th class="p-3 text-center w-20">삭제</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 bg-white">
                <tr v-for="grade in gradesList" :key="grade.id" class="hover:bg-blue-50/30">
                  <td class="p-3 text-center"><input type="checkbox" v-model="selectedIds" :value="grade.id" class="w-4 h-4"/></td>
                  <td class="p-3 font-bold text-gray-800">{{ grade.studentId }}</td>
                  <td class="p-3">{{ grade.name }}</td>
                  <td class="p-3 text-gray-500">
                    {{ grade.scores ? Object.keys(grade.scores).length : 0 }}과목
                  </td>
                  <td class="p-3 text-center">
                    <button @click="deleteGrade(grade.id)" class="text-red-400 hover:text-red-600"><Trash2 class="w-4 h-4"/></button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="gradesList.length === 0 && !loading" class="p-10 text-center text-gray-400">데이터가 없습니다.</div>
          </div>
        </div>
      </div>
    </template>