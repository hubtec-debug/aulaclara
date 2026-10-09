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
