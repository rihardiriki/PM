/* Penjaga akses PM Packaging (halaman depan + kedua app).
   Di app: <script src="../akses.js" data-role="packing|gudang"></script>
   Mode 1 (disarankan): login akun Firebase, aktif jika apiKey dan dbUrl di config.js terisi.
   Mode 2 (cadangan)  : PIN dari pin.js, dipakai selama apiKey belum diisi. */
(function(){
  var CFG=window.PMG_CONFIG||{}, PIN=window.PMG_PIN||{};
  var DB=(CFG.dbUrl||'').replace(/\/+$/,''), KEY=CFG.apiKey||'';
  var FB=!!(DB&&KEY), SK='pmg_auth', PK='pmg_akses';
  var IDT='https://identitytoolkit.googleapis.com/v1/', STS='https://securetoken.googleapis.com/v1/token';
  var rawFetch=window.fetch?window.fetch.bind(window):null;
  function rd(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
  function rm(k){try{localStorage.removeItem(k)}catch(e){}}
  function allow(have,want){return have==='semua'||have===want}
  function fail(code){
    if(/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_EMAIL/.test(code))return 'Nama pengguna atau kata sandi salah.';
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

  var A={mode:FB?'firebase':'pin'};
  var busy=null;

  A.ok=function(r){
    if(FB){var s=rd(SK);return !!(s&&s.role&&allow(s.role,r))}
    return !!PIN[r]&&(rd(PK)||{})[r]===PIN[r];
  };
  A.any=function(){
    if(FB){var s=rd(SK);return !!(s&&s.role)}
    return A.ok('packing')||A.ok('gudang');
  };
  A.logout=function(){rm(SK);rm(PK)};

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
    var email=/@/.test(user)?user:user.toLowerCase()+'@pm-packaging.local';
    return rawFetch(IDT+'accounts:signInWithPassword?key='+encodeURIComponent(KEY),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:email,password:pass,returnSecureToken:true})
    }).then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})}).then(function(x){
      if(!x.ok)return {ok:false,msg:fail((x.j.error&&x.j.error.message)||'')};
      var j=x.j;
      return fetchRole(j.localId,j.idToken).then(function(rr){
        if(rr.err==='rules')return {ok:false,msg:'Aturan database belum dipasang (lihat FIREBASE.md).'};
        if(rr.err)return {ok:false,msg:'Tidak bisa memeriksa akses. Coba lagi.'};
        if(!rr.role)return {ok:false,msg:'Akun ini belum diberi akses. Hubungi admin.'};
        if(!allow(rr.role,role))return {ok:false,msg:'Akun ini tidak punya akses ke aplikasi ini.'};
        wr(SK,{uid:j.localId,name:user,role:rr.role,idToken:j.idToken,refreshToken:j.refreshToken,exp:Date.now()+(parseInt(j.expiresIn,10)||3600)*1000});
        return {ok:true};
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
        wr(SK,s);return t;
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
