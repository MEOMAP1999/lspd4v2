
// LSPL System v3 - avatar, filters, reports (client-only)
(function(){
  const $ = id => document.getElementById(id);
  const q = sel => document.querySelector(sel);
  const now = () => new Date();
  const fmt = d => new Date(d).toLocaleString();

  const KEY_USERS = 'lspd_v3_users';
  const KEY_DUTY = 'lspd_v3_duty';

  // default admin
  const defaultUsers = [{id:1,name:'Administrator',role:'Admin',username:'admin',password:'123456',avatar:''}];
  if(!localStorage.getItem(KEY_USERS)) localStorage.setItem(KEY_USERS, JSON.stringify(defaultUsers));
  if(!localStorage.getItem(KEY_DUTY)) localStorage.setItem(KEY_DUTY, JSON.stringify([]));

  function getUsers(){ return JSON.parse(localStorage.getItem(KEY_USERS) || '[]'); }
  function saveUsers(u){ localStorage.setItem(KEY_USERS, JSON.stringify(u)); }
  function getDuty(){ return JSON.parse(localStorage.getItem(KEY_DUTY) || '[]'); }
  function saveDuty(d){ localStorage.setItem(KEY_DUTY, JSON.stringify(d)); }
  function setCurrent(u){ sessionStorage.setItem('lspd_v3_current', JSON.stringify(u)); }
  function getCurrent(){ return JSON.parse(sessionStorage.getItem('lspd_v3_current') || 'null'); }
  function logout(){ sessionStorage.removeItem('lspd_v3_current'); location.href='index.html'; }

  // Login page
  if(location.pathname.endsWith('index.html') || location.pathname.endsWith('/')){
    const form = q('#loginForm');
    form && form.addEventListener('submit', e=>{
      e.preventDefault();
      const u = $('#username').value.trim(); const p = $('#password').value;
      const user = getUsers().find(x=>x.username===u && x.password===p);
      if(!user) return alert('Tài khoản hoặc mật khẩu không đúng');
      setCurrent(user);
      if(user.role === 'Admin') location.href='dashboard.html'; else location.href='duty.html';
    });
    q('#demoOfficer') && q('#demoOfficer').addEventListener('click', ()=>{
      let users = getUsers(); let off = users.find(x=>x.username==='officer1');
      if(!off){ const id = (users.length? Math.max(...users.map(u=>u.id)):0)+1; off = {id,name:'Officer Demo',role:'Officer',username:'officer1',password:'123',avatar:''}; users.push(off); saveUsers(users); }
      setCurrent(off); location.href='duty.html';
    });
  }

  // protect pages
  const protectedPages = ['dashboard.html','manage.html','duty.html','report.html'];
  if(protectedPages.some(p=>location.pathname.endsWith(p))){
    const cur = getCurrent(); if(!cur) location.href='index.html';
  }

  // common DOM loaded actions
  document.addEventListener('DOMContentLoaded', ()=>{
    const cur = getCurrent();
    ['who','who2','who3','who4'].forEach(id=>{ const el = $(id); if(el) el.innerHTML = cur ? ('<img src="'+(cur.avatar||'')+'" class="avatar" onerror="this.style.display=\'none\'"> '+cur.name+' ('+cur.role+')') : ''; });
    ['logout','logout2','logout3','logout4'].forEach(id=>{ const b = $(id); if(b) b.addEventListener('click', logout); });
    // hide manage for non-admins
    if(cur && cur.role !== 'Admin'){ const el = document.getElementById('link-manage'); if(el) el.style.display='none'; const el2 = document.getElementById('link-manage-3'); if(el2) el2.style.display='none'; }
  });

  // Dashboard export/import (JSON & XLSX)
  if(location.pathname.endsWith('dashboard.html')){
    $('#exportJson').addEventListener('click', ()=>{
      const data = { users: getUsers(), duty: getDuty() };
      const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lspd_v3_backup_'+(new Date().toISOString().slice(0,10))+'.json'; a.click(); a.remove();
    });
    $('#exportXlsx').addEventListener('click', ()=>{
      const users = getUsers(); const duty = getDuty();
      try{
        const ws1 = XLSX.utils.json_to_sheet(users.map(u=>({id:u.id,name:u.name,role:u.role,username:u.username})));
        const ws2 = XLSX.utils.json_to_sheet(duty);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws1, 'Users'); XLSX.utils.book_append_sheet(wb, ws2, 'Duty');
        XLSX.writeFile(wb, 'lspd_v3_export_'+(new Date().toISOString().slice(0,10))+'.xlsx');
      }catch(err){ alert('Không thể xuất XLSX. Kiểm tra kết nối CDN.'); }
    });
    // Import JSON
    q('#link-import') && q('#link-import').addEventListener('click', ()=>{
      const inp = document.createElement('input'); inp.type='file'; inp.accept='.json'; inp.onchange = e=>{
        const f = e.target.files[0]; if(!f) return;
        const reader = new FileReader(); reader.onload = ev=>{
          try { const data = JSON.parse(ev.target.result); if(data.users && data.duty){ if(confirm('Nhập sẽ ghi đè dữ liệu hiện tại. Tiếp tục?')){ localStorage.setItem(KEY_USERS, JSON.stringify(data.users)); localStorage.setItem(KEY_DUTY, JSON.stringify(data.duty)); alert('Import xong. Reload.'); location.reload(); } } else alert('File không đúng định dạng'); } catch(err){ alert('Không đọc được file'); }
        }; reader.readAsText(f,'utf-8');
      }; inp.click();
    });
  }

  // Manage page: add user with avatar, search & filter
  if(location.pathname.endsWith('manage.html')){
    const tbl = document.querySelector('#usersTbl tbody');
    function render(filterName='', filterRole=''){
      const users = getUsers().filter(u=> u.name.toLowerCase().includes(filterName.toLowerCase()) && (filterRole? u.role===filterRole:true));
      tbl.innerHTML = '';
      users.forEach((u,i)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i+1}</td><td>${u.avatar?'<img src="'+u.avatar+'" class="avatar" onerror="this.style.display=\'none\'">':'<div style="width:40px;height:40px;border-radius:50%;background:#222"></div>'}</td><td>${u.name}</td><td>${u.role}</td><td>${u.username}</td>
          <td><button class="btn edit" data-id="${u.id}">Sửa</button> <button class="btn alt del" data-id="${u.id}">Xóa</button></td>`;
        tbl.appendChild(tr);
      });
      tbl.querySelectorAll('.del').forEach(b=>b.addEventListener('click', ()=>{ if(!confirm('Xóa người này?')) return; const id=parseInt(b.dataset.id); const users = getUsers().filter(x=>x.id!==id); saveUsers(users); render($('#searchName').value, $('#filterRole').value); }));
      tbl.querySelectorAll('.edit').forEach(b=>b.addEventListener('click', ()=>{
        const id = parseInt(b.dataset.id); const users = getUsers(); const u = users.find(x=>x.id===id);
        const name = prompt('Họ tên', u.name); if(name===null) return; const role = prompt('Vai trò', u.role); if(role===null) return;
        u.name = name; u.role = role; saveUsers(users); render($('#searchName').value, $('#filterRole').value);
      }));
    }
    render();
    $('#addUserForm').addEventListener('submit', e=>{
      e.preventDefault();
      const name = $('#u_name').value.trim(); const username = $('#u_username').value.trim(); const password = $('#u_password').value; const role = $('#u_role').value;
      if(!name||!username||!password) return alert('Điền đủ thông tin');
      const users = getUsers();
      if(users.some(x=>x.username===username)) return alert('Username đã tồn tại');
      const id = (users.length? Math.max(...users.map(u=>u.id)):0)+1;
      // avatar file -> base64
      const file = $('#u_avatar').files[0];
      if(file){
        const reader = new FileReader();
        reader.onload = ev=>{
          users.push({id,name,role,username,password,avatar:ev.target.result}); saveUsers(users); render(); $('#addUserForm').reset(); alert('Thêm thành công');
        };
        reader.readAsDataURL(file);
      } else {
        users.push({id,name,role,username,password,avatar:''}); saveUsers(users); render(); $('#addUserForm').reset(); alert('Thêm thành công');
      }
    });
    $('#clearUsers').addEventListener('click', ()=>{ if(confirm('Xóa tất cả người dùng?')){ localStorage.setItem(KEY_USERS, JSON.stringify([])); render(); } });
    $('#searchName').addEventListener('input', ()=> render($('#searchName').value, $('#filterRole').value));
    $('#filterRole').addEventListener('change', ()=> render($('#searchName').value, $('#filterRole').value));
  }

  // Duty page: render, filter by user/date, record actions
  if(location.pathname.endsWith('duty.html')){
    const sel = $('#selUser'); const tbody = document.querySelector('#dutyTbl tbody'); const fuser = $('#filterUser');
    function renderUsersSelect(){
      sel.innerHTML=''; fuser.innerHTML = '<option value="">Tất cả</option>';
      const users = getUsers(); const cur = getCurrent();
      users.forEach(u=>{ const opt=document.createElement('option'); opt.value=u.id; opt.textContent = u.name+' ('+u.role+')'; sel.appendChild(opt); const opt2=opt.cloneNode(true); fuser.appendChild(opt2); });
      if(cur && cur.role!=='Admin'){ sel.value = cur.id; sel.disabled=true; fuser.value = cur.id; }
    }
    function renderDuty(filterUser='', from='', to=''){
      const duty = getDuty(); const cur = getCurrent();
      tbody.innerHTML='';
      let list = duty.slice();
      if(filterUser) list = list.filter(d=>String(d.userId)===String(filterUser));
      if(from) list = list.filter(d=> new Date(d.time) >= new Date(from));
      if(to) list = list.filter(d=> new Date(d.time) <= new Date(new Date(to).getTime()+24*3600*1000-1));
      list.forEach((d,i)=>{ if(cur && cur.role!=='Admin' && d.userId!==cur.id) return; const tr=document.createElement('tr'); tr.innerHTML=`<td>${i+1}</td><td>${d.name}</td><td>${d.action}</td><td>${new Date(d.time).toLocaleString()}</td>`; tbody.appendChild(tr); });
    }
    renderUsersSelect(); renderDuty();
    function record(action){
      const uid = parseInt(sel.value); const user = getUsers().find(x=>x.id===uid); if(!user) return alert('Chọn user');
      const duty = getDuty(); const id = (duty.length? Math.max(...duty.map(x=>x.id)):0)+1;
      duty.unshift({id,userId:uid,name:user.name,action,time:new Date().toISOString()}); saveDuty(duty); renderDuty($('#filterUser').value, $('#fromDate').value, $('#toDate').value);
    }
    $('#btnOn').addEventListener('click', ()=> record('On-duty'));
    $('#btnOff').addEventListener('click', ()=> record('Off-duty'));
    $('#clearDuty').addEventListener('click', ()=> { if(confirm('Xóa lịch sử?')){ localStorage.setItem(KEY_DUTY, JSON.stringify([])); renderDuty(); } });
    $('#applyFilter').addEventListener('click', ()=> renderDuty($('#filterUser').value, $('#fromDate').value, $('#toDate').value));
    $('#resetFilter').addEventListener('click', ()=>{ $('#filterUser').value=''; $('#fromDate').value=''; $('#toDate').value=''; renderDuty(); });
    $('#expDutyJson').addEventListener('click', ()=>{
      const duty = getDuty(); const cur = getCurrent(); const filtered = cur && cur.role!=='Admin' ? duty.filter(d=>d.userId===cur.id) : duty;
      const blob = new Blob([JSON.stringify(filtered,null,2)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='duty_'+(new Date().toISOString().slice(0,10))+'.json'; a.click(); a.remove();
    });
    $('#expDutyXlsx').addEventListener('click', ()=>{
      const duty = getDuty(); const cur = getCurrent(); const filtered = cur && cur.role!=='Admin' ? duty.filter(d=>d.userId===cur.id) : duty;
      try { const ws = XLSX.utils.json_to_sheet(filtered); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Duty'); XLSX.writeFile(wb, 'duty_'+(new Date().toISOString().slice(0,10))+'.xlsx'); } catch(err){ alert('Không thể xuất XLSX. Kiểm tra CDN.'); }
    });
  }

  // Report page: chart renders
  if(location.pathname.endsWith('report.html')){
    function computeStats(){
      const users = getUsers(); const duty = getDuty();
      // count actions per user
      const counts = users.map(u=>({id:u.id,name:u.name,count: duty.filter(d=>d.userId===u.id).length}));
      // approximate hours: count(On-duty -> Off-duty pairs) per user and assume 1 hour per pair if unmatched => simplified
      const hours = users.map(u=>{
        const logs = duty.filter(d=>d.userId===u.id).sort((a,b)=> new Date(a.time)-new Date(b.time));
        let totalMs = 0; let lastOn = null;
        logs.forEach(l=>{
          if(l.action.toLowerCase().includes('on')) lastOn = new Date(l.time);
          if(l.action.toLowerCase().includes('off') && lastOn){ totalMs += (new Date(l.time) - lastOn); lastOn = null; }
        });
        return {id:u.id,name:u.name,hours: Math.round((totalMs/3600000)*100)/100};
      });
      return {counts, hours};
    }
    const stats = computeStats();
    // Chart: counts
    const ctx1 = document.getElementById('chartCount').getContext('2d');
    const labels = stats.counts.map(s=>s.name);
    const data1 = stats.counts.map(s=>s.count);
    new Chart(ctx1, { type: 'bar', data: { labels, datasets:[{label:'Số lần chấm', data:data1}] }, options:{responsive:true} });
    // Chart: hours
    const ctx2 = document.getElementById('chartHours').getContext('2d');
    const data2 = stats.hours.map(s=>s.hours);
    new Chart(ctx2, { type: 'line', data:{ labels, datasets:[{label:'Giờ On-duty (giờ)', data:data2, fill:false}] }, options:{responsive:true} });
  }

})();