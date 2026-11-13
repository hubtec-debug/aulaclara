function openStudentImport(){
  csvImportPreview=[];
  document.querySelector('#modalRoot').innerHTML=`<div class="modal-backdrop"><section class="modal csv-import-modal"><div class="modal-header"><div><h2>Importar alumnos</h2><p>Subí una planilla Excel o CSV para cargar varios estudiantes de una vez.</p></div><button type="button" class="modal-close" data-close-import aria-label="Cerrar">×</button></div><div class="csv-format-note"><b>Columnas necesarias:</b> nombre, curso y división. También podés agregar apellido. Cada curso y división debe existir previamente en Aula Clara. La planilla se procesa en este navegador; se guarda en el colegio cuando confirmás la importación.<br><a href="alumnos-ejemplo.csv" download>Descargar plantilla CSV (también se abre en Excel)</a></div><div class="field csv-file-field"><label for="csvFile">Archivo Excel o CSV</label><input id="csvFile" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"><small>Excel (.xlsx, .xls) o CSV · hasta 5 MB y 500 filas.</small></div><div id="csvPreview"></div><div class="modal-actions"><button type="button" class="button secondary small" data-close-import>Cancelar</button><button type="button" class="button primary small" id="confirmCsvImport" disabled>Importar alumnos</button></div></section></div>`;
  document.querySelectorAll('[data-close-import]').forEach(b=>b.onclick=closeModal);
  document.querySelector('.modal-backdrop').onclick=e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()};
  document.querySelector('#csvFile').onchange=previewStudentCsv;
  document.querySelector('#confirmCsvImport').onclick=commitStudentCsv;
}

async function previewStudentCsv(e){
  const file=e.target.files?.[0],preview=document.querySelector('#csvPreview'),button=document.querySelector('#confirmCsvImport');
  csvImportPreview=[];button.disabled=true;preview.innerHTML='';if(!file)return;
  if(file.size>5*1024*1024){preview.innerHTML='<p class="csv-error">El archivo supera el límite de 5 MB.</p>';return}
  try{
    let rows=[];const extension=file.name.split('.').pop().toLowerCase();
    if(extension==='csv'){
      const text=(await file.text()).replace(/^\uFEFF/,'');const firstLine=text.split(/\r?\n/,1)[0]||'';
      const delimiter=(firstLine.match(/;/g)||[]).length>(firstLine.match(/,/g)||[]).length?';':',';rows=parseCsvRows(text,delimiter);
    }else{
      if(!window.XLSX){preview.innerHTML='<p class="csv-error">No se cargó el lector de Excel. Actualizá la página o guardá el archivo como CSV desde Excel.</p>';return}
      const workbook=XLSX.read(await file.arrayBuffer(),{type:'array'}),sheet=workbook.Sheets[workbook.SheetNames[0]];
      if(!sheet){preview.innerHTML='<p class="csv-error">El archivo no contiene una hoja con datos.</p>';return}
      rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false}).map(row=>row.map(value=>String(value??'').trim())).filter(row=>row.some(value=>value!==''));
    }
    if(rows.length<2){preview.innerHTML='<p class="csv-error">La planilla no tiene filas de estudiantes.</p>';return}
    if(rows.length>501){preview.innerHTML='<p class="csv-error">El archivo supera las 500 filas permitidas.</p>';return}
    const headers=rows.shift().map(normalizeHeader),column=names=>headers.findIndex(h=>names.includes(h));
    const nameCol=column(['nombre','name','alumno','estudiante','nombreyapellido','nombrecompleto']),lastCol=column(['apellido','apellidos','lastname','surname']),gradeCol=column(['curso','grado','ano','year','grade']),divisionCol=column(['division','seccion','section']);
    if(nameCol<0||gradeCol<0||divisionCol<0){preview.innerHTML='<p class="csv-error">No encontramos las columnas obligatorias: nombre, curso y división.</p>';return}
    const valid=[],errors=[],seen=new Set(data.students.map(s=>`${normalizeHeader(s.name)}|${normalizeHeader(s.grade)}|${normalizeHeader(s.division)}`));
    rows.forEach((row,index)=>{
      const name=String(row[nameCol]||'').trim(),last=lastCol>=0?String(row[lastCol]||'').trim():'',grade=String(row[gradeCol]||'').trim(),division=String(row[divisionCol]||'').trim().toUpperCase();
      if(!name){errors.push(`Fila ${index+2}: falta el nombre.`);return}
      const cls=data.classes.find(c=>normalizeHeader(c.grade)===normalizeHeader(grade)&&normalizeHeader(c.division)===normalizeHeader(division));
      if(!cls){errors.push(`Fila ${index+2}: no existe el curso ${grade} ${division}.`);return}
      const fullName=[name,last].filter(Boolean).join(' '),key=`${normalizeHeader(fullName)}|${normalizeHeader(cls.grade)}|${normalizeHeader(cls.division)}`;
      if(seen.has(key)){errors.push(`Fila ${index+2}: ${fullName} ya figura en ese curso.`);return}
      seen.add(key);valid.push({name:fullName,grade:cls.grade,division:cls.division,classId:cls.id});
    });
    csvImportPreview=valid;button.disabled=!valid.length;
    preview.innerHTML=`<div class="csv-preview-summary"><b>${valid.length} alumnos listos para importar</b><span>${errors.length} filas para revisar</span></div>${errors.length?`<ul class="csv-errors">${errors.slice(0,6).map(error=>`<li>${esc(error)}</li>`).join('')}${errors.length>6?`<li>y ${errors.length-6} más…</li>`:''}</ul>`:''}${valid.length?`<div class="csv-preview-sample">${valid.slice(0,4).map(s=>`<span>${esc(s.name)} · ${esc(s.grade)} ${esc(s.division)}</span>`).join('')}</div>`:''}`;
  }catch(error){preview.innerHTML='<p class="csv-error">No pudimos leer esta planilla. Revisá el formato o guardala como CSV.</p>'}
}

async function commitStudentCsv(){
  if(!csvImportPreview.length)return;
  const button=document.querySelector('#confirmCsvImport');button.disabled=true;button.textContent='Importando…';
  if(AulaClaraState?.cloudSession){
    try{
      const imported=csvImportPreview.map((student,index)=>({id:`import-${Date.now()}-${index}`,...student,status:'Activo'}));data.students.push(...imported);
      await AulaClaraCloud.syncWorkspace(data);const workspace=await AulaClaraCloud.loadWorkspace();data=workspace.data;
      setActivity(`Se importaron ${imported.length} alumnos desde una planilla.`);closeModal();render();toast(`${imported.length} alumnos importados y sincronizados.`);
    }catch(error){
      try{const workspace=await AulaClaraCloud.loadWorkspace();data=workspace.data}catch{}
      closeModal();render();toast(`La importación se interrumpió. Revisá la lista de alumnos y volvé a cargar los que falten. ${error.message||''}`);
    }
    return;
  }
  const imported=csvImportPreview.map((student,index)=>({id:`import-${Date.now()}-${index}`,...student,status:'Activo'}));data.students.push(...imported);setActivity(`Se importaron ${imported.length} alumnos desde una planilla.`);closeModal();render();toast(`${imported.length} alumnos importados.`);
}
