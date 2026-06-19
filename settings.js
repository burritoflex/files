// Auth guard
const user = JSON.parse(localStorage.getItem('aavahana-user')||'null');
if(!user) window.location.href='login.html';

// Apply dark mode
if(localStorage.getItem('aavahana-dark')==='1') document.body.classList.add('dark');

// Populate profile
document.getElementById('profile-name').textContent = user.name;
document.getElementById('profile-empid').textContent = user.empid;
document.getElementById('profile-avatar').textContent = user.firstName[0].toUpperCase();
document.getElementById('new-name').value = user.name;

function showMsg(id, msg, type){
  const el=document.getElementById(id);
  el.textContent=msg;
  el.className='s-msg '+type;
  el.classList.remove('hidden');
  setTimeout(()=>el.classList.add('hidden'),3500);
}

function changeName(){
  const val=document.getElementById('new-name').value.trim();
  if(!val){ showMsg('name-msg','Please enter a name.','error'); return; }

  // Update user session
  user.name=val;
  user.firstName=val.split(' ')[0];
  localStorage.setItem('aavahana-user',JSON.stringify(user));

  // Update in accounts store
  const accounts=JSON.parse(localStorage.getItem('aavahana-accounts')||'[]');
  const idx=accounts.findIndex(a=>a.empid===user.empid);
  if(idx>=0){ accounts[idx].name=val; localStorage.setItem('aavahana-accounts',JSON.stringify(accounts)); }

  document.getElementById('profile-name').textContent=val;
  document.getElementById('profile-avatar').textContent=user.firstName[0].toUpperCase();
  showMsg('name-msg','Name updated successfully.','success');
}

function changePassword(){
  const cur=document.getElementById('cur-pass').value;
  const np=document.getElementById('new-pass').value;
  const np2=document.getElementById('new-pass2').value;

  if(!cur||!np||!np2){ showMsg('pass-msg','Please fill in all fields.','error'); return; }
  if(np.length<6){ showMsg('pass-msg','New password must be at least 6 characters.','error'); return; }
  if(np!==np2){ showMsg('pass-msg','New passwords do not match.','error'); return; }

  const accounts=JSON.parse(localStorage.getItem('aavahana-accounts')||'[]');
  const idx=accounts.findIndex(a=>a.empid===user.empid);
  if(idx<0){ showMsg('pass-msg','Account not found.','error'); return; }
  if(accounts[idx].password!==btoa(cur)){ showMsg('pass-msg','Current password is incorrect.','error'); return; }

  accounts[idx].password=btoa(np);
  localStorage.setItem('aavahana-accounts',JSON.stringify(accounts));
  document.getElementById('cur-pass').value='';
  document.getElementById('new-pass').value='';
  document.getElementById('new-pass2').value='';
  showMsg('pass-msg','Password updated successfully.','success');
}
