// Redirect if already logged in
if(localStorage.getItem('aavahana-user')){
  window.location.href = 'index.html';
}

// Sync theme on load
(function(){
  if(localStorage.getItem('aavahana-dark')==='1'){
    document.body.classList.add('dark');
    document.getElementById('theme-icon').className = 'fa-solid fa-sun';
  }
})();

function toggleTheme(){
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('aavahana-dark', isDark ? '1' : '0');
  document.getElementById('theme-icon').className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function togglePass(){
  const inp = document.getElementById('login-pass');
  const showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  document.getElementById('pass-eye').className = showing ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
}

function showErr(msg){
  const el = document.getElementById('login-err');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearErr(){
  document.getElementById('login-err').classList.add('hidden');
}

function doLogin(){
  clearErr();
  const empid = document.getElementById('login-empid').value.trim();
  const pass  = document.getElementById('login-pass').value;

  const name  = document.getElementById('login-name').value.trim();
  if(!name)  { showErr('Please enter your name.');        return; }
  if(!empid) { showErr('Please enter your Employee ID.'); return; }
  if(!pass)  { showErr('Please enter your password.');    return; }

  // Store session — backend auth will replace this
  localStorage.setItem('aavahana-user', JSON.stringify({
    name:      name,
    empid:     empid,
    firstName: name.split(' ')[0]
  }));
  window.location.href = 'index.html';
}

// Backend auth will replace this login flow.

// Enter key submits
document.addEventListener('keydown', e => { if(e.key === 'Enter') doLogin(); });
