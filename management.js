let csvImportPreview=[];

function openEditItem(key){
  const [type,id]=key.split(':');
  const list=type==='student'?data.students:type==='teacher'?data.teachers:type==='class'?data.classes:[];
  const item=list.find(x=>String(x.id)===String(id));if(!item)return;
  openModal(type);const form=document.querySelector('#entityForm');form.dataset.editId=String(item.id);
  document.querySelector('.modal-header h2').textContent=type==='student'?'Editar alumno':type==='teacher'?'Editar docente':'Editar división';
  document.querySelector('.modal-header p').textContent='Actualizá la información y guardá los cambios.';
  const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Guardar cambios';
  Object.entries(item).forEach(([name,value])=>{const field=form.elements.namedItem(name);if(field&&typeof value==='string')field.value=value});
}

function openStudentImport(){
  csvImportPreview=[];
  document.querySelector('#modalRoot').innerHTML=`<div class="modal-backdrop"><section class="modal csv-import-modal"><div class="modal-header"><div><h2>Importar alumnos desde CSV</h2><p>Subí una lista para agregar varios estudiantes de una vez.</p></div><button type="button" class="modal-close" data-close-import>×</button></div><div class="csv-format-note"><b>Columnas necesarias:</b> nombre, curso, division. También podés incluir apellido y email. Acepta coma o punto y coma como separador. El archivo se procesa solo en este navegador.<br><a href="online-pilot/alumnos-ejemplo.csv" download>Descargar archivo de ejemplo</a></div><div class="field csv-file-field"><label for="csvFile">Archivo CSV</label><input id="csvFile" type="file" accept=".csv,text/csv"><small>Hasta 2 MB y 500 filas de estudiantes.</small></div><div id="csvPreview"></div><div class="modal-actions"><button type="button" class="button secondary small" data-close-import>Cancelar</button><button type="button" class="button primary small" id="confirmCsvImport" disabled>Importar alumnos</button></div></section></div>`;
  document.querySelectorAll('[data-close-import]').forEach(b=>b.onclick=closeModal);
  document.querySelector('.modal-backdrop').onclick=e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()};
  document.querySelector('#csvFile').onchange=previewStudentCsv;
  document.querySelector('#confirmCsvImport').onclick=commitStudentCsv;
}

function parseCsvRows(text,delimiter){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const char=text[i];if(char==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(char===delimiter&&!quoted){row.push(cell.trim());cell=''}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(value=>value!==''))rows.push(row);row=[];cell=''}else cell+=char}row.push(cell.trim());if(row.some(value=>value!==''))rows.push(row);return rows}
function normalizeHeader(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[\s_-]+/g,'')}
function previewStudentCsv(e){const file=e.target.files?.[0],preview=document.querySelector('#csvPreview'),button=document.querySelector('#confirmCsvImport');csvImportPreview=[];button.disabled=true;if(!file)return;if(file.size>2*1024*1024){preview.innerHTML='<p class="csv-error">El archivo supera el límite de 2 MB.</p>';return}file.text().then(text=>{text=text.replace(/^\uFEFF/,'');const firstLine=text.split(/\r?\n/,1)[0]||'';const delimiter=(firstLine.match(/;/g)||[]).length>(firstLine.match(/,/g)||[]).length?';':',';const rows=parseCsvRows(text,delimiter);if(rows.length<2){preview.innerHTML='<p class="csv-error">El archivo no tiene filas de datos.</p>';return}if(rows.length>501){preview.innerHTML='<p class="csv-error">El archivo supera las 500 filas permitidas.</p>';return}const headers=rows.shift().map(normalizeHeader),column=names=>headers.findIndex(h=>names.includes(h));const nameCol=column(['nombre','name','alumno','estudiante']),lastCol=column(['apellido','apellidos','lastname','surname']),gradeCol=column(['curso','grado','ano','year','grade']),divisionCol=column(['division','seccion','section']),emailCol=column(['email','correo','correoelectronico']);if(nameCol<0||gradeCol<0||divisionCol<0){preview.innerHTML='<p class="csv-error">No encontramos las columnas obligatorias nombre, curso y division.</p>';return}const valid=[],errors=[];rows.forEach((row,index)=>{const name=(row[nameCol]||'').trim(),last=lastCol>=0?(row[lastCol]||'').trim():'',grade=(row[gradeCol]||'').trim(),division=(row[divisionCol]||'').trim().toUpperCase(),email=emailCol>=0?(row[emailCol]||'').trim():'';if(!name){errors.push(`Fila ${index+2}: falta el nombre.`);return}const cls=data.classes.find(c=>normalizeHeader(c.grade)===normalizeHeader(grade)&&normalizeHeader(c.division)===normalizeHeader(division));if(!cls){errors.push(`Fila ${index+2}: no existe el curso ${grade} ${division}.`);return}if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){errors.push(`Fila ${index+2}: el correo no parece válido.`);return}valid.push({name:[name,last].filter(Boolean).join(' '),email,grade:cls.grade,division:cls.division})});csvImportPreview=valid;button.disabled=!valid.length;preview.innerHTML=`<div class="csv-preview-summary"><b>${valid.length} alumnos listos para importar</b><span>${errors.length} filas con observaciones</span></div>${errors.length?`<ul class="csv-errors">${errors.slice(0,6).map(error=>`<li>${esc(error)}</li>`).join('')}${errors.length>6?`<li>y ${errors.length-6} más…</li>`:''}</ul>`:''}${valid.length?`<div class="csv-preview-sample">${valid.slice(0,3).map(s=>`<span>${esc(s.name)} · ${esc(s.grade)} ${esc(s.division)}</span>`).join('')}</div>`:''}`}).catch(()=>{preview.innerHTML='<p class="csv-error">No pudimos leer el archivo. Guardalo como CSV e intentá otra vez.</p>'})}
function commitStudentCsv(){if(!csvImportPreview.length)return;const imported=csvImportPreview.map((student,index)=>({id:Date.now()+index,...student,status:'Activo'}));data.students.push(...imported);setActivity(`Se importaron ${imported.length} alumnos desde un archivo CSV.`);closeModal();render();toast(`${imported.length} alumnos importados.`)}

// In connected mode, write roster changes directly to Supabase and reload the
// canonical IDs/enrollments before making them available to screenings.
const localOpenModal=openModal;
openModal=function(type){if(AulaClaraState?.cloudSession&&['student','class','teacher'].includes(type)){openCloudManagementModal(type);return}return localOpenModal(type)};
const localOpenEditItem=openEditItem;
openEditItem=function(key){if(AulaClaraState?.cloudSession&&key.startsWith('student:')){openCloudManagementModal('student',data.students.find(s=>String(s.id)===key.split(':')[1]));return}return localOpenEditItem(key)};
function openCloudManagementModal(type,student=null){
  const classes=data.classes||[], isEdit=Boolean(student);
  if(type==='student'&&!classes.length){toast('Primero creá una división para poder inscribir al alumno.');return}
  const classOptions=classes.map(c=>`<option value="${esc(c.id)}" ${student&&String(student.classId)===String(c.id)?'selected':''}>${esc(c.grade)} ${esc(c.division)} · ${esc(c.level)}</option>`).join('');
  const assignmentOptions=classes.map(c=>`<label class="question-block"><input type="checkbox" name="classIds" value="${esc(c.id)}"> ${esc(c.grade)} ${esc(c.division)} · ${esc(c.level)}</label>`).join('');
  let fields='';
  if(type==='student')fields=`<div class="field"><label>Nombre y apellido</label><input name="name" required maxlength="180" value="${esc(student?.name||'')}" placeholder="Ej. Valentina Gómez"></div><div class="field"><label>División</label><select name="classId" required>${classOptions}</select><small>El alumno quedará inscripto directamente en esta división.</small></div>`;
  if(type==='class')fields=`<div class="form-row"><div class="field"><label>Nivel</label><select name="level"><option>Inicial</option><option selected>Primaria</option><option>Secundaria</option></select></div><div class="field"><label>Turno</label><select name="shift"><option>Mañana</option><option>Tarde</option><option>Noche</option><option>Jornada completa</option></select></div></div><div class="form-row"><div class="field"><label>Grado / año</label><select name="grade" required>${grades()}</select></div><div class="field"><label>División</label><select name="division"><option>A</option><option>B</option><option>C</option><option>D</option></select></div></div>`;
  if(type==='teacher')fields=`<div class="field"><label>Nombre y apellido</label><input name="fullName" required maxlength="120" placeholder="Ej. Lucía Herrera"></div><div class="field"><label>Correo del docente</label><input name="email" type="email" required maxlength="320" placeholder="docente@colegio.edu.ar"></div><div class="field"><label>Divisiones a cargo</label>${assignmentOptions||'<p class="table-empty">Primero creá una división para asignarla al docente.</p>'}<small>Se enviará una invitación para que cree su contraseña y acceda a las divisiones elegidas.</small></div>`;
  const title=type==='student'?(isEdit?'Asignar alumno a una división':'Agregar alumno'):type==='class'?'Crear una división':'Invitar docente';
  const submitLabel=type==='teacher'?'Enviar invitación':'Guardar';
  $('#modalRoot').innerHTML=`<div class="modal-backdrop"><section class="modal"><div class="modal-header"><div><h2>${title}</h2><p>${type==='teacher'?'El docente recibirá un correo para activar su acceso al colegio.':type==='student'?'El registro se guardará en la división elegida.':'Configurá el curso y la división del colegio.'}</p></div><button class="modal-close" data-cloud-close>×</button></div><form id="cloudEntityForm">${fields}<div id="cloudEntityMessage" class="table-empty" role="status" hidden></div><div class="modal-actions"><button type="button" class="button secondary small" data-cloud-close>Cancelar</button><button class="button primary small" type="submit">${submitLabel}</button></div></form></section></div>`;
  document.querySelectorAll('[data-cloud-close]').forEach(b=>b.onclick=closeModal);
  $('.modal-backdrop').onclick=e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()};
  $('#cloudEntityForm').onsubmit=async e=>{
    e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type="submit"]'),message=$('#cloudEntityMessage'),record=Object.fromEntries(new FormData(form));
    button.disabled=true;message.hidden=false;message.textContent=type==='teacher'?'Enviando invitación…':'Guardando en el colegio…';
    try{
      if(type==='student'){
        const result=isEdit?await AulaClaraCloud.updateStudentPlacement(AulaClaraState.schoolId,student.id,{name:record.name},record.classId):await AulaClaraCloud.createStudent(AulaClaraState.schoolId,{name:record.name},record.classId);
        if(result.error)throw result.error;
      }else if(type==='class'){
        if(classes.some(c=>c.grade===record.grade&&c.division===record.division)){throw new Error('Esa división ya está creada.');}
        const result=await AulaClaraCloud.createClass(AulaClaraState.schoolId,record);if(result.error)throw result.error;
      }else{
        if(!classes.length)throw new Error('Creá al menos una división antes de invitar docentes.');
        const classIds=[...form.querySelectorAll('input[name="classIds"]:checked')].map(x=>x.value);
        if(!classIds.length)throw new Error('Seleccioná al menos una división para este docente.');
        await AulaClaraCloud.inviteTeacher({schoolId:AulaClaraState.schoolId,fullName:record.fullName,email:record.email,classIds});
      }
      const workspace=await AulaClaraCloud.loadWorkspace();data=workspace.data;closeModal();render();toast(type==='teacher'?'Invitación enviada. El docente aparecerá en el equipo escolar.':type==='student'?(isEdit?'División del alumno actualizada.':'Alumno inscripto en la división.'):'División creada y sincronizada.');
    }catch(error){button.disabled=false;message.textContent=error.message||'No se pudo guardar. Revisá la conexión con Supabase y volvé a intentar.'}
  };
  $('#cloudEntityForm input')?.focus();
}
