<script setup>
    import { ref, watch } from 'vue';
    import { Camera, AlertTriangle, Save, Loader2, Ticket } from 'lucide-vue-next';
    
    // [재사용] 서명 모듈 (경로 확인 필수)
    import SignatureSection from './parts/SignatureSection.vue';
    
    const props = defineProps({
      userData: Object,
      selectedApp: Object, // 연결된 신청서 정보
      formattedPeriod: String,
      submitting: Boolean,
      initialData: Object // 수정 시 기존 데이터
    });
    
    const emit = defineEmits(['submit', 'cancel']);
    const signatureRef = ref(null);
    const isCompressing = ref(false);
    
    const form = ref({
      title: '',
      content: '',
      photo1: null, photo1Preview: null,
      photo2: null, photo2Preview: null,
      ticket: null, ticketPreview: null,
      parentName: ''
    });
    
    // 초기화 로직
    const initializeForm = () => {
      // 1. 수정 모드
      if (props.initialData) {
        const d = props.initialData;
        form.value.title = d.title;
        form.value.content = d.content;
        form.value.parentName = d.chaperone || d.parentName || props.userData?.guardian || '';
        
        if (d.photo1) form.value.photo1Preview = d.photo1;
        if (d.photo2) form.value.photo2Preview = d.photo2;
        if (d.ticket) form.value.ticketPreview = d.ticket;
      } 
      // 2. 신규 작성 모드
      else if (props.selectedApp) {
        const app = props.selectedApp;
        const locationName = app.plan?.location || app.location || '';
        form.value.title = `${locationName} 체험학습 결과보고서`;
        form.value.parentName = app.protector || app.guardian?.parentName || '';
      }
    };
    
    watch(() => [props.selectedApp, props.initialData], initializeForm, { immediate: true });
    
    // --- 이미지 압축 로직 ---
    const compressImage = async (file) => {
      const MAX_SIZE_MB = 1;
      if (file.size <= MAX_SIZE_MB * 1024 * 1024) return file;
    
      return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1280;
          
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
    
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else resolve(file);
          }, 'image/jpeg', 0.7);
        };
        img.onerror = () => resolve(file);
      });
    };
    
    // --- 파일 핸들러 ---
    const handleFileChange = async (e, type) => {
      const file = e.target.files[0];
      if (!file) return;
      
      isCompressing.value = true;
      try {
        const compressedFile = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressedFile);
    
        if (type === 'photo1') {
          form.value.photo1 = compressedFile;
          form.value.photo1Preview = previewUrl;
        } else if (type === 'photo2') {
          form.value.photo2 = compressedFile;
          form.value.photo2Preview = previewUrl;
        } else if (type === 'ticket') {
          form.value.ticket = compressedFile;
          form.value.ticketPreview = previewUrl;
        }
      } catch (err) {
        console.error(err);
        alert("이미지 처리 중 오류가 발생했습니다.");
      } finally {
        isCompressing.value = false;
      }
    };
    
    // --- 제출 ---
    const handleSubmit = () => {
      if (!form.value.content.trim()) return alert("내용을 입력해주세요.");
      
      // 수정 시에는 File객체가 없어도 Preview(URL)가 있으면 통과
      if (!form.value.photo1 && !form.value.photo1Preview) return alert("필수 사진 1이 누락되었습니다.");
      if (!form.value.photo2 && !form.value.photo2Preview) return alert("필수 사진 2가 누락되었습니다.");
    
      let sSign = null;
      let pSign = null;
    
      if (signatureRef.value) {
        const sigData = signatureRef.value.getSignatures();
        if (!sigData.isStudentEmpty) sSign = sigData.student;
        if (!sigData.isParentEmpty) pSign = sigData.parent;
      }
    
      // 기존 서명 유지 (수정 모드)
      if (!sSign && props.initialData?.studentSign) sSign = props.initialData.studentSign;
      if (!pSign && props.initialData?.parentSign) pSign = props.initialData.parentSign;
    
      if (!sSign) return alert("학생 서명이 필요합니다.");
      if (!pSign) return alert("보호자 서명이 필요합니다.");
    
      const submitData = {
        ...form.value,
        studentSignData: sSign,
        parentSignData: pSign,
        // 변경 여부 플래그
        isPhoto1New: !!form.value.photo1,
        isPhoto2New: !!form.value.photo2,
        isTicketNew: !!form.value.ticket
      };
    
      emit('submit', submitData);
    };
    </script>
    
    <template>
      <div class="space-y-6 max-w-4xl mx-auto">
        
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div class="px-5 py-3 bg-gray-50 border-b font-bold text-gray-700">신청 정보</div>
          <div class="p-5 text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span class="block text-xs font-bold text-gray-400">학생</span>
              <p class="font-bold text-gray-800">{{ userData.name }}</p>
            </div>
            <div>
               <span class="block text-xs font-bold text-gray-400">기간</span>
               <p class="font-bold text-gray-800">{{ formattedPeriod }}</p>
            </div>
            <div class="md:col-span-2">
               <span class="block text-xs font-bold text-gray-400">목적지</span>
               <p class="font-bold text-gray-800">{{ selectedApp?.plan?.location || selectedApp?.location || '-' }}</p>
            </div>
          </div>
        </div>
    
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">보고서 제목</label>
            <input v-model="form.title" type="text" class="input-base font-bold">
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">체험 학습 내용 및 결과</label>
            <textarea v-model="form.content" rows="6" class="input-base resize-none leading-relaxed" placeholder="내용을 구체적으로 작성하세요."></textarea>
          </div>
        </div>
    
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Camera class="w-5 h-5 text-green-600"/> 증빙 자료
          </h3>
          
          <div v-if="isCompressing" class="mb-4 p-2 bg-blue-50 text-blue-600 text-xs rounded flex items-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin" /> 사진 압축 중...
          </div>
    
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="upload-box group">
               <input type="file" accept="image/*" @change="(e) => handleFileChange(e, 'photo1')" class="file-input">
               <img v-if="form.photo1Preview" :src="form.photo1Preview" class="preview-img">
               <div v-else class="placeholder group-hover:text-green-600"><Camera class="w-8 h-8 mx-auto mb-1"/><span class="text-xs">사진 1 (필수)</span></div>
            </div>
            <div class="upload-box group">
               <input type="file" accept="image/*" @change="(e) => handleFileChange(e, 'photo2')" class="file-input">
               <img v-if="form.photo2Preview" :src="form.photo2Preview" class="preview-img">
               <div v-else class="placeholder group-hover:text-green-600"><Camera class="w-8 h-8 mx-auto mb-1"/><span class="text-xs">사진 2 (필수)</span></div>
            </div>
            <div class="upload-box group border-dashed">
               <input type="file" accept="image/*" @change="(e) => handleFileChange(e, 'ticket')" class="file-input">
               <img v-if="form.ticketPreview" :src="form.ticketPreview" class="preview-img">
               <div v-else class="placeholder text-gray-400 group-hover:text-blue-600"><Ticket class="w-8 h-8 mx-auto mb-1"/><span class="text-xs">티켓 (선택)</span></div>
            </div>
          </div>
        </div>
    
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p v-if="initialData" class="text-xs text-orange-500 font-bold mb-2">* 수정 시 서명을 다시 하지 않으면 기존 서명이 유지됩니다.</p>
          <SignatureSection 
            ref="signatureRef" 
            :studentName="userData.name" 
            :parentName="form.parentName" 
            @update:parentName="(val) => form.parentName = val" 
          />
        </div>
    
        <div class="flex justify-end gap-3 pt-4 pb-8">
          <button @click="$emit('cancel')" class="btn-cancel">취소</button>
          <button 
            @click="handleSubmit" 
            :disabled="submitting || isCompressing"
            class="btn-submit"
          >
            <Loader2 v-if="submitting || isCompressing" class="w-5 h-5 animate-spin"/>
            <Save v-else class="w-5 h-5"/>
            {{ initialData ? '수정 완료' : '제출하기' }}
          </button>
        </div>
      </div>
    </template>
    
    <style scoped>
    .input-base { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem 1rem; outline: none; transition: box-shadow 0.2s; }
    .input-base:focus { box-shadow: 0 0 0 2px #22c55e; border-color: transparent; }
    
    .upload-box { position: relative; width: 100%; aspect-ratio: 16/9; background: #f3f4f6; border-radius: 0.5rem; overflow: hidden; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: border-color 0.2s; }
    .upload-box:hover { border-color: #22c55e; }
    .file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 10; }
    .preview-img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder { text-align: center; color: #9ca3af; }
    
    .btn-cancel { padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; background: #e5e7eb; color: #4b5563; transition: background 0.2s; }
    .btn-cancel:hover { background: #d1d5db; }
    .btn-submit { padding: 0.75rem 2rem; border-radius: 0.75rem; font-weight: 700; background: #16a34a; color: white; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; }
    .btn-submit:hover { background: #15803d; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    </style>