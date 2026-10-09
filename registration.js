let registrationType='school';
function showRegistration(){document.querySelector('#loginScreen').classList.add('hidden');document.querySelector('#app').classList.add('hidden');document.querySelector('#registerScreen').classList.remove('hidden');document.querySelector('#regName').focus()}
function showLogin(){document.querySelector('#registerScreen').classList.add('hidden');document.querySelector('#loginScreen').classList.remove('hidden');document.querySelector('#email').focus()}
function setRegistrationType(type){
  registrationType=type;
  document.querySelectorAll('[data-account-type]').forEach(b=>b.classList.toggle('selected',b.dataset.accountType===type));
  const school=type==='school';
  document.querySelector('#registrationOrgTitle').textContent=school?'Datos del Colegio':'Datos Profesionales';
  document.querySelector('#registrationOrgLabel').textContent=school?'Nombre del Colegio':'Nombre / Espacio Profesional';
  document.querySelector('#schoolLevelsBlock').classList.toggle('professional-only-hidden',!school);
  document.querySelector('#regOrgType').parentElement.classList.toggle('professional-only-hidden',!school);
  document.querySelector('#regOrgName').placeholder=school?'Ej. Southern International School':'Ej. Equipo de orientación';
  document.querySelector('.registration-column .registration-section-title:last-of-type').innerHTML=`<span>⌖</span> ${school?'Ubicación y Logo':'Ubicación y Marca'}`;
  document.querySelector('label[for="regLogo"]').textContent=school?'▧ Logo del Colegio':'▧ Logo profesional (opcional)';
}
document.querySelector('#showRegistration').addEventListener('click',showRegistration);
document.querySelector('#cancelRegistration').addEventListener('click',()=>{document.querySelector('#registerForm').reset();setRegistrationType('school');document.querySelector('#logoPreview').classList.add('hidden');showLogin()});
document.querySelector('#backToLogin').addEventListener('click',showLogin);
document.querySelectorAll('[data-account-type]').forEach(b=>b.addEventListener('click',()=>setRegistrationType(b.dataset.accountType)));
document.querySelectorAll('[data-toggle-password]').forEach(b=>b.addEventListener('click',()=>{const input=document.getElementById(b.dataset.togglePassword);input.type=input.type==='password'?'text':'password';b.setAttribute('aria-label',input.type==='password'?'Mostrar contraseña':'Ocultar contraseña')}));
function checkPasswordMatch(){const pass=document.querySelector('#regPassword').value,repeat=document.querySelector('#regPasswordRepeat');repeat.setCustomValidity(repeat.value===pass?'':'Las contraseñas no coinciden.')}
document.querySelector('#regPasswordRepeat').addEventListener('input',checkPasswordMatch);
document.querySelector('#regPassword').addEventListener('input',checkPasswordMatch);
document.querySelector('#regLogo').addEventListener('change',e=>{const file=e.target.files?.[0],preview=document.querySelector('#logoPreview');if(!file){preview.classList.add('hidden');return}if(file.size>2*1024*1024){e.target.value='';toast('El logo de prueba debe pesar menos de 2 MB.');preview.classList.add('hidden');return}preview.src=URL.createObjectURL(file);preview.classList.remove('hidden')});
document.querySelector('#registerForm').addEventListener('submit',e=>{
  e.preventDefault();checkPasswordMatch();if(!e.currentTarget.reportValidity())return;
  if(registrationType==='school'&&!document.querySelector('input[name="levels"]:checked')){toast('Seleccioná al menos un nivel educativo.');return}
  const fullName=document.querySelector('#regName').value.trim(),org=document.querySelector('#regOrgName').value.trim(),province=document.querySelector('#regProvince').value,city=document.querySelector('#regCity').value.trim(),orgType=document.querySelector('#regOrgType').value,place=[province,city].filter(Boolean).join(' · ');
  const levels=registrationType==='school'?[...document.querySelectorAll('input[name="levels"]:checked')].map(input=>input.value):[];
  data.school=registrationType==='school'?{name:org,location:[place,orgType].filter(Boolean).join(' · ')||'Institución de prueba',accountType:registrationType,institutionType:orgType,levels}:{name:org,location:['Espacio profesional',place].filter(Boolean).join(' · ')||'Cuenta profesional de prueba',accountType:registrationType,levels};
  setActivity(`Se creó un espacio de prueba para ${fullName}.`);
  sessionStorage.setItem('aulaclara-session','1');sessionStorage.setItem('aulaclara-display-name',fullName);
  document.querySelector('#registerScreen').classList.add('hidden');document.querySelector('#app').classList.remove('hidden');render();toast('Espacio de prueba listo. El prototipo no guarda contraseñas ni crea una cuenta online.');
});

// En el modo conectado, los formularios usan Supabase Auth y no la sesión de demostración.
async function openCloudSession(user){
  const workspace=await AulaClaraCloud.loadWorkspace();
  AulaClaraState.schoolId=workspace.schoolId;AulaClaraState.cloudSession=true;
  data=workspace.data;sessionStorage.setItem('aulaclara-display-name',user.user_metadata?.full_name||user.email||'Equipo escolar');
  sessionStorage.removeItem('aulaclara-session');enter();
}
document.querySelector('#loginForm').addEventListener('submit',async e=>{
  if(!AulaClaraCloud.configured)return;
  e.preventDefault();e.stopImmediatePropagation();
  const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{const {data:authData,error}=await AulaClaraCloud.signIn(document.querySelector('#email').value.trim(),document.querySelector('#password').value);if(error)throw error;await openCloudSession(authData.user)}
  catch(error){toast(error.message||'No se pudo iniciar sesión. Revisá el correo y la contraseña.')}
  finally{button.disabled=false}
},true);
document.querySelector('#registerForm').addEventListener('submit',async e=>{
  if(!AulaClaraCloud.configured)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(registrationType==='school'&&!document.querySelector('input[name="levels"]:checked')){toast('Seleccioná al menos un nivel educativo.');return}
  const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{
    const fullName=document.querySelector('#regName').value.trim(),organizationName=document.querySelector('#regOrgName').value.trim(),email=document.querySelector('#regEmail').value.trim();
    if(!email){document.querySelector('#regEmail').focus();toast('Ingresá un correo electrónico para crear la cuenta.');return}
    const {data:authData,error}=await AulaClaraCloud.signUp({email,password:document.querySelector('#regPassword').value,fullName,organizationName,accountType:registrationType});
    if(error)throw error;
    if(authData.session&&authData.user){await openCloudSession(authData.user);toast('Cuenta creada y colegio conectado.')}
    else{toast('Cuenta creada. Revisá tu correo y confirmá la dirección; después iniciá sesión.')}
  }catch(error){toast(error.message||'No se pudo crear la cuenta. Revisá los datos e intentá de nuevo.')}
  finally{button.disabled=false}
},true);
if(AulaClaraCloud.configured){
  AulaClaraCloud.session().then(async session=>{if(session?.user)await openCloudSession(session.user)}).catch(error=>toast(error.message||'No se pudo recuperar la sesión.'));
}
let cloudSaveTimer=null;
save=function(){
  if(AulaClaraState.cloudSession){
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer=setTimeout(()=>AulaClaraCloud.syncWorkspace(data).catch(error=>toast(`No se pudo sincronizar el cambio: ${error.message||'error de conexión'}`)),250);
    return true;
  }
  try{localStorage.setItem(STORE,JSON.stringify(data));return true}catch{return false}
};
document.querySelector('#logoutBtn').onclick=async()=>{
  if(AulaClaraState.cloudSession){const {error}=await AulaClaraCloud.signOut();if(error){toast(error.message||'No se pudo cerrar la sesión.');return}AulaClaraState.cloudSession=false;AulaClaraState.schoolId=null}
  sessionStorage.removeItem('aulaclara-session');sessionStorage.removeItem('aulaclara-display-name');document.querySelector('#app').classList.add('hidden');document.querySelector('#loginScreen').classList.remove('hidden');
};
document.addEventListener('click',e=>{
  if(!AulaClaraState.cloudSession)return;
  const add=e.target.closest('[data-add]'),edit=e.target.closest('[data-edit]'),remove=e.target.closest('[data-remove]');
  if(add?.dataset.add==='teacher'||edit?.dataset.edit?.startsWith('teacher:')){e.preventDefault();e.stopImmediatePropagation();toast('La invitación real de docentes requiere un flujo seguro adicional; no se guardará como si fuera una cuenta.')}
  if(e.target.closest('#schoolSwitcher')||add?.dataset.add==='school'){e.preventDefault();e.stopImmediatePropagation();toast('La edición de los datos institucionales se habilitará al ampliar el esquema del colegio.')}
  if(remove){e.preventDefault();e.stopImmediatePropagation();toast('La eliminación online está pausada para evitar borrar información institucional por error.')}
},true);
