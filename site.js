(()=>{
const $=s=>document.querySelector(s),still=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#year').textContent=new Date().getFullYear();
const IMGS=Array.from({length:20},(_,i)=>'images/p'+String(i+1).padStart(2,'0')+'.jpg');
$('#tot').textContent=IMGS.length;

/* loader tied to real image loading */
const ld=$('#loader'),cnt=$('#count');let loaded=0,done=false;
function finish(){if(done)return;done=true;ld.classList.add('done');document.body.classList.add('ready');setTimeout(()=>ld.remove(),900)}
function prog(){cnt.textContent=Math.round(loaded/IMGS.length*100);if(loaded>=IMGS.length)setTimeout(finish,300)}
setTimeout(finish,8000);

/* lightbox */
const lb=$('#lb');
function openLb(i){const im=lb.querySelector('img');im.src=IMGS[i];im.alt='Image '+(i+1)+' of '+IMGS.length;lb.hidden=false}
lb.addEventListener('click',()=>lb.hidden=true);
addEventListener('keydown',e=>{if(e.key==='Escape')lb.hidden=true});

/* 3D world: a ring of curved image panels around the viewer, in drifting dust */
function world(){
  const canvas=$('#scene'),r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  r.setPixelRatio(Math.min(devicePixelRatio,1.75));r.setClearColor(0x000000,0);
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(55,1,.1,200),R=10,N=IMGS.length,ring=new THREE.Group();scene.add(ring);
  const vs='uniform float uVel,uR;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.z+=uR-sqrt(uR*uR-p.x*p.x);p.z+=sin(uv.x*3.14159)*uVel*1.4;p.y+=(uv.x-.5)*uVel*.8;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}';
  const fs='uniform sampler2D uTex;uniform float uVel,uHover,uLoaded,uAspect,uFade;varying vec2 vUv;void main(){float pa=.75;vec2 k=vec2(1.);if(uAspect>pa)k.x=pa/uAspect;else k.y=uAspect/pa;vec2 uv=(vUv-.5)*k+.5;float s=uVel*.025;vec3 c=vec3(texture2D(uTex,uv+vec2(s,0.)).r,texture2D(uTex,uv).g,texture2D(uTex,uv-vec2(s,0.)).b);c*=mix(.6,1.,uHover)*uFade;c=mix(vec3(.06,.07,.11),c,uLoaded);gl_FragColor=vec4(c,1.);}';
  const meshes=IMGS.map((src,i)=>{
    const mat=new THREE.ShaderMaterial({vertexShader:vs,fragmentShader:fs,side:THREE.DoubleSide,uniforms:{uTex:{value:null},uVel:{value:0},uR:{value:R},uHover:{value:0},uLoaded:{value:0},uAspect:{value:.75},uFade:{value:1}}});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(2.6,3.47,20,1),mat),th=i/N*Math.PI*2;
    m.position.set(R*Math.sin(th),0,-R*Math.cos(th));ring.add(m);m.lookAt(0,0,0);m.userData.i=i;
    new THREE.TextureLoader().load(src,t=>{mat.uniforms.uTex.value=t;mat.uniforms.uAspect.value=t.image.width/t.image.height;mat.uniforms.uLoaded.value=1;loaded++;prog()},undefined,()=>{loaded++;prog()});
    return m;
  });
  const n=2400,pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){const d=4+Math.pow(Math.random(),.6)*56,a=Math.random()*6.283,b=Math.acos(2*Math.random()-1);pos.set([d*Math.sin(b)*Math.cos(a),d*Math.cos(b)*.7,d*Math.sin(b)*Math.sin(a)],i*3)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const dust=new THREE.Points(g,new THREE.PointsMaterial({size:.07,color:0xbfd0ff,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(dust);

  let ang=0,vel=0,bend=0,drag=null,hov=-1,front=0,over=false;const mouse={x:0,y:0},cs={x:0,y:0},ray=new THREE.Raycaster(),v=new THREE.Vector3();
  const zone=e=>e.target.closest&&e.target.closest('.hero,#explore');
  addEventListener('pointermove',e=>{mouse.x=e.clientX/innerWidth*2-1;mouse.y=e.clientY/innerHeight*2-1;over=!!zone(e);
    if(drag){const dx=e.clientX-drag.x;drag.x=e.clientX;drag.m+=Math.abs(dx);vel=dx*.0035}});
  addEventListener('pointerdown',e=>{if(zone(e))drag={x:e.clientX,m:0}});
  addEventListener('pointerup',()=>{if(drag&&drag.m<6&&hov>=0)openLb(hov);drag=null});
  function size(){r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.fov=cam.aspect<1?75:55;cam.updateProjectionMatrix()}
  addEventListener('resize',size);size();

  (function loop(){
    requestAnimationFrame(loop);
    if(!drag)vel*=.94;ang-=vel;if(!drag&&!still)ang+=.0011;ring.rotation.y=ang;
    bend+=(Math.max(-1,Math.min(1,vel*45))-bend)*.1;
    cam.position.z=-4.2*Math.min(scrollY/innerHeight,1.5)/1.5;
    cs.x+=(mouse.x-cs.x)*.05;cs.y+=(mouse.y-cs.y)*.05;cam.rotation.set(-cs.y*.06,-cs.x*.12,0);
    dust.rotation.y+=.0003+vel*.4;dust.position.x=-cs.x*.6;
    ray.setFromCamera({x:mouse.x,y:-mouse.y},cam);const hit=over&&!drag?ray.intersectObjects(meshes)[0]:null;hov=hit?hit.object.userData.i:-1;
    let best=-2,bi=0;
    meshes.forEach((m,i)=>{m.getWorldPosition(v);const c=-v.z/Math.hypot(v.x,v.z),u=m.material.uniforms;
      u.uVel.value=bend;u.uFade.value=.3+.7*Math.pow(Math.max(0,c),2);u.uHover.value+=((i===hov?1:0)-u.uHover.value)*.12;if(c>best){best=c;bi=i}});
    if(bi!==front){front=bi;$('#idx').textContent=String(bi+1).padStart(2,'0')}
    r.render(scene,cam);
  })();
}
addEventListener('load',()=>{try{world()}catch(e){console.warn('3D unavailable',e);finish()}});

/* cursor, word reveal */
if(matchMedia('(pointer:fine)').matches){
  const c=document.createElement('div');c.className='cur';document.body.append(c);document.body.classList.add('hascur');
  addEventListener('pointermove',e=>{c.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';c.classList.toggle('big',!!e.target.closest('a,button,#explore'))});
}
const st=document.querySelector('.statement p');
if(st){
  st.innerHTML=st.textContent.trim().split(/\s+/).map(w=>'<span class="w">'+w+'</span>').join(' ');
  const ws=st.querySelectorAll('.w'),upd=()=>{const r=st.getBoundingClientRect(),p=Math.min(1,Math.max(0,(innerHeight*.85-r.top)/(r.height+innerHeight*.3)));ws.forEach((w,i)=>w.classList.toggle('on',still||i/ws.length<p))};
  addEventListener('scroll',upd,{passive:true});upd();
}
})();
