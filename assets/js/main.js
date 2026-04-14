'use strict';

// ══════════════════════════════════════
// CANVAS 1 — HERO: 3D sphere via pure canvas 2D projection
// ══════════════════════════════════════
(function(){
  var canvas = document.getElementById('c1');
  var ctx = canvas.getContext('2d');
  var W, H, mouseX = 0, mouseY = 0;

  function resize(){
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // 3D sphere points
  var N_SPHERE = 320;
  var sphere_pts = [];
  var phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  for(var i = 0; i < N_SPHERE; i++){
    var y = 1 - (i / (N_SPHERE - 1)) * 2;
    var r = Math.sqrt(1 - y * y);
    var theta = phi * i;
    sphere_pts.push({ ox: Math.cos(theta)*r, oy: y, oz: Math.sin(theta)*r });
  }

  // Icosahedron wireframe edges
  var ico_verts = [];
  var t = (1 + Math.sqrt(5)) / 2;
  var raw = [
    [-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],
    [0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],
    [t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]
  ];
  for(var i=0;i<raw.length;i++){
    var l=Math.sqrt(raw[i][0]*raw[i][0]+raw[i][1]*raw[i][1]+raw[i][2]*raw[i][2]);
    ico_verts.push({x:raw[i][0]/l,y:raw[i][1]/l,z:raw[i][2]/l});
  }
  var ico_edges=[[0,1],[0,5],[0,7],[0,10],[0,11],[1,5],[1,7],[1,8],[1,9],[2,3],[2,4],[2,6],[2,10],[2,11],[3,4],[3,6],[3,8],[3,9],[4,5],[4,9],[4,11],[5,9],[5,11],[6,7],[6,8],[6,10],[7,8],[7,10],[8,9],[10,11]];

  // Orbit rings (3D circles)
  function ringPts(radius, tiltX, tiltY, N){
    var pts=[];
    for(var i=0;i<N;i++){
      var a = (i/N)*Math.PI*2;
      var x = Math.cos(a)*radius, y = Math.sin(a)*radius, z = 0;
      // tilt around X
      var y2 = y*Math.cos(tiltX)-z*Math.sin(tiltX);
      var z2 = y*Math.sin(tiltX)+z*Math.cos(tiltX);
      // tilt around Y
      var x3 = x*Math.cos(tiltY)+z2*Math.sin(tiltY);
      var z3 = -x*Math.sin(tiltY)+z2*Math.cos(tiltY);
      pts.push({x:x3,y:y2,z:z3});
    }
    return pts;
  }

  // Background particles
  var BG_N = 120;
  var bgPts = [];
  for(var i=0;i<BG_N;i++){
    bgPts.push({
      x:Math.random(),y:Math.random(),
      vx:(Math.random()-0.5)*0.0003,
      vy:(Math.random()-0.5)*0.0003,
      r:Math.random()*1.5+0.4,
      a:Math.random()*0.4+0.1,
      p:Math.random()*Math.PI*2
    });
  }

  var rotX=0,rotY=0,tRotX=0,tRotY=0;
  document.addEventListener('mousemove',function(e){
    tRotY=(e.clientX/window.innerWidth-0.5)*1.2;
    tRotX=(e.clientY/window.innerHeight-0.5)*0.8;
  });

  var t=0;
  // Sphere center offset (right side)
  var SX_FRAC = 0.72; // fraction of W
  var SY_FRAC = 0.5;
  var SR = 180; // sphere radius px

  // Project 3D → 2D
  function project(x,y,z,rx,ry){
    // rotate Y
    var x1 = x*Math.cos(ry)+z*Math.sin(ry);
    var z1 = -x*Math.sin(ry)+z*Math.cos(ry);
    // rotate X
    var y2 = y*Math.cos(rx)-z1*Math.sin(rx);
    var z2 = y*Math.sin(rx)+z1*Math.cos(rx);
    var fov=500, scale=fov/(fov+z2+2);
    return { px: x1*scale, py: y2*scale, z:z2, alpha: (z2+1)*0.5 };
  }

  function draw(){
    requestAnimationFrame(draw);
    t+=0.006;
    rotX+=(tRotX-rotX)*0.05;
    rotY+=(tRotY-rotY)*0.05;

    ctx.clearRect(0,0,W,H);

    var cx = W*SX_FRAC, cy = H*SY_FRAC;
    var autoY = rotY + t*0.25;
    var autoX = rotX + Math.sin(t*0.3)*0.15;

    // Background grid
    ctx.strokeStyle='rgba(212,255,0,0.025)';
    ctx.lineWidth=1;
    var gsz=70;
    for(var x=0;x<W;x+=gsz){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(var y=0;y<H;y+=gsz){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    // BG particles (left area)
    bgPts.forEach(function(p){
      p.x+=p.vx;p.y+=p.vy;p.p+=0.012;
      if(p.x<0)p.x=1;if(p.x>1)p.x=0;
      if(p.y<0)p.y=1;if(p.y>1)p.y=0;
      var ax=p.x*W*0.55, ay=p.y*H;
      var a=p.a*(0.5+0.5*Math.sin(p.p));
      ctx.beginPath();ctx.arc(ax,ay,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(212,255,0,'+a+')';ctx.fill();
    });

    // Ambient glow behind sphere
    var grd=ctx.createRadialGradient(cx,cy,0,cx,cy,SR*1.4);
    grd.addColorStop(0,'rgba(212,255,0,0.04)');
    grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd;ctx.beginPath();ctx.arc(cx,cy,SR*1.4,0,Math.PI*2);ctx.fill();

    // Wireframe icosahedron
    ico_edges.forEach(function(e){
      var a=ico_verts[e[0]], b=ico_verts[e[1]];
      var pa=project(a.x,a.y,a.z,autoX,autoY);
      var pb=project(b.x,b.y,b.z,autoX,autoY);
      var alpha=Math.max(0,Math.min(0.22,(pa.alpha+pb.alpha)*0.08));
      ctx.strokeStyle='rgba(212,255,0,'+alpha+')';
      ctx.lineWidth=0.8;
      ctx.beginPath();
      ctx.moveTo(cx+pa.px*SR,cy+pa.py*SR);
      ctx.lineTo(cx+pb.px*SR,cy+pb.py*SR);
      ctx.stroke();
    });

    // Sphere dots
    sphere_pts.forEach(function(p){
      var pr=project(p.ox,p.oy,p.oz,autoX,autoY);
      if(pr.z < -0.3) return;
      var a=0.15+pr.alpha*0.6;
      var r=0.8+pr.alpha*1.8;
      ctx.beginPath();ctx.arc(cx+pr.px*SR,cy+pr.py*SR,r,0,Math.PI*2);
      ctx.fillStyle='rgba(212,255,0,'+a+')';ctx.fill();
    });

    // Orbit rings
    var rings=[
      {pts:ringPts(1.3,0.5+t*0.3,t*0.2,80),color:'212,255,0',op:0.25},
      {pts:ringPts(1.5,1.0+t*0.2,t*0.35+1.0,80),color:'0,212,255',op:0.18},
      {pts:ringPts(1.7,0.3,t*0.15+2.0,80),color:'255,60,90',op:0.13},
    ];
    rings.forEach(function(ring){
      for(var i=0;i<ring.pts.length;i++){
        var a=ring.pts[i], b=ring.pts[(i+1)%ring.pts.length];
        var pa=project(a.x,a.y,a.z,autoX,autoY);
        var pb=project(b.x,b.y,b.z,autoX,autoY);
        var vis=Math.max(0,(pa.alpha+pb.alpha)*0.5);
        ctx.strokeStyle='rgba('+ring.color+','+(ring.op*vis)+')';
        ctx.lineWidth=1.2;
        ctx.beginPath();
        ctx.moveTo(cx+pa.px*SR,cy+pa.py*SR);
        ctx.lineTo(cx+pb.px*SR,cy+pb.py*SR);
        ctx.stroke();
      }
    });

    // Traveling data dots on rings
    var tp=((t*0.8)%1);
    rings.forEach(function(ring,ri){
      var idx=Math.floor(((tp+ri*0.33)%1)*ring.pts.length);
      var p=ring.pts[idx];
      var pr=project(p.x,p.y,p.z,autoX,autoY);
      ctx.beginPath();ctx.arc(cx+pr.px*SR,cy+pr.py*SR,3,0,Math.PI*2);
      ctx.fillStyle=ri===0?'rgba(212,255,0,0.9)':ri===1?'rgba(0,212,255,0.9)':'rgba(255,60,90,0.9)';
      ctx.fill();
      // glow
      var gr2=ctx.createRadialGradient(cx+pr.px*SR,cy+pr.py*SR,0,cx+pr.px*SR,cy+pr.py*SR,10);
      gr2.addColorStop(0,ri===0?'rgba(212,255,0,0.3)':ri===1?'rgba(0,212,255,0.2)':'rgba(255,60,90,0.2)');
      gr2.addColorStop(1,'transparent');
      ctx.fillStyle=gr2;ctx.beginPath();ctx.arc(cx+pr.px*SR,cy+pr.py*SR,10,0,Math.PI*2);ctx.fill();
    });

    // Inner pulsing glow core
    var core=ctx.createRadialGradient(cx,cy,0,cx,cy,SR*0.5);
    var ca=(0.03+0.02*Math.sin(t*2));
    core.addColorStop(0,'rgba(212,255,0,'+ca+')');
    core.addColorStop(1,'transparent');
    ctx.fillStyle=core;ctx.beginPath();ctx.arc(cx,cy,SR*0.5,0,Math.PI*2);ctx.fill();
  }
  draw();
})();

// ══════════════════════════════════════
// TERMINAL LOG
// ══════════════════════════════════════
(function(){
  var body = document.getElementById('tbody');
  var logs = [
    {tag:'bl',l:'SCAN', m:'Block <span class="bc">21,847,391</span> — <span class="v">4,891 txns</span>'},
    {tag:'g', l:'GRAPH',m:'Edge: <span class="bc">0x7a2f&#8230;</span> &#8594; <span class="bc">0x3d19&#8230;</span> [<span class="v">0.94</span>]'},
    {tag:'g', l:'DETECT',m:'Cluster &#937;-7 — <span class="v">14 wallets</span> coordinated entry'},
    {tag:'rd',l:'SIGNAL',m:'Anomaly X scored <span class="rc">91</span> — conviction HIGH'},
    {tag:'bl',l:'SCAN', m:'Wallet <span class="bc">0x9f4a&#8230;</span> — <span class="v">12x</span> position surge'},
    {tag:'g', l:'EXEC', m:'Threshold met [<span class="v">87/100</span>] — evaluating&#8230;'},
    {tag:'g', l:'TG',   m:'Alert dispatched <span class="v">in 0.08s</span> &#10003;'},
    {tag:'bl',l:'GRAPH',m:'Path: <span class="bc">0xb21c&#8230;</span> &#8596; <span class="bc">0x7a2f&#8230;</span> 3-hop'},
    {tag:'bl',l:'SCAN', m:'Block <span class="bc">21,847,392</span> — indexing&#8230;'},
    {tag:'g', l:'DETECT',m:'Fingerprint match: <span class="bc">0x44cc&#8230;</span> smart$'},
    {tag:'rd',l:'SIGNAL',m:'Pattern &#936; — volume rank <span class="rc">TOP 2%</span>'},
    {tag:'g', l:'TG',   m:'SIG-2901 delivered <span class="v">0.12s</span> &#10003;'},
    {tag:'g', l:'GRAPH',m:'Cluster &#937;-7 +3 edges — density <span class="v">&#8593;</span>'},
    {tag:'rd',l:'SIGNAL',m:'Dormant <span class="bc">0x12e7&#8230;</span> reactivated 48h'},
    {tag:'g', l:'EXEC', m:'Conviction <span class="v">87</span>&#8594;<span class="v">89</span> rising'},
  ];
  var idx=0, visible=[], now=new Date();
  function ts(){ now=new Date(now.getTime()+1300); return now.toTimeString().slice(0,8); }
  function add(){
    var e=logs[idx%logs.length]; idx++;
    var el=document.createElement('div');
    el.className='tline';
    el.innerHTML='<span class="tt">'+ts()+'</span><span class="ttag '+e.tag+'">'+e.l+'</span><span class="tm">'+e.m+'</span>';
    body.appendChild(el);
    visible.push(el);
    if(visible.length>9){ var old=visible.shift(); old.style.opacity='0'; setTimeout(function(){if(old.parentNode)old.parentNode.removeChild(old);},250); }
    setTimeout(function(){el.classList.add('on');},20);
  }
  for(var i=0;i<7;i++) (function(i){setTimeout(function(){add();},i*110);})(i);
  setInterval(add,1800);
})();

// ══════════════════════════════════════
// CANVAS 2 — HOW: particle mesh
// ══════════════════════════════════════
(function(){
  var canvas=document.getElementById('c2');
  var ctx=canvas.getContext('2d');
  var W,H,pts=[];
  function resize(){ W=canvas.width=canvas.offsetWidth; H=canvas.height=canvas.offsetHeight; }
  function init(){
    resize(); pts=[];
    var n=Math.floor(W*H/9000)+30;
    for(var i=0;i<n;i++) pts.push({
      x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-0.5)*0.28,vy:(Math.random()-0.5)*0.28,
      r:Math.random()*1.4+0.4,a:Math.random()*0.35+0.1,p:Math.random()*Math.PI*2
    });
  }
  init(); window.addEventListener('resize',init);
  function draw(){
    requestAnimationFrame(draw);
    ctx.clearRect(0,0,W,H);
    // grid
    ctx.strokeStyle='rgba(212,255,0,0.022)';ctx.lineWidth=1;
    var sz=65;
    for(var x=0;x<W;x+=sz){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(var y=0;y<H;y+=sz){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    pts.forEach(function(p){
      p.x+=p.vx;p.y+=p.vy;p.p+=0.01;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      var a=p.a*(0.5+0.5*Math.sin(p.p));
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(212,255,0,'+a+')';ctx.fill();
    });
    for(var i=0;i<pts.length;i++){
      for(var j=i+1;j<pts.length;j++){
        var dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<90){
          ctx.strokeStyle='rgba(212,255,0,'+(0.07*(1-d/90))+')';
          ctx.lineWidth=0.5;
          ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke();
        }
      }
    }
  }
  draw();
})();

// ══════════════════════════════════════
// CANVAS 3 — CTA: spinning vortex rings (pure canvas 3D)
// ══════════════════════════════════════
(function(){
  var canvas=document.getElementById('c3');
  var ctx=canvas.getContext('2d');
  var W,H;
  function resize(){ W=canvas.width=canvas.offsetWidth; H=canvas.height=canvas.offsetHeight; }
  resize(); window.addEventListener('resize',resize);

  var mouseX=0,mouseY=0;
  document.addEventListener('mousemove',function(e){
    mouseX=(e.clientX/window.innerWidth-0.5);
    mouseY=(e.clientY/window.innerHeight-0.5);
  });

  // rings definition
  var rings=[];
  var colors=['212,255,0','0,212,255','255,60,90'];
  for(var i=0;i<16;i++){
    var r=0.3+i*0.22;
    rings.push({
      r:r, N:60+i*4,
      tiltX: Math.random()*Math.PI,
      tiltY: Math.random()*Math.PI,
      speedX:(Math.random()-0.5)*0.012,
      speedY:(Math.random()-0.5)*0.009,
      color:colors[i%3],
      op:Math.max(0.04,0.32-i*0.018),
      phase:Math.random()*Math.PI*2
    });
  }

  // background particles
  var bpts=[];
  for(var i=0;i<200;i++){
    var angle=Math.random()*Math.PI*2;
    var rad=0.3+Math.random()*3.5;
    bpts.push({angle:angle,rad:rad,y:(Math.random()-0.5)*4,speed:(Math.random()-0.5)*0.006,vy:(Math.random()-0.5)*0.003});
  }

  function project3(x,y,z,rx,ry){
    var y2=y*Math.cos(rx)-z*Math.sin(rx);
    var z2=y*Math.sin(rx)+z*Math.cos(rx);
    var x3=x*Math.cos(ry)+z2*Math.sin(ry);
    var z3=-x*Math.sin(ry)+z2*Math.cos(ry);
    var fov=600,sc=fov/(fov+z3+4);
    return {px:x3*sc,py:y2*sc,z:z3};
  }

  var t=0;
  var SCALE=Math.min(window.innerWidth,window.innerHeight)*0.22;

  function draw(){
    requestAnimationFrame(draw);
    t+=0.008;
    SCALE=Math.min(W,H)*0.22;

    ctx.clearRect(0,0,W,H);
    var cx=W/2,cy=H/2;
    var globalRX=mouseY*0.6,globalRY=mouseX*0.8+t*0.15;

    // ambient glow
    var grd=ctx.createRadialGradient(cx,cy,0,cx,cy,SCALE*3);
    grd.addColorStop(0,'rgba(212,255,0,0.03)');
    grd.addColorStop(0.5,'rgba(0,212,255,0.015)');
    grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);

    // bg particles
    bpts.forEach(function(p){
      p.angle+=p.speed;p.y+=p.vy;
      if(p.y>2.5)p.y=-2.5;if(p.y<-2.5)p.y=2.5;
      var x3d=Math.cos(p.angle)*p.rad, z3d=Math.sin(p.angle)*p.rad;
      var pr=project3(x3d,p.y,z3d,globalRX,globalRY);
      var a=Math.max(0,Math.min(0.4,(pr.z+4)*0.05));
      ctx.beginPath();ctx.arc(cx+pr.px*SCALE,cy+pr.py*SCALE,1.2,0,Math.PI*2);
      ctx.fillStyle='rgba(212,255,0,'+a+')';ctx.fill();
    });

    // rings
    rings.forEach(function(ring,ri){
      ring.tiltX+=ring.speedX;
      ring.tiltY+=ring.speedY;
      var pulse=ring.op*(0.6+0.4*Math.sin(t*1.3+ring.phase));
      var pts3=[];
      for(var i=0;i<ring.N;i++){
        var a=(i/ring.N)*Math.PI*2;
        var x=Math.cos(a)*ring.r, y=Math.sin(a)*ring.r, z=0;
        var y2=y*Math.cos(ring.tiltX)-z*Math.sin(ring.tiltX);
        var z2=y*Math.sin(ring.tiltX)+z*Math.cos(ring.tiltX);
        var x3=x*Math.cos(ring.tiltY)+z2*Math.sin(ring.tiltY);
        var z3=-x*Math.sin(ring.tiltY)+z2*Math.cos(ring.tiltY);
        var pr=project3(x3,y2,z3,globalRX,globalRY);
        pts3.push(pr);
      }
      ctx.beginPath();
      ctx.moveTo(cx+pts3[0].px*SCALE,cy+pts3[0].py*SCALE);
      for(var i=1;i<pts3.length;i++){
        ctx.lineTo(cx+pts3[i].px*SCALE,cy+pts3[i].py*SCALE);
      }
      ctx.closePath();
      ctx.strokeStyle='rgba('+ring.color+','+pulse+')';
      ctx.lineWidth=1;ctx.stroke();

      // traveling dot
      var di=Math.floor(((t*0.5+ri*0.2)%1)*ring.N);
      var dp=pts3[di];
      ctx.beginPath();ctx.arc(cx+dp.px*SCALE,cy+dp.py*SCALE,2.5,0,Math.PI*2);
      ctx.fillStyle='rgba('+ring.color+',0.85)';ctx.fill();
    });
  }
  draw();
})();

// ══════════════════════════════════════
// SCROLL REVEAL
// ══════════════════════════════════════
(function(){
  var els=document.querySelectorAll('.rv');
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('on');obs.unobserve(e.target);}
    });
  },{threshold:0.1});
  els.forEach(function(el){obs.observe(el);});
})();
