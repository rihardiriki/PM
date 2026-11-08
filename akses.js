/* Penjaga akses PM Packaging (halaman depan + kedua app).
   Di app: <script src="../akses.js" data-role="packing|gudang"></script>
   Mode 1 (disarankan): login akun Firebase, aktif jika apiKey dan dbUrl di config.js terisi.
   Mode 2 (cadangan)  : PIN dari pin.js, dipakai selama apiKey belum diisi. */
(function(){
  var CFG=window.PMG_CONFIG||{}, PIN=window.PMG_PIN||{};
  var DB=(CFG.dbUrl||'').replace(/\/+$/,''), KEY=CFG.apiKey||'';
  var FB=!!(DB&&KEY), SK='pmg_auth', PK='pmg_akses';
  var EXP=(CFG.sandiHari||180)*864e5; /* sandi kedaluwarsa setelah 180 hari (6 bulan) */
  var IDT='https://identitytoolkit.googleapis.com/v1/', STS='https://securetoken.googleapis.com/v1/token';
  var rawFetch=window.fetch?window.fetch.bind(window):null;
  function rd(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
  function rm(k){try{localStorage.removeItem(k)}catch(e){}}
  function expired(s){return !s||!s.pwAt||Date.now()-s.pwAt>EXP}
  function allow(have,want){return have==='semua'||have===want}
  function fail(code){
    if(/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(code))return 'Nama pengguna atau kata sandi salah.';
    if(/WEAK_PASSWORD/.test(code))return 'Sandi terlalu lemah. Pakai minimal 8 karakter, huruf dan angka.';
    if(/CREDENTIAL_TOO_OLD|TOKEN_EXPIRED/.test(code))return 'Sesi habis. Masuk ulang lalu coba lagi.';
    if(/USER_DISABLED/.test(code))return 'Akun ini dinonaktifkan.';
    if(/TOO_MANY_ATTEMPTS/.test(code))return 'Terlalu banyak percobaan. Coba lagi nanti.';
    if(/OPERATION_NOT_ALLOWED/.test(code))return 'Login email belum diaktifkan di Firebase.';
    if(/API key/i.test(code)||/API_KEY/.test(code))return 'API key Firebase tidak valid.';
    return 'Gagal masuk. Coba lagi.';
  }
  function fetchRole(uid,tok){
    return rawFetch(DB+'/roles/'+uid+'.json?auth='+encodeURIComponent(tok),{cache:'no-store'}).then(function(r){
      if(r.status===401||r.status===403)return {err:'rules'};
      if(!r.ok)return {err:'net'};
      return r.json().then(function(v){return {role:typeof v==='string'?v:null}});
    });
  }

  /* Waktu terakhir user mengganti sandinya sendiri: pw/<uid> (angka ms). Tidak ada = belum pernah (login pertama). */
  function fetchPw(uid,tok){
    return rawFetch(DB+'/pw/'+uid+'.json?auth='+encodeURIComponent(tok),{cache:'no-store'}).then(function(r){
      if(r.status===401||r.status===403)return {err:'rules'};
      if(!r.ok)return {err:'net'};
      return r.json().then(function(v){return {at:typeof v==='number'?v:0}});
    });
  }
  function signIn(email,pass){
    return rawFetch(IDT+'accounts:signInWithPassword?key='+encodeURIComponent(KEY),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:email,password:pass,returnSecureToken:true})
    }).then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})});
  }
  /* Email akun: nama@pm-<departemen>.local (contoh raihan@pm-finishing.local -> nama raihan, departemen finishing).
     Ketik nama saja (raihan), "raihan@finishing", atau email lengkap. Nama saja dicoba ke tiap departemen di deptList (config.js). */
  function cands(user){user=String(user||'').trim().toLowerCase();
    if(/@.*\./.test(user))return [user];
    if(/@/.test(user)){var p=user.split('@');return [p[0]+'@pm-'+p[1].replace(/^pm-/,'')+'.local']}
    var m=rd('pmg_em')||{},L=[];if(m[user])L.push(m[user]);
    (CFG.deptList||['packaging','finishing']).forEach(function(d){var e=user+'@pm-'+d+'.local';if(L.indexOf(e)<0)L.push(e)});
    return L}
  function signInAny(user,pass){var L=cands(user),i=0,key=String(user||'').trim().toLowerCase();
    function next(){return signIn(L[i],pass).then(function(x){
      if(x.ok){if(key.indexOf('@')<0){var m=rd('pmg_em')||{};m[key]=L[i];wr('pmg_em',m)}return x}
      if(++i>=L.length)return x;
      return /INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_PASSWORD/.test((x.j.error&&x.j.error.message)||'')?next():x})}
    return next()}
  function ident(email){var m=/^([^@]+)@(.*)$/.exec(String(email||'').toLowerCase())||[];
    return {name:m[1]||'',dept:(m[2]||'').replace(/\.local$/,'').replace(/^pm-/,'')}}

  var A={mode:FB?'firebase':'pin'};
  var busy=null;

  A.ok=function(r){
    if(FB){var s=rd(SK);return !!(s&&s.role&&!expired(s)&&allow(s.role,r))}
    return !!PIN[r]&&(rd(PK)||{})[r]===PIN[r];
  };
  A.any=function(){
    if(FB){var s=rd(SK);return !!(s&&s.role&&!expired(s))}
    return A.ok('packing')||A.ok('gudang');
  };
  A.logout=function(){rm(SK);rm(PK)};
  A.user=function(){var s=rd(SK);return FB&&s&&s.name?String(s.name):''};
  A.dept=function(){var s=rd(SK);return FB&&s&&s.dept?String(s.dept):''};

  /* Foto profil: buatan otomatis (pola unik per nama pengguna) atau foto yang dipilih sendiri */
  function hash(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function ident5(n){var h=hash(String(n||'?').toLowerCase()),hue=h%360,h2=hash('x'+n),c=[];
    var bg='hsl('+hue+',55%,92%)',fg='hsl('+hue+',60%,38%)',r='';
    for(var y=0;y<5;y++)for(var x=0;x<3;x++){if((h2>>(y*3+x))&1){r+='<rect x="'+(8+x*9)+'" y="'+(8+y*9)+'" width="9" height="9"/>';if(x<2)r+='<rect x="'+(8+(4-x)*9)+'" y="'+(8+y*9)+'" width="9" height="9"/>'}}
    if(!r)r='<rect x="26" y="26" width="9" height="9"/>';
    return 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61 61"><rect width="61" height="61" fill="'+bg+'"/><g fill="'+fg+'">'+r+'</g></svg>')}
  A.foto=function(n){try{var f=localStorage.getItem('pmg_foto_'+String(n||'').toLowerCase());if(f)return f}catch(e){}return ident5(n)};
  function setFoto(n,d){try{localStorage.setItem('pmg_foto_'+String(n||'').toLowerCase(),d)}catch(e){}}
  function refreshAva(n){var u=A.foto(n);[].forEach.call(document.querySelectorAll('img[data-ava]'),function(i){i.src=u})}
  /* Popup profil (lapisan paling depan): foto, nama pengguna, departemen, Ganti foto, Keluar */
  A.profil=function(o){var old=document.getElementById('pmg-pop');if(old){old.remove();return}
    o=o||{};var n=o.name||'Pengguna',d=o.dept?String(o.dept).charAt(0).toUpperCase()+String(o.dept).slice(1):'-';
    var w=document.createElement('div');w.id='pmg-pop';w.setAttribute('role','dialog');
    w.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;background:rgba(15,23,42,.28)';
    var bs='display:block;width:100%;height:36px;border-radius:8px;border:0;font:600 12px/36px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;cursor:pointer;margin-top:8px;text-transform:uppercase;letter-spacing:.2px;';
    w.innerHTML='<div style="position:absolute;top:calc(env(safe-area-inset-top,0px) + 52px);right:12px;width:230px;max-width:calc(100vw - 24px);background:#fff;color:#0F172A;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 12px 32px -8px rgba(15,23,42,.35);padding:14px;font:400 12px/17px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;text-transform:uppercase">'
     +'<img data-ava alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #E2E8F0;display:block;margin:0 auto 8px">'
     +'<div id="pmg-pn" style="font-weight:700;font-size:14px;line-height:19px;overflow-wrap:anywhere"></div>'
     +'<div style="color:#64748B;margin-top:2px">Departemen: <b id="pmg-pd" style="color:#0F172A"></b></div>'
     +'<label style="'+bs+'background:#F1F5F9;color:#0F172A">Ganti foto<input id="pmg-pf" type="file" accept="image/*" hidden></label>'
     +'<button type="button" id="pmg-po" style="'+bs+'background:#FEF2F2;color:#DC2626">⎋ Keluar</button></div>';
    document.body.appendChild(w);w.querySelector('#pmg-pn').textContent=n;w.querySelector('#pmg-pd').textContent=d;w.querySelector('img').src=A.foto(n);
    function close(){w.remove();document.removeEventListener('keydown',esc)}
    function esc(e){if(e.key==='Escape')close()}
    document.addEventListener('keydown',esc);
    w.addEventListener('click',function(e){if(e.target===w)close()});
    (o.extra||[]).forEach(function(x){var b=document.createElement('button');b.type='button';b.textContent=x.label;b.style.cssText=bs+'background:#F1F5F9;color:#0F172A';b.onclick=function(){close();x.fn()};w.querySelector('#pmg-po').parentNode.insertBefore(b,w.querySelector('#pmg-po'))});
    w.querySelector('#pmg-po').onclick=function(){close();if(o.logout)o.logout()};
    w.querySelector('#pmg-pf').onchange=function(){var f=this.files&&this.files[0];if(!f)return;var im=new Image(),u=URL.createObjectURL(f);
      im.onload=function(){var k=Math.min(1,192/Math.max(im.width,im.height)),s=Math.min(im.width,im.height),c=document.createElement('canvas');c.width=c.height=Math.min(192,s);
        c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,c.width,c.height);URL.revokeObjectURL(u);setFoto(n,c.toDataURL('image/jpeg',.82));refreshAva(n)};
      im.onerror=function(){URL.revokeObjectURL(u)};im.src=u}};

  /* Masuk. Mengembalikan Promise {ok:true} atau {ok:false,msg:'...'} */
  A.login=function(role,user,pass){
    if(!FB){
      if(!PIN[role])return Promise.resolve({ok:false,msg:'PIN belum diatur. Hubungi admin.'});
      if(String(pass).trim()!==PIN[role])return Promise.resolve({ok:false,msg:'PIN salah.'});
      var a=rd(PK)||{};a[role]=PIN[role];wr(PK,a);
      return Promise.resolve({ok:true});
    }
    user=String(user||'').trim();
    if(!user||!pass)return Promise.resolve({ok:false,msg:'Isi nama pengguna dan kata sandi.'});
    return signInAny(user,pass).then(function(x){
      if(!x.ok)return {ok:false,msg:fail((x.j.error&&x.j.error.message)||'')};
      var j=x.j,id=ident(j.email);
      return fetchRole(j.localId,j.idToken).then(function(rr){
        if(rr.err==='rules')return {ok:false,msg:'Aturan database belum dipasang (lihat FIREBASE.md).'};
        if(rr.err)return {ok:false,msg:'Tidak bisa memeriksa akses. Coba lagi.'};
        if(!rr.role)return {ok:false,msg:'Akun ini belum diberi akses. Hubungi admin.'};
        if(!allow(rr.role,role))return {ok:false,msg:'Akun ini tidak punya akses ke aplikasi ini.'};
        return fetchPw(j.localId,j.idToken).then(function(pp){
          if(pp.err==='rules')return {ok:false,msg:'Aturan database belum dipasang (lihat FIREBASE.md).'};
          if(pp.err)return {ok:false,msg:'Tidak bisa memeriksa sandi. Coba lagi.'};
          if(!pp.at)return {ok:false,change:'first',msg:'Ini login pertama. Buat sandi baru Anda sendiri.'};
          if(Date.now()-pp.at>EXP)return {ok:false,change:'expired',msg:'Sandi sudah lebih dari 6 bulan. Buat sandi baru.'};
          wr(SK,{uid:j.localId,name:id.name||user,dept:id.dept,email:j.email||'',role:rr.role,pwAt:pp.at,idToken:j.idToken,refreshToken:j.refreshToken,exp:Date.now()+(parseInt(j.expiresIn,10)||3600)*1000});
          return {ok:true};
        });
      });
    }).catch(function(){return {ok:false,msg:'Tidak ada koneksi internet.'}});
  };

  /* Ganti sandi (sandi lama dicek ulang). Dipakai untuk login pertama, sandi kedaluwarsa, dan tombol Ganti sandi. */
  A.changePw=function(role,user,old,neu){
    if(!FB)return Promise.resolve({ok:false,msg:'Ganti sandi hanya tersedia di mode login akun.'});
    user=String(user||'').trim();old=String(old||'');neu=String(neu||'');
    if(!user||!old)return Promise.resolve({ok:false,msg:'Isi nama pengguna dan sandi lama.'});
    if(neu.length<8)return Promise.resolve({ok:false,msg:'Sandi baru minimal 8 karakter.'});
    if(!/[A-Za-z]/.test(neu)||!/\d/.test(neu))return Promise.resolve({ok:false,msg:'Sandi baru harus mengandung huruf dan angka.'});
    if(neu===old)return Promise.resolve({ok:false,msg:'Sandi baru harus berbeda dari sandi lama.'});
    return signInAny(user,old).then(function(x){
      if(!x.ok)return {ok:false,msg:fail((x.j.error&&x.j.error.message)||'')};
      var j=x.j,id=ident(j.email);
      return fetchRole(j.localId,j.idToken).then(function(rr){
        if(rr.err==='rules')return {ok:false,msg:'Aturan database belum dipasang (lihat FIREBASE.md).'};
        if(rr.err)return {ok:false,msg:'Tidak bisa memeriksa akses. Coba lagi.'};
        if(!rr.role)return {ok:false,msg:'Akun ini belum diberi akses. Hubungi admin.'};
        if(!allow(rr.role,role))return {ok:false,msg:'Akun ini tidak punya akses ke aplikasi ini.'};
        return rawFetch(IDT+'accounts:update?key='+encodeURIComponent(KEY),{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({idToken:j.idToken,password:neu,returnSecureToken:true})
        }).then(function(r){return r.json().then(function(u){return {ok:r.ok,u:u}})}).then(function(y){
          if(!y.ok)return {ok:false,msg:fail((y.u.error&&y.u.error.message)||'')};
          var u=y.u,now=Date.now();
          return rawFetch(DB+'/pw/'+j.localId+'.json?auth='+encodeURIComponent(u.idToken),{method:'PUT',body:JSON.stringify(now)}).then(function(w){
            if(!w.ok)return {ok:false,msg:'Sandi sudah diganti, tetapi aturan database "pw" belum dipasang (lihat FIREBASE.md). Hubungi admin.'};
            wr(SK,{uid:j.localId,name:id.name||user,dept:id.dept,email:j.email||'',role:rr.role,pwAt:now,idToken:u.idToken,refreshToken:u.refreshToken,exp:now+(parseInt(u.expiresIn,10)||3600)*1000});
            return {ok:true};
          });
        });
      });
    }).catch(function(){return {ok:false,msg:'Tidak ada koneksi internet.'}});
  };

  /* Token yang masih berlaku (diperbarui otomatis). null jika belum masuk. */
  A.token=function(){
    var s=rd(SK);
    if(!FB||!s)return Promise.resolve(null);
    if(Date.now()<s.exp-60000)return Promise.resolve(s.idToken);
    if(busy)return busy;
    busy=rawFetch(STS+'?key='+encodeURIComponent(KEY),{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(s.refreshToken)
    }).then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})}).then(function(x){
      if(!x.ok){
        var m=(x.j.error&&x.j.error.message)||'';
        if(/TOKEN_EXPIRED|USER_DISABLED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN/.test(m)){rm(SK);return null}
        return s.idToken;
      }
      var t=x.j.id_token;
      s.idToken=t;s.refreshToken=x.j.refresh_token||s.refreshToken;s.exp=Date.now()+(parseInt(x.j.expires_in,10)||3600)*1000;
      return fetchRole(s.uid,t).then(function(rr){
        if(!rr.err){ if(!rr.role){rm(SK);return null} s.role=rr.role }
        return fetchPw(s.uid,t).then(function(pp){
          if(!pp.err)s.pwAt=pp.at;
          wr(SK,s);return t;
        });
      });
    }).catch(function(){return s.idToken}).then(function(v){busy=null;return v});
    return busy;
  };
  window.PMG_AKSES=A;

  /* Semua permintaan ke database otomatis membawa token login */
  if(FB&&rawFetch){
    window.fetch=function(input,init){
      var u=typeof input==='string'?input:(input&&input.url)||'';
      if(typeof input==='string'&&u.indexOf(DB)===0&&u.indexOf('auth=')<0){
        return A.token().then(function(t){
          if(t)input=u+(u.indexOf('?')<0?'?':'&')+'auth='+encodeURIComponent(t);
          return rawFetch(input,init);
        });
      }
      return rawFetch(input,init);
    };
    if(window.EventSource){
      var RawES=window.EventSource;
      window.EventSource=function(url,opt){
        if(typeof url!=='string'||url.indexOf(DB)!==0||url.indexOf('auth=')>=0)return new RawES(url,opt);
        var ls={},es=null,closed=false,timer=null,self=this;
        function go(){
          if(closed)return;
          A.token().then(function(t){
            if(closed)return;
            es=new RawES(t?url+(url.indexOf('?')<0?'?':'&')+'auth='+encodeURIComponent(t):url,opt);
            Object.keys(ls).forEach(function(k){ls[k].forEach(function(f){es.addEventListener(k,f)})});
            es.addEventListener('auth_revoked',function(){es.close();go()});
            clearTimeout(timer);timer=setTimeout(function(){es.close();go()},50*60*1000);
          });
        }
        self.addEventListener=function(k,f){(ls[k]=ls[k]||[]).push(f);if(es)es.addEventListener(k,f)};
        self.close=function(){closed=true;clearTimeout(timer);if(es)es.close()};
        go();
      };
    }
  }

  /* Penjaga di app */
  var s=document.currentScript,role=s&&s.getAttribute('data-role');
  if(role){
    var out=function(){
      document.documentElement.style.visibility='hidden';
      location.replace('../?r='+role+'&n='+encodeURIComponent(location.search+location.hash));
    };
    if(!A.ok(role))out();
    else if(FB)A.token().then(function(){if(!A.ok(role))out()});
  }
})();
