<script setup>
    import { reactive } from 'vue';
    import { Plus, X } from 'lucide-vue-next';
    
    const props = defineProps({
      form: { type: Object, required: true } // duties, subjects, clubs 포함
    });
    
    const inputState = reactive({ duty: '', subject: '', club: '' });
    
    const addTag = (type) => {
      const val = inputState[type].trim();
      if (!val) return;
      
      if (type === 'duty' && !props.form.duties.includes(val)) props.form.duties.push(val);
      if (type === 'subject' && !props.form.subjects.includes(val)) props.form.subjects.push(val);
      if (type === 'club' && !props.form.clubs.includes(val)) props.form.clubs.push(val);
      
      inputState[type] = '';
    };
    
    const removeTag = (type, index) => {
      if (type === 'duty') props.form.duties.splice(index, 1);
      if (type === 'subject') props.form.subjects.splice(index, 1);
      if (type === 'club') props.form.clubs.splice(index, 1);
    };
    </script>
    
    <template>
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-2">담당 정보</label>
        <div class="space-y-4">
          
          <div>
            <div class="flex gap-2 mb-2">
              <input v-model="inputState.duty" @keyup.enter="addTag('duty')" placeholder="업무 (예: 생활지도)" class="tag-input"/>
              <button @click="addTag('duty')" class="add-btn"><Plus class="w-4 h-4"/></button>
            </div>
            <div class="flex flex-wrap gap-1 min-h-[24px]">
              <span v-for="(t,i) in form.duties" :key="i" class="tag bg-blue-50 text-blue-700">
                {{t}}<X @click="removeTag('duty',i)" class="w-3 h-3 ml-1 cursor-pointer"/>
              </span>
            </div>
          </div>
          
          <div>
            <div class="flex gap-2 mb-2">
              <input v-model="inputState.subject" @keyup.enter="addTag('subject')" placeholder="교과 (예: 수학)" class="tag-input"/>
              <button @click="addTag('subject')" class="add-btn"><Plus class="w-4 h-4"/></button>
            </div>
            <div class="flex flex-wrap gap-1 min-h-[24px]">
              <span v-for="(t,i) in form.subjects" :key="i" class="tag bg-green-50 text-green-700">
                {{t}}<X @click="removeTag('subject',i)" class="w-3 h-3 ml-1 cursor-pointer"/>
              </span>
            </div>
          </div>
    
          <div>
            <div class="flex gap-2 mb-2">
              <input v-model="inputState.club" @keyup.enter="addTag('club')" placeholder="동아리 (예: 코딩반)" class="tag-input"/>
              <button @click="addTag('club')" class="add-btn"><Plus class="w-4 h-4"/></button>
            </div>
            <div class="flex flex-wrap gap-1 min-h-[24px]">
              <span v-for="(t,i) in form.clubs" :key="i" class="tag bg-purple-50 text-purple-700">
                {{t}}<X @click="removeTag('club',i)" class="w-3 h-3 ml-1 cursor-pointer"/>
              </span>
            </div>
          </div>
    
        </div>
      </div>
    </template>
    
    <style scoped>
    .tag-input { flex: 1; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9rem; outline: none; }
    .add-btn { padding: 0.5rem; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 0.5rem; cursor: pointer; }
    .tag { display: inline-flex; align-items: center; padding: 0.2rem 0.5rem; border-radius: 99px; font-size: 0.8rem; font-weight: 600; }
    </style>