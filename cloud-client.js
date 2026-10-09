(function(){
  const config=window.AULA_CLARA_SUPABASE,sdk=window.supabase;
  const configured=Boolean(config?.url&&config?.publishableKey&&sdk?.createClient);
  const client=configured?sdk.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  if(configured){sessionStorage.removeItem('aulaclara-session');sessionStorage.removeItem('aulaclara-display-name')}
  const ensure=(result)=>{if(result.error)throw result.error;return result.data};
  window.AulaClaraCloud={
    configured,client,
    async signIn(email,password){if(!client)throw new Error('Falta configurar la conexión con Supabase.');return client.auth.signInWithPassword({email,password})},
    async signUp({email,password,fullName,organizationName,accountType='school'}){if(!client)throw new Error('Falta configurar la conexión con Supabase.');const emailRedirectTo=`${window.location.origin}${window.location.pathname}`;return client.auth.signUp({email,password,options:{emailRedirectTo,data:{full_name:fullName,organization_name:organizationName,account_type:accountType}}})},
    async resendSignup(email){if(!client)throw new Error('Falta configurar la conexión con Supabase.');const emailRedirectTo=`${window.location.origin}${window.location.pathname}`;return client.auth.resend({type:'signup',email,options:{emailRedirectTo}})},
    async createWorkspace(){if(!client)throw new Error('Falta configurar la conexión con Supabase.');return client.rpc('create_school_workspace')},
    async signOut(){if(!client)return {error:null};return client.auth.signOut()},
    async session(){if(!client)return null;return ensure(await client.auth.getSession()).session},
    async currentUser(){if(!client)return null;return ensure(await client.auth.getUser()).user},
    async loadWorkspace(){
      if(!client)throw new Error('Falta configurar la conexión con Supabase.');
      const user=await this.currentUser();if(!user)throw new Error('La sesión venció. Volvé a iniciar sesión.');
      const schoolId=ensure(await client.rpc('create_school_workspace'));
      const [schoolRows,members,classRows,enrollments,students,screenings,tasks,submissions]=await Promise.all([
        client.from('schools').select('id,name,locale').eq('id',schoolId).single(),
        client.from('school_memberships').select('school_id,user_id,role').eq('school_id',schoolId),
        client.from('school_classes').select('*').eq('school_id',schoolId).order('grade').order('division'),
        client.from('class_enrollments').select('*').eq('school_id',schoolId),
        client.from('students').select('*').eq('school_id',schoolId).order('last_name').order('first_name'),
        client.from('reading_screenings').select('*').eq('school_id',schoolId).order('completed_at'),
        client.from('school_tasks').select('*').eq('school_id',schoolId).order('created_at'),
        client.from('task_submissions').select('*').eq('school_id',schoolId).order('submitted_at')
      ]);
      const school=ensure(schoolRows),membershipRows=ensure(members),classData=ensure(classRows),enrollmentData=ensure(enrollments),studentData=ensure(students);
      let profileRows=[];const staffIds=membershipRows.filter(x=>x.role==='teacher').map(x=>x.user_id);
      if(staffIds.length)profileRows=ensure(await client.from('profiles').select('user_id,display_name').in('user_id',staffIds));
      const classes=classData.map(c=>({id:c.id,grade:c.grade,division:c.division,level:c.level,shift:c.shift,schoolYear:c.school_year,teacher:''}));
      const roster=studentData.map(s=>{const enrollment=enrollmentData.find(e=>e.student_id===s.id),cl=classData.find(c=>c.id===enrollment?.class_id);return{id:s.id,name:[s.first_name,s.last_name].filter(Boolean).join(' '),email:'',grade:cl?.grade||'',division:cl?.division||'',status:s.status==='active'?'Activo':'Inactivo'}});
      const screeningData=ensure(screenings),taskData=ensure(tasks),submissionData=ensure(submissions);
      const result={user,schoolId,role:membershipRows.find(m=>m.user_id===user.id)?.role||'teacher',knownIds:{classes:classData.map(x=>x.id),students:studentData.map(x=>x.id),screenings:screeningData.map(x=>x.id),tasks:taskData.map(x=>x.id),submissions:submissionData.map(x=>x.id)},data:{school:{id:school.id,name:school.name,location:'Argentina · espacio institucional'},students:roster,teachers:membershipRows.filter(x=>x.role==='teacher').map(m=>({id:m.user_id,name:profileRows.find(p=>p.user_id===m.user_id)?.display_name||'Docente',email:'',subject:'Equipo docente',classes:''})),classes,activity:[],screeningResults:screeningData.map(r=>({id:r.id,type:'reading',studentId:r.student_id,studentName:roster.find(s=>s.id===r.student_id)?.name||'',grade:classData.find(c=>c.id===r.class_id)?.grade||'',division:classData.find(c=>c.id===r.class_id)?.division||'',date:new Intl.DateTimeFormat('es-AR').format(new Date(r.completed_at)),seconds:r.duration_seconds,errors:r.observed_errors,wpm:r.words_per_minute,comprehension:r.comprehension_score,notes:r.observation_notes})),tasks:taskData.map(t=>({id:t.id,classId:t.class_id,type:t.activity_type,title:t.title,instructions:t.instructions,grade:classData.find(c=>c.id===t.class_id)?.grade||'',division:classData.find(c=>c.id===t.class_id)?.division||'',dueDate:t.due_at?.slice(0,10)||'',status:t.status})),taskResponses:submissionData.map(s=>({id:s.id,taskId:s.task_id,studentId:s.student_id,studentName:roster.find(x=>x.id===s.student_id)?.name||'',studentText:s.text_response,submittedAt:s.submitted_at,score:s.descriptive_score,answers:s.answers,elapsedSeconds:s.elapsed_seconds,writingReview:s.teacher_review}))}};
      window.AulaClaraState.schoolId=schoolId;window.AulaClaraState.role=result.role;window.AulaClaraState.knownIds=result.knownIds;return result;
    },
    async insertReadingResult(result,schoolId,classId){const user=await this.currentUser();if(!user)throw new Error('La sesión venció. Volvé a iniciar sesión.');return client.from('reading_screenings').insert({school_id:schoolId,class_id:classId,student_id:result.studentId,created_by:user.id,instrument_key:'reading_3_primary_pilot_v1',duration_seconds:result.seconds,observed_errors:result.errors,words_per_minute:result.wpm,comprehension_score:result.comprehension,observation_notes:result.notes||''})},
    async createClass(schoolId,record){return client.from('school_classes').insert({school_id:schoolId,level:record.level,grade:record.grade,division:record.division,shift:record.shift,school_year:record.schoolYear||2026}).select().single()},
    async createStudent(schoolId,record,classId){const created=await client.from('students').insert({school_id:schoolId,first_name:record.name.trim().split(/\s+/).slice(0,-1).join(' ')||record.name.trim(),last_name:record.name.trim().split(/\s+/).slice(-1)[0],status:'active'}).select().single();if(created.error)return created;const enrollment=await client.from('class_enrollments').insert({school_id:schoolId,class_id:classId,student_id:created.data.id});if(enrollment.error){await client.from('students').delete().eq('id',created.data.id);return enrollment}return created},
    async syncWorkspace(snapshot){
      const schoolId=window.AulaClaraState.schoolId,user=await this.currentUser();if(!schoolId||!user)throw new Error('La sesión escolar no está disponible.');
      const director=window.AulaClaraState.role==='director';
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const remap=new Map();const idFor=x=>{const old=String(x.id);if(!uuid.test(old))x.id=crypto.randomUUID();remap.set(old,String(x.id));return x.id};
      const classes=snapshot.classes.map(c=>({record:c,id:idFor(c)}));
      if(director){for(const {record:c,id} of classes){const res=await client.from('school_classes').upsert({id,school_id:schoolId,level:c.level,grade:c.grade,division:c.division,shift:c.shift,school_year:c.schoolYear||2026},{onConflict:'id'});if(res.error)throw res.error}
        const enrollments=[];
        for(const s of snapshot.students){const id=idFor(s),parts=String(s.name||'').trim().split(/\s+/),classRecord=snapshot.classes.find(c=>c.grade===s.grade&&c.division===s.division);const saved=await client.from('students').upsert({id,school_id:schoolId,first_name:parts.slice(0,-1).join(' ')||parts[0]||'Estudiante',last_name:parts.slice(-1)[0]||'Estudiante',status:(s.status||'Activo').toLowerCase()==='activo'?'active':'inactive'},{onConflict:'id'});if(saved.error)throw saved.error;if(classRecord)enrollments.push({school_id:schoolId,class_id:classRecord.id,student_id:id})}
        if(enrollments.length){const saved=await client.from('class_enrollments').upsert(enrollments,{onConflict:'class_id,student_id'});if(saved.error)throw saved.error}}
      const known=window.AulaClaraState.knownIds||{screenings:[],tasks:[],submissions:[]};
      for(const t of snapshot.tasks||[]){const original=String(t.id);if(known.tasks?.includes(original))continue;const c=snapshot.classes.find(x=>x.grade===t.grade&&x.division===t.division);if(!c)continue;const res=await client.from('school_tasks').insert({school_id:schoolId,class_id:c.id,created_by:user.id,activity_type:t.type,title:t.title,instructions:t.instructions||'',status:'assigned',due_at:t.dueDate?new Date(`${t.dueDate}T23:59:59`).toISOString():null}).select('id').single();if(res.error)throw res.error;t.id=res.data.id;remap.set(original,String(t.id))}
      for(const response of snapshot.taskResponses||[]){response.studentId=remap.get(String(response.studentId))||response.studentId;response.taskId=remap.get(String(response.taskId))||response.taskId}
      for(const r of snapshot.screeningResults||[]){r.studentId=remap.get(String(r.studentId))||r.studentId;if(known.screenings?.includes(String(r.id)))continue;const c=snapshot.classes.find(x=>x.grade===r.grade&&x.division===r.division);if(!c)continue;const res=await client.from('reading_screenings').insert({school_id:schoolId,class_id:c.id,student_id:r.studentId,created_by:user.id,instrument_key:'reading_3_primary_pilot_v1',duration_seconds:r.seconds,observed_errors:r.errors,words_per_minute:r.wpm,comprehension_score:r.comprehension,observation_notes:r.notes||''}).select('id').single();if(res.error)throw res.error;r.id=res.data.id}
      for(const response of snapshot.taskResponses||[]){if(known.submissions?.includes(String(response.id))){if(response.writingReview){const review=await client.from('task_submissions').update({teacher_review:response.writingReview}).eq('id',response.id);if(review.error)throw review.error}continue}const task=snapshot.tasks.find(x=>String(x.id)===String(response.taskId)),student=snapshot.students.find(x=>String(x.id)===String(response.studentId)),cl=task&&snapshot.classes.find(x=>x.grade===task.grade&&x.division===task.division);if(!task||!student||!cl)continue;const saved=await client.from('task_submissions').insert({school_id:schoolId,class_id:cl.id,task_id:task.id,student_id:student.id,submitted_by:user.id,answers:response.answers||{},text_response:response.studentText||'',descriptive_score:Number.isFinite(Number(response.score))?Number(response.score):null,elapsed_seconds:Number.isFinite(Number(response.elapsedSeconds))?Math.max(1,Number(response.elapsedSeconds)):null,teacher_review:response.writingReview||{}}).select('id').single();if(saved.error)throw saved.error;response.id=saved.data.id}
      window.AulaClaraState.knownIds={...known,classes:snapshot.classes.map(x=>String(x.id)),students:snapshot.students.map(x=>String(x.id)),screenings:(snapshot.screeningResults||[]).map(x=>String(x.id)),tasks:(snapshot.tasks||[]).map(x=>String(x.id)),submissions:(snapshot.taskResponses||[]).map(x=>String(x.id))};
    }
  };
  window.AulaClaraState={schoolId:null,cloudSession:false};
})();
