(()=>{
const $=s=>document.querySelector(s);
$('#year').textContent=new Date().getFullYear();

/* ---------- 3D hero: refractive glass knot ---------- */
function scene3d(){
  const canvas=$('#scene'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let r;
  try{r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});}catch(e){return}
  r.setPixelRatio(Math.min(devicePixelRatio,2));
  r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.15;
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(38,1,.1,100);cam.position.z=8;
  // studio-light environment so glass has something to reflect
  const env=new THREE.Scene();
  const panel=(c,i,x,y,z,w,h)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i),side:2}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m)};
  panel(0xffffff,8,5,6,4,6,3);panel(0x9db4ff,5,-6,2,3,4,7);panel(0xffb38a,3,0,-5,5,9,2);panel(0x1a2650,1,0,0,-9,24,24);
  scene.environment=new THREE.PMREMGenerator(r).fromScene(env,.04).texture;
  // glowing shapes behind the glass for refraction detail
  const glow=new THREE.Group();
  [[0x9db4ff,-1.6,.8],[0xff9d7a,1.4,-.9],[0x7dffe0,.2,1.5]].forEach(([c,x,y])=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(.32,32,32),new THREE.MeshBasicMaterial({color:c}));m.position.set(x,y,-1.8);glow.add(m)});
  scene.add(glow);
  const knot=new THREE.Mesh(new THREE.TorusKnotGeometry(1.15,.4,256,48,2,3),
    new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.04,metalness:0,transmission:1,thickness:1.6,ior:1.5,clearcoat:1,clearcoatRoughness:0,attenuationColor:new THREE.Color(0x9db4ff),attenuationDistance:3,envMapIntensity:1.4}));
  scene.add(knot);
  const mouse={x:0,y:0},cur={x:0,y:0};let spin=0,visible=true;
  addEventListener('pointermove',e=>{mouse.x=e.clientX/innerWidth*2-1;mouse.y=e.clientY/innerHeight*2-1});
  canvas.addEventListener('pointerdown',()=>{spin=.25});
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible)loop()});
  function size(){const w=innerWidth,h=innerHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();knot.position.x=w/h>1.1?2.3:0;knot.position.y=w/h>1.1?0:1.6;glow.position.copy(knot.position)}
  addEventListener('resize',size);size();
  function loop(){
    if(!visible)return;
    cur.x+=(mouse.x-cur.x)*.05;cur.y+=(mouse.y-cur.y)*.05;
    const t=performance.now()/1000;
    spin*=.96;
    knot.rotation.set(cur.y*.6+t*.12,cur.x*.8+t*.18+spin*t,0);
    glow.rotation.y=t*.4;
    const s=1-Math.min(scrollY/innerHeight,1)*.35;knot.scale.setScalar(s);
    r.render(scene,cam);
    if(!reduce)requestAnimationFrame(loop);
  }
  loop();
}
addEventListener('load',()=>{try{scene3d()}catch(e){console.warn('3D unavailable',e)}});

/* ---------- Workspace (Supabase: real login, private storage) ---------- */
const cfg=window.CONFIG||{},BUCKET='files';
const gate=$('#gate'),space=$('#space'),msg=$('#gate-msg');
let sb=null,uid=null;
const fmt=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round((n||0)/1024))+' KB';
function show(user){uid=user.id;gate.hidden=true;space.hidden=false;renderLinks();renderFiles()}
function hide(){uid=null;space.hidden=true;gate.hidden=false;$('#link-list').innerHTML='';$('#file-list').innerHTML=''}
if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||!window.supabase){
  msg.textContent='Workspace not connected yet. Follow the setup steps in README.md.';
  $('#gate-btn').disabled=true;
}else{
  sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  sb.auth.getSession().then(({data})=>{if(data.session)show(data.session.user)});
  sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT')hide()});
}
$('#gate-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!sb)return;msg.textContent='';
  const {data,error}=await sb.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#pass').value});
  $('#pass').value='';
  if(error){msg.textContent='Sign-in failed. Check your email and password.';return}
  show(data.user);
});
$('#lock').addEventListener('click',()=>sb&&sb.auth.signOut());

document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
  $('#tab-links').hidden=b.dataset.tab!=='links';$('#tab-files').hidden=b.dataset.tab!=='files';
}));

/* links */
async function renderLinks(){
  const ul=$('#link-list');ul.innerHTML='';
  const {data,error}=await sb.from('links').select('id,title,url').order('created_at',{ascending:false});
  if(error){ul.textContent='Could not load links.';return}
  data.forEach(l=>{
    const li=document.createElement('li'),a=document.createElement('a'),d=document.createElement('button');
    a.href=l.url;a.textContent=l.title;a.target='_blank';a.rel='noopener noreferrer';
    d.textContent='Remove';d.onclick=async()=>{await sb.from('links').delete().eq('id',l.id);renderLinks()};
    li.append(a,d);ul.append(li);
  });
}
$('#link-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const url=$('#l-url').value.trim();
  if(!/^https?:\/\//i.test(url))return;
  const {error}=await sb.from('links').insert({title:$('#l-title').value.trim(),url});
  if(error){alert('Could not save the link.');return}
  e.target.reset();renderLinks();
});

/* files (private Supabase Storage, one folder per user) */
async function renderFiles(){
  const ul=$('#file-list');ul.innerHTML='';
  const {data,error}=await sb.storage.from(BUCKET).list(uid,{limit:200,sortBy:{column:'created_at',order:'desc'}});
  if(error){ul.textContent='Could not load files.';return}
  data.filter(f=>f.id).forEach(f=>{
    const name=f.name.replace(/^\d+-/,''),path=uid+'/'+f.name;
    const li=document.createElement('li'),span=document.createElement('span'),sm=document.createElement('small'),box=document.createElement('span'),dl=document.createElement('button'),del=document.createElement('button');
    sm.textContent=fmt(f.metadata&&f.metadata.size);span.append(name+' ',sm);
    dl.textContent='Download';dl.onclick=async()=>{
      const {data:s,error:er}=await sb.storage.from(BUCKET).createSignedUrl(path,60,{download:name});
      if(er){alert('Could not download.');return}
      location.href=s.signedUrl;
    };
    del.textContent='Delete';del.onclick=async()=>{await sb.storage.from(BUCKET).remove([path]);renderFiles()};
    box.append(dl,' ',del);li.append(span,box);ul.append(li);
  });
}
async function addFiles(list){
  for(const f of list){
    const path=uid+'/'+Date.now()+'-'+f.name.replace(/[^\w.\-]+/g,'_');
    const {error}=await sb.storage.from(BUCKET).upload(path,f);
    if(error)alert('Could not upload '+f.name+': '+error.message);
  }
  renderFiles();
}
$('#file-in').addEventListener('change',e=>{if(uid)addFiles(e.target.files);e.target.value=''});
const drop=$('#drop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>{if(uid)addFiles(e.dataTransfer.files)});
})();
