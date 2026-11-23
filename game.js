(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const toast = document.getElementById('toast');
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a,b) => a + Math.random()*(b-a);
  let W = 960, H = 540, pixelW = 480, pixelH = 270, last = 0, toastTimer = 0;
  let state = 'title', time = 0, room = 0, cameraX = 0, shake = 0, runKills = 0, coins = 0;
  let difficulty = 'NORMAL', score = 0, worldLength = 4200, nextSpawn = 500;
  const keys = Object.create(null), input = {left:false,right:false,jump:false,attack:false,heavy:false,dash:false,guard:false,skill1:false,skill2:false,chakra:false};
  const controls = [];
  const run = {doubleJump:false, damage:1, maxHealth:100, healCharges:1, skill:'Wind Step', crit:0.08};
  const player = {x:150,y:390,vx:0,vy:0,w:30,h:47,facing:1,hp:100,chakra:100,stamina:100,onGround:false,coyote:0,jumpBuffer:0,airJumps:0,invuln:0,dashT:0,dashCD:0,dashDir:1,parryT:0,guardBreak:0,attackT:0,attackCD:0,combo:0,comboWindow:0,heavyT:0,heavyCD:0,airAttackCD:0,hitFlash:0,knock:0,anim:'idle',animT:0,flash:0,skillCD:0,skill2CD:0,charging:false};
  const terrain = [
    {x:0,y:465,w:690,h:120,kind:'ground'},{x:710,y:465,w:540,h:120,kind:'ground'},
    {x:1310,y:465,w:600,h:120,kind:'ground'},{x:1980,y:465,w:620,h:120,kind:'ground'},
    {x:2670,y:465,w:620,h:120,kind:'ground'},{x:3360,y:465,w:1000,h:120,kind:'ground'},
    {x:250,y:372,w:112,h:15,kind:'platform'},{x:455,y:315,w:128,h:15,kind:'platform'},
    {x:835,y:375,w:105,h:15,kind:'platform'},{x:1050,y:322,w:130,h:15,kind:'platform'},
    {x:1455,y:360,w:150,h:15,kind:'platform'},{x:1710,y:304,w:100,h:15,kind:'platform'},
    {x:2150,y:366,w:135,h:15,kind:'platform'},{x:2415,y:310,w:115,h:15,kind:'platform'},
    {x:2815,y:362,w:145,h:15,kind:'platform'},{x:3100,y:300,w:130,h:15,kind:'platform'},
    {x:3500,y:360,w:150,h:15,kind:'platform'},{x:3770,y:304,w:132,h:15,kind:'platform'}
  ];
  let enemies = [], projectiles = [], particles = [], texts = [], pickups = [], hazards = [];
  let roomNames = ['ASHEN GATE','BAMBOO PASS','BROKEN SHRINE','HOLLOW COURT','WINDING RIDGE'];
  const colors = {ink:'#101622',deep:'#172330',navy:'#243647',blue:'#3c6675',teal:'#72b4a0',gold:'#f3b84f',cream:'#f4ead5',red:'#e56e5b',muted:'#9aa9ad',purple:'#aa80c7'};

  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const aspect = window.innerWidth / Math.max(1,window.innerHeight);
    pixelH = 270; pixelW = Math.max(480,Math.round(pixelH*aspect));
    canvas.width = Math.round(pixelW*dpr); canvas.height = Math.round(pixelH*dpr);
    W = pixelW*2; H = 540;
    ctx.imageSmoothingEnabled = false;
    if(screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{});
  }
  window.addEventListener('resize',resize); resize();
  function toastMsg(text){toast.textContent=text;toast.classList.add('show');toastTimer=1.8;}
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
  function text(str,x,y,size,color=colors.cream,align='left',weight=700){ctx.font=`${weight} ${size}px ui-sans-serif,system-ui,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(str,x,y);}
  function rounded(x,y,w,h,r,fill,stroke=null){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
  function worldToScreen(x){return x-cameraX;}

  function startRun(){
    state='playing'; time=0; room=0; cameraX=0; score=0; runKills=0; coins=0;
    player.x=150;player.y=418;player.vx=player.vy=0;player.hp=run.maxHealth;player.chakra=100;player.stamina=100;player.onGround=false;player.airJumps=0;player.invuln=0;player.dashCD=0;player.combo=0;player.comboWindow=0;player.attackCD=0;player.heavyCD=0;player.skillCD=player.skill2CD=0;
    enemies=[];projectiles=[];particles=[];texts=[];pickups=[];hazards=[];
    spawnEnemy(440,'scout');spawnEnemy(625,'blade');spawnEnemy(880,'thrower');spawnEnemy(1160,'scout');spawnEnemy(1510,'blade');spawnEnemy(1840,'thrower');spawnEnemy(2160,'scout');spawnEnemy(2420,'blade');spawnEnemy(2780,'thrower');spawnEnemy(3140,'elite');spawnEnemy(3590,'blade');
    nextSpawn=4200;toastMsg('Mission started • clear the route');
  }
  function spawnEnemy(x,type='scout',boss=false){
    const stats={scout:[42,10,120,190],blade:[64,14,140,225],thrower:[38,9,230,340],elite:[130,19,145,250],boss:[680,28,185,310]};
    const s=stats[type]||stats.scout;
    enemies.push({x,y:418,w: type==='boss'?68:type==='elite'?42:30,h:type==='boss'?76:type==='elite'?58:43,hp:s[0],maxHp:s[0],damage:s[1],speed:s[2],range:s[3],type,boss,face:-1,cd:rand(.8,1.8),state:'approach',timer:0,flash:0,stun:0,attack:0,wind:0,dead:false,attackKind:'',vx:0,groundY:465});
  }
  function particle(x,y,color,n=8,scale=1){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-130,130),vy:rand(-210,60),life:rand(.2,.6),max:.6,color,size:rand(2,5)*scale});}
  function floatText(x,y,value,color=colors.cream){texts.push({x,y,value:String(value),life:.8,vy:-35,color});}
  function dropLoot(x,y){pickups.push({x,y,vx:rand(-60,60),vy:-150,type:Math.random()<.25?'heal':'coin',life:18});}
  function hurtEnemy(e,dmg,knock=150,kind='physical'){
    if(e.dead)return;
    const crit=Math.random()<run.crit; if(crit)dmg=Math.round(dmg*1.7);
    e.hp-=dmg;e.flash=.13;e.stun=e.boss?Math.max(e.stun,.12):.28;e.vx=knock*player.facing;
    floatText(e.x,e.y-35,crit?`${dmg}!`:dmg,crit?colors.gold:colors.cream);
    particle(e.x,e.y-20,kind==='fire'?colors.red:colors.gold,6,.7);shake=Math.max(shake,crit?5:2);
    if(e.hp<=0){e.dead=true;runKills++;score+=e.boss?500:100;dropLoot(e.x,e.y-20);particle(e.x,e.y-20,colors.red,18,1.2);}
  }
  function takeDamage(dmg,sourceX,kind='physical',force=220){
    if(player.invuln>0||state!=='playing')return;
    if(player.parryT>0){player.parryT=0;player.stamina=Math.min(100,player.stamina+15);player.chakra=Math.min(100,player.chakra+5);player.invuln=.28;shake=3;particle(player.x+15,player.y-24,colors.teal,16,1.2);floatText(player.x,player.y-65,'PARRY!',colors.teal);enemies.forEach(e=>{if(Math.abs(e.x-player.x)<180&&!e.dead){e.stun=Math.max(e.stun,.85);e.wind=0;}});toastMsg('Perfect parry');return;}
    if(player.guard && player.stamina>0 && !['explosive','fire'].includes(kind)){
      dmg=Math.max(1,Math.round(dmg*.3));force*=.25;
    }
    player.hp=Math.max(0,player.hp-dmg);player.invuln=.48;player.hitFlash=.18;player.vx+=(player.x<sourceX?-force:force);player.vy=-90;shake=6;particle(player.x+15,player.y-20,colors.red,10,1);floatText(player.x,player.y-55,`-${dmg}`,colors.red);
    if(player.hp<=0){state='dead';toastMsg('The mission has ended');}
  }
  function inputDown(action){
    if(action==='attack'){if(player.onGround){if(player.attackCD<=.01&&player.attackT<=0)startLight();else if(player.comboWindow>0)player.queued=true;}else if(player.airAttackCD<=0)airAttack();}
    if(action==='heavy'&&player.heavyCD<=0&&player.attackT<=.05){player.heavyT=.68;player.heavyCD=.76;player.attackT=0;player.attackHit=false;player.anim='heavy';player.animT=0;player.queued=false;}
    if(action==='jump'){player.jumpBuffer=.13;}
    if(action==='dash'&&player.dashCD<=0&&player.dashT<=0&&(player.onGround||run.airDash)){ player.dashT=.3;player.dashCD=.7;player.dashDir=(input.left?-1:input.right?1:player.facing);player.invuln=Math.max(player.invuln,.16);player.attackT=0;player.heavyT=0;player.anim='dash';player.animT=0;}
    if(action==='guard'){player.parryT=.12;player.guard=true;}
    if(action==='skill1'&&player.skillCD<=0&&player.chakra>=24){player.chakra-=24;player.skillCD=3.4;player.dashT=.22;player.dashCD=Math.max(player.dashCD,.5);player.dashDir=player.facing;player.invuln=.22;player.anim='skill';particle(player.x+15,player.y-20,colors.teal,14,1.3);enemies.forEach(e=>{if(!e.dead&&Math.abs(e.x-player.x)<155&&Math.abs(e.y-player.y)<100)hurtEnemy(e,26*run.damage,210,'wind');});toastMsg('Wind step');}
    if(action==='skill2'&&player.skill2CD<=0&&player.chakra>=35){player.chakra-=35;player.skill2CD=5.5;const dir=player.facing;projectiles.push({x:player.x+15+dir*22,y:player.y-27,vx:dir*420,vy:0,damage:32*run.damage,life:1.2,side:'player',kind:'chakra',r:8});particle(player.x+15,player.y-27,colors.purple,10,1);toastMsg('Chakra crescent');}
    if(action==='chakra'){player.charging=true;}
  }
  function inputUp(action){if(action==='guard')player.guard=false;if(action==='chakra')player.charging=false;if(action==='jump'&&player.vy<-120)player.vy*=.55;}
  function startLight(){player.attackT=.35;player.attackCD=.35;player.combo=(player.combo%4)+1;player.comboWindow=.56;player.anim='attack';player.animT=0;player.attackHit=false;player.queued=false;}
  function airAttack(){player.airAttackCD=.38;player.attackT=.25;player.anim='airAttack';player.animT=0;player.attackHit=false;player.airJumps=Math.min(player.airJumps,1);}
  function tryAttack(){
    if(player.anim==='attack'&&!player.attackHit&&player.attackT<.2&&player.attackT>.08){
      player.attackHit=true;const dmg=[10,12,14,18][player.combo-1]*run.damage;
      enemies.forEach(e=>{if(!e.dead&&Math.abs(e.x-(player.x+player.facing*38))<50&&Math.abs(e.y-player.y)<62)hurtEnemy(e,dmg,player.combo===4?300:155);});
    }
    if(player.anim==='heavy'&&!player.attackHit&&player.heavyT<.43&&player.heavyT>.31){player.attackHit=true;enemies.forEach(e=>{if(!e.dead&&Math.abs(e.x-(player.x+player.facing*45))<63&&Math.abs(e.y-player.y)<70)hurtEnemy(e,25*run.damage,330);});particle(player.x+player.facing*52,player.y-22,colors.gold,12,1.2);}
    if(player.anim==='airAttack'&&!player.attackHit&&player.attackT<.2&&player.attackT>.1){player.attackHit=true;enemies.forEach(e=>{if(!e.dead&&Math.abs(e.x-(player.x+player.facing*34))<52&&Math.abs(e.y-player.y)<70)hurtEnemy(e,12*run.damage,player.vy>0?180:130);});}
  }
  function update(dt){
    time+=dt;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.classList.remove('show');}
    if(state!=='playing'){updateEffects(dt);return;}
    const p=player;
    p.animT+=dt;p.invuln=Math.max(0,p.invuln-dt);p.dashCD=Math.max(0,p.dashCD-dt);p.parryT=Math.max(0,p.parryT-dt);p.guardBreak=Math.max(0,p.guardBreak-dt);p.hitFlash=Math.max(0,p.hitFlash-dt);p.attackCD=Math.max(0,p.attackCD-dt);p.heavyCD=Math.max(0,p.heavyCD-dt);p.airAttackCD=Math.max(0,p.airAttackCD-dt);p.skillCD=Math.max(0,p.skillCD-dt);p.skill2CD=Math.max(0,p.skill2CD-dt);p.comboWindow=Math.max(0,p.comboWindow-dt);
    if(p.comboWindow===0&&p.attackT<=0)p.combo=0;
    if(p.charging&&p.chakra<100){p.chakra=Math.min(100,p.chakra+18*dt);p.vx*=Math.max(0,1-dt*7);}
    else p.chakra=Math.min(100,p.chakra+3*dt);
    if(p.guard&&p.guardBreak<=0&&p.stamina>0){p.stamina=Math.max(0,p.stamina-12*dt);p.vx*=Math.max(0,1-dt*9);if(p.stamina<=0){p.guard=false;p.guardBreak=.8;floatText(p.x,p.y-48,'GUARD BREAK',colors.red);}}
    else if(!p.guard)p.stamina=Math.min(100,p.stamina+25*dt);
    const direction=(input.right?1:0)-(input.left?1:0);
    if(direction&&p.guardBreak<=0){p.facing=direction;if(p.dashT<=0&&!p.charging){const target=direction*220,accel=p.onGround?1800:1530;p.vx+=clamp(target-p.vx,-accel*dt,accel*dt);}}
    else if(p.dashT<=0){p.vx*=Math.max(0,1-(p.onGround?14:3)*dt);if(Math.abs(p.vx)<4)p.vx=0;}
    if(p.jumpBuffer>0){p.jumpBuffer-=dt;const groundedJump=p.onGround||p.coyote>0;if((groundedJump||p.airJumps<(run.doubleJump?1:0))&&p.guardBreak<=0){p.vy=-480;p.onGround=false;p.coyote=0;p.airJumps=groundedJump?0:p.airJumps+1;p.jumpBuffer=0;p.anim='jump';p.animT=0;}}
    if(!p.onGround)p.coyote=Math.max(0,p.coyote-dt);else{p.coyote=.1;p.airJumps=0;}
    if(p.dashT>0){p.dashT=Math.max(0,p.dashT-dt);p.vx=p.dashDir*350;p.vy*=.35;if(Math.random()<.75)particle(p.x+15,p.y-22,colors.teal,1,.6);}
    else {p.vy=Math.min(650,p.vy+1200*dt);}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=clamp(p.x,0,worldLength-50);
    const wasGround=p.onGround;p.onGround=false;
    for(const t of terrain){if(p.x+26>t.x&&p.x+4<t.x+t.w&&p.y+p.h>=t.y&&p.y+p.h-p.vy*dt<=t.y&&p.vy>=0){p.y=t.y-p.h;p.vy=0;p.onGround=true;}}
    if(!p.onGround&&p.y+p.h>=465){p.y=465-p.h;p.vy=0;p.onGround=true;}
    if(p.onGround&&!wasGround){p.anim='land';p.animT=0;particle(p.x+15,465,'#a5a18e',4,.5);}
    p.anim=p.dashT>0?'dash':p.guard?'guard':p.heavyT>0?'heavy':p.attackT>0?(p.onGround?'attack':'airAttack'):!p.onGround?(p.vy<0?'jump':'fall'):Math.abs(p.vx)>25?'run':'idle';
    if(p.attackT>0){p.attackT=Math.max(0,p.attackT-dt);tryAttack();if(p.attackT===0&&p.queued)startLight();}
    if(p.heavyT>0){p.heavyT=Math.max(0,p.heavyT-dt);tryAttack();}
    if(p.queued&&p.attackT===0&&p.attackCD<=0)startLight();
    updateEnemies(dt);updateProjectiles(dt);updatePickups(dt);updateEffects(dt);
    if(p.x>worldLength-300&&!enemies.some(e=>!e.dead)){state='victory';score+=1000;toastMsg('Mission complete');}
    const goal=p.x-W*.4;cameraX=clamp(cameraX+(goal-cameraX)*Math.min(1,dt*4),0,worldLength-W);
    if(shake>0)shake=Math.max(0,shake-25*dt);
    const newRoom=Math.floor(p.x/850);if(newRoom!==room){room=newRoom;if(room===3&&!enemies.some(e=>e.boss&&!e.dead)){spawnEnemy(p.x+390,'boss',true);toastMsg('Mini-boss • The Gatekeeper');}else toastMsg(`Entered ${roomNames[room%roomNames.length]}`);}
  }
  function updateEnemies(dt){
    for(const e of enemies){if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.cd-=dt;e.timer=Math.max(0,e.timer-dt);
      if(e.stun>0){e.x+=e.vx*dt;e.vx*=Math.max(0,1-dt*7);continue;}
      const dx=player.x-e.x,dist=Math.abs(dx);e.face=dx<0?-1:1;
      if(e.attack>0){e.attack-=dt;if(e.attack<.24&&e.attack>.18){if(e.type==='thrower'||e.boss&&e.attackKind==='chakra'){projectiles.push({x:e.x+e.w/2+e.face*18,y:e.y-27,vx:e.face*(e.boss?280:245),vy:e.boss?Math.sin(time*5)*45:0,damage:e.damage,life:2,side:'enemy',kind:e.boss?'fire':'physical',r:e.boss?10:5});}else if(dist<e.range+24&&dist>12&&Math.abs(player.y-e.y)<80){takeDamage(e.damage,e.x,e.type==='elite'?'physical':'physical',e.boss?330:210);}}
        continue;
      }
      if(e.cd<=0&&dist<e.range&&Math.abs(player.y-e.y)<100){e.wind=e.type==='boss'?.65:.42;e.attack=e.type==='boss'?1:.72;e.cd=e.type==='boss'?1.65:rand(1.4,2.1);e.attackKind=e.type==='thrower'||e.boss&&Math.random()<.38?'chakra':'melee';e.state='attack';continue;}
      if(dist>e.range*.68){e.x+=e.face*e.speed*dt;e.state='approach';}
      else if(dist<70&&e.type!=='thrower'){e.x-=e.face*e.speed*.42*dt;e.state='retreat';}
      e.x=clamp(e.x,10,worldLength-20);
    }
    enemies=enemies.filter(e=>!e.dead||e.flash>0);
  }
  function updateProjectiles(dt){
    for(const b of projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(b.side==='enemy'&&Math.abs(b.x-(player.x+15))<22&&Math.abs(b.y-(player.y-22))<29){takeDamage(b.damage,b.x,b.kind,170);b.life=0;particle(b.x,b.y,colors.red,6,.7);}
      if(b.side==='player'){for(const e of enemies){if(!e.dead&&Math.abs(b.x-e.x-e.w/2)<e.w/2+8&&Math.abs(b.y-(e.y-23))<e.h/2){hurtEnemy(e,b.damage,220,'wind');b.life=0;break;}}}
      if(b.life<=0&&b.side==='enemy'&&b.x>cameraX-100&&b.x<cameraX+W+100)particle(b.x,b.y,b.kind==='fire'?colors.red:colors.teal,3,.6);
    }
    projectiles=projectiles.filter(b=>b.life>0);
  }
  function updatePickups(dt){
    for(const o of pickups){o.life-=dt;o.vy+=480*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;if(o.y>420){o.y=420;o.vy=0;o.vx*=.8;}
      if(Math.abs(o.x-player.x)<32&&Math.abs(o.y-(player.y-15))<55){if(o.type==='coin'){coins+=5;score+=25;}else{player.hp=Math.min(run.maxHealth,player.hp+22);toastMsg('Recovery orb +22');}o.life=0;particle(o.x,o.y,o.type==='coin'?colors.gold:colors.teal,8,.7);}
    }pickups=pickups.filter(o=>o.life>0);
  }
  function updateEffects(dt){
    particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.vx*=Math.max(0,1-dt*1.5);});particles=particles.filter(p=>p.life>0);
    texts.forEach(t=>{t.life-=dt;t.y+=t.vy*dt;});texts=texts.filter(t=>t.life>0);
  }
  function draw(){
    const dpr=Math.min(2,window.devicePixelRatio||1);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
    // render at half the physical backing size for a crisp, low-resolution pixel-art finish
    ctx.save();ctx.scale((canvas.width/dpr)/W,(canvas.height/dpr)/H);controls.length=0;
    if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake*.45,shake*.45));
    drawBackground();drawTerrain();drawPickups();drawProjectiles();drawEnemies();drawPlayer();drawEffects();
    if(state==='title')drawTitle();else if(state==='pause')drawPause();else if(state==='dead')drawEnd(false);else if(state==='victory')drawEnd(true);else if(state==='reward')drawReward();
    drawHUD();drawControls();
    ctx.restore();
  }
  function drawBackground(){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a2636');g.addColorStop(.58,'#314755');g.addColorStop(1,'#9b755c');rect(0,0,W,H,'#273543');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // distant moon and layered mountain silhouettes
    circle(W*.77,96,39,'#e3bf83');circle(W*.77+12,88,39,'#263543');
    for(let layer=0;layer<3;layer++){
      const parallax=[.12,.25,.42][layer],base=300+layer*48,step=310;
      for(let i=-1;i<Math.ceil(W/step)+3;i++){
        const x=i*step-(cameraX*parallax%step),height=90+((i*57+layer*31)%110+110)%110;
        ctx.fillStyle=['#243746','#20313c','#263742'][layer];ctx.beginPath();ctx.moveTo(x,base);ctx.lineTo(x+step*.48,base-height);ctx.lineTo(x+step,base);ctx.closePath();ctx.fill();
        if(layer===1){rect(x+step*.46,base-height+30,10,19,'#384a50');}
      }
    }
    // temple roofs and bamboo silhouettes in parallax
    for(let i=-1;i<Math.ceil(W/290)+3;i++){
      const x=i*290-(cameraX*.55%290);const y=312+(i%2)*18;
      rect(x+80,y-56,102,58,'#293943');rect(x+67,y-61,128,9,'#182630');
      for(let k=0;k<4;k++)rect(x+89+k*23,y-45,5,45,'#3b4a4b');
      rect(x+72,y-68,118,5,'#bb8856');
    }
    for(let i=-1;i<Math.ceil(W/170)+3;i++){
      const x=i*170-(cameraX*.78%170);rect(x,235,3,111,'#31584d');rect(x-9,270,5,74,'#31584d');rect(x+8,253,5,91,'#31584d');
      for(let k=0;k<5;k++){rect(x-15+k*7,250+k%2*13,4,3,'#58806a');}
    }
    // drifting embers
    for(let i=0;i<16;i++){const x=((i*193+time*12)%(W+40))-20,y=90+(i*83%240)+Math.sin(time+i)*8;rect(x,y,2,2,i%3?'#d29b62':'#8fc5ae');}
  }
  function drawTerrain(){
    for(const t of terrain){const x=worldToScreen(t.x);if(x+t.w<-10||x>W+10)continue;
      if(t.kind==='ground'){
        rect(x,t.y,t.w,95,'#29363b');rect(x,t.y,t.w,7,'#87916d');rect(x,t.y+7,t.w,5,'#555f55');
        for(let i=0;i<t.w;i+=34){rect(x+i+5,t.y+21,14,2,'#364449');rect(x+i+21,t.y+42,3,17,'#334047');if(i%3===0)rect(x+i+11,t.y+66,9,3,'#3a4745');}
        // broken paving and grass tufts
        for(let i=12;i<t.w;i+=77){rect(x+i,t.y-3,3,3,'#b4a17a');rect(x+i+4,t.y-5,2,4,'#7aa17b');}
      }else{
        rect(x,t.y,t.w,12,'#617565');rect(x,t.y+11,t.w,5,'#263840');rect(x+9,t.y-5,t.w-18,5,'#b78d59');
        for(let i=12;i<t.w;i+=35)rect(x+i,t.y+4,4,5,'#a4a177');
      }
    }
    // lanterns, gates, room transition arch markers
    for(let i=0;i<6;i++){
      const wx=490+i*770,x=worldToScreen(wx);if(x<-30||x>W+30)continue;
      rect(x-3,365,6,96,'#342c2b');rect(x-18,357,36,7,'#4e3430');rect(x-12,348,24,7,'#a84e40');circle(x,373,9,'#f3a342');circle(x,373,4,'#fff0bb');
    }
    for(let i=0;i<4;i++){const x=worldToScreen(780+i*850);if(x<-50||x>W+50)continue;rect(x-32,322,7,143,'#453a32');rect(x+25,322,7,143,'#453a32');rect(x-45,318,90,8,'#945640');rect(x-28,307,56,7,'#bb7851');}
  }
  function drawPlayer(){
    const x=worldToScreen(player.x),y=player.y;const blink=player.invuln>0&&Math.floor(time*24)%2===0;
    if(blink)return;
    // shadow
    ctx.globalAlpha=.35;rounded(x-3,463,38,7,5,'#10151a');ctx.globalAlpha=1;
    const facing=player.facing;
    // trailing scarf
    if(player.anim==='run'||player.anim==='dash'||player.anim==='attack'||player.anim==='skill'){
      ctx.fillStyle=player.anim==='skill'?'#75c6b3':'#d2634f';ctx.beginPath();ctx.moveTo(x+14,y+12);ctx.lineTo(x-12-facing*8,y+7+Math.sin(time*20)*5);ctx.lineTo(x+7,y+20);ctx.closePath();ctx.fill();
    }
    // legs, boots
    const step=player.anim==='run'?Math.sin(time*19)*5:0;
    rect(x+6,y+34,8,12,'#26313b');rect(x+17,y+34,8,12,'#26313b');rect(x+4+step,y+43,12,5,'#171e27');rect(x+16-step,y+43,13,5,'#171e27');
    // body robe / armor
    rect(x+5,y+16,21,21,'#293d4b');rect(x+3,y+21,25,11,'#38596a');rect(x+10,y+17,10,19,'#172635');
    // sash and shoulder guard
    rect(x+4,y+27,23,4,'#d7a354');rect(x+4,y+18,7,10,'#526e72');
    // arms, with attack extension
    const reach=player.anim==='attack'?player.facing*14:player.anim==='heavy'?player.facing*18:0;
    rect(x+(facing===1?22+reach:-1),y+22,9,7,'#d5a77f');rect(x+(facing===1?25+reach:-3),y+23,7,4,'#e5c7a2');
    // head and mask
    rect(x+7,y+2,18,17,'#d3a27c');rect(x+5,y+6,21,10,'#b48164');rect(x+5,y+8,22,6,'#263b4a');
    rect(x+(facing===1?19:7),y+8,5,3,'#f4ead5');rect(x+(facing===1?21:8),y+9,2,2,'#25323c');
    rect(x+4,y+2,23,5,'#263b4a');rect(x+8,y-1,15,4,'#ddb25f');
    // headband emblem and weapon glint
    rect(x+13,y+3,6,2,'#e6c374');rect(x+15,y+3,2,2,'#506b71');
    if(player.anim==='attack'||player.anim==='heavy'||player.anim==='airAttack'){
      const ax=x+player.facing*38;line(x+player.facing*24,y+24,ax,y+20,player.anim==='heavy'?'#ffe38b':'#d8edf0',player.anim==='heavy'?4:2);
      if(player.anim==='heavy')line(ax-9,y+8,ax+8,y+33,'#f3b84f',2);
    }
    if(player.guard){rounded(x+(facing===1?23:-18),y+8,12,32,5,'#4e9186');rect(x+(facing===1?26:-15),y+13,5,22,'#95c9a9');}
    if(player.dashT>0){ctx.globalAlpha=.25;rect(x-player.dashDir*25,y+5,28,40,'#72b4a0');ctx.globalAlpha=1;}
  }
  function drawEnemies(){
    for(const e of enemies){if(e.dead&&e.flash<=0)continue;const x=worldToScreen(e.x),y=e.y;if(x<-100||x>W+100)continue;
      ctx.globalAlpha=e.flash>0&&Math.floor(time*30)%2===0?.45:1;
      ctx.globalAlpha*=e.dead?.3:1;
      ctx.globalAlpha*=1;
      if(e.type==='boss')drawBoss(e,x,y);else drawNinja(e,x,y);
      if(!e.dead&&e.hp<e.maxHp){rounded(x-5,y-14,e.w+10,5,2,'#1a2028');rounded(x-5,y-14,(e.w+10)*Math.max(0,e.hp/e.maxHp),5,2,e.boss?colors.gold:colors.red);}
      if(e.wind>0){const c=e.attackKind==='chakra'?colors.purple:colors.gold;circle(x+e.w/2,y-58,7+Math.sin(time*20)*2,c);if(e.attackKind==='chakra')circle(x+e.w/2,y-58,12,'#aa80c777');}
      ctx.globalAlpha=1;
    }
  }
  function drawNinja(e,x,y){
    const f=e.face;const shade=e.type==='elite'?'#51405f':e.type==='thrower'?'#4c6870':'#703f48';
    ctx.globalAlpha=.35;rounded(x,y+e.h-3,e.w,6,5,'#11161d');ctx.globalAlpha=1;
    rect(x+4,y+e.h-16,9,15,'#252b37');rect(x+e.w-13,y+e.h-16,9,15,'#252b37');rect(x+2,y+e.h-4,13,5,'#171d26');rect(x+e.w-15,y+e.h-4,13,5,'#171d26');
    rect(x+4,y+18,e.w-8,e.h-34,shade);rect(x+2,y+24,e.w-4,12,e.type==='elite'?'#927456':'#374d5a');rect(x+e.w/2-3,y+22,6,17,'#26323a');rect(x+5,y+7,e.w-10,15,'#bd8b69');rect(x+3,y+11,e.w-6,7,'#222d37');rect(x+4,y+5,e.w-8,5,shade);
    rect(x+(f===1?e.w-11:4),y+12,5,2,'#f5d992');rect(x+(f===1?e.w-10:5),y+12,2,2,'#17222a');
    if(e.type==='blade'||e.type==='elite'){line(x+e.w/2+f*10,y+29,x+e.w/2+f*29,y+14,'#c7c9be',2);line(x+e.w/2+f*8,y+30,x+e.w/2+f*15,y+26,'#d3a45c',3);}
    if(e.type==='thrower'){rect(x+e.w/2+f*7,y+29,9,3,'#d3a45c');}
    if(e.type==='elite'){rect(x+e.w/2-2,y+1,4,13,'#c9a24f');}
  }
  function drawBoss(e,x,y){
    ctx.globalAlpha=.4;rounded(x+2,y+e.h-4,e.w,9,8,'#0e151d');ctx.globalAlpha=1;
    rect(x+9,y+e.h-24,18,22,'#282634');rect(x+e.w-27,y+e.h-24,18,22,'#282634');rect(x+5,y+e.h-7,25,7,'#161b25');rect(x+e.w-30,y+e.h-7,25,7,'#161b25');
    rect(x+7,y+22,e.w-14,e.h-43,'#47384a');rect(x+1,y+32,e.w-2,23,'#78554e');rect(x+e.w/2-12,y+25,24,38,'#26313c');
    rect(x+14,y+9,e.w-28,28,'#bf9473');rect(x+8,y+17,e.w-16,13,'#273b49');rect(x+12,y+6,e.w-24,9,'#272d39');rect(x+18,y+20,8,4,colors.gold);rect(x+e.w-26,y+20,8,4,colors.gold);
    rect(x+2,y+40,13,18,'#d2ad63');rect(x+e.w-15,y+40,13,18,'#d2ad63');
    if(e.wind>0){circle(x+e.w/2,y-13,13,colors.purple);circle(x+e.w/2,y-13,20,'#aa80c755');}
  }
  function bar(x,y,w,h,value,max,color,label){
    rounded(x,y,w,h,h/2,'#17212b');rounded(x+2,y+2,(w-4)*clamp(value/max,0,1),h-4,h/2,color);
    if(label)text(label,x,y-9,11,'#c7c9bd','left',800);
  }
  function drawHUD(){
    if(state==='title')return;
    // top-left compact meters
    rounded(20,18,224,79,'#101925ce','#87938a55');
    text('SHINOBI  •  LV 01',34,31,12,colors.cream,'left',900);
    bar(34,46,192,11,player.hp,run.maxHealth,player.hp<30?colors.red:'#d96b5d','');
    bar(34,67,192,8,player.chakra,100,colors.purple,'');
    bar(34,83,192,7,player.stamina,100,colors.teal,'');
    text('HP',232,52,9,'#f3d9bb','right',900);text('CH',232,71,8,'#d7c6ea','right',900);text('ST',232,86,8,'#b3dacc','right',900);
    // central objective label
    rounded(W/2-160,16,320,49,'#111a25b8','#d2b37b44');text(`CHAPTER 01  /  ${roomNames[room%roomNames.length]}`,W/2,31,11,'#e1c98e','center',900);text(state==='playing'?'Hunt the gatekeeper • reach the far gate':'',W/2,49,10,'#c4c6bc','center',600);
    // upper right
    rounded(W-182,18,162,43,'#101925ce','#87938a55');text(`◈  ${coins}`,W-164,39,14,colors.gold,'left',900);text('MAP  ▦',W-78,39,10,'#b6c6bf','center',800);
    const pauseBox={x:W-45,y:72,r:20,action:'pause'};drawRoundButton(pauseBox.x,pauseBox.y,'Ⅱ','PAUSE',false,20);controls.push({x:W-67,y:52,w:44,h:42,action:'pause'});
    if(state==='playing'&&player.guardBreak>0){rounded(W/2-70,72,140,23,4,'#4b252a');text('GUARD BROKEN',W/2,84,10,'#ffb298','center',900);}
    if(state==='playing'&&player.charging){text('CHAKRA FOCUS',W/2,H-128,12,colors.purple,'center',900);}
    if(state==='playing'&&room===3&&enemies.some(e=>e.boss&&!e.dead)){
      rounded(W/2-170,83,340,16,4,'#17212bcc');rounded(W/2-167,86,334*Math.max(0,enemies.find(e=>e.boss&&!e.dead).hp/enemies.find(e=>e.boss&&!e.dead).maxHp),10,3,colors.red);text('GATEKEEPER',W/2,78,9,'#f1d5a5','center',900);
    }
  }
  function drawRoundButton(x,y,label,caption,active,r=29){
    ctx.globalAlpha=.88;circle(x,y+3,r+3,'#10151d');circle(x,y,r,active?'#46796e':'#222f3c');ctx.strokeStyle=active?'#b8e4ba':'#83948d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r-1,0,TAU);ctx.stroke();
    text(label,x,y-1,16,active?'#eff4cf':colors.cream,'center',900);if(caption)text(caption,x,y+r+11,8,'#d5d4c6','center',800);ctx.globalAlpha=1;
  }
  function drawControls(){
    if(state==='playing'){ 
      const jy=H-80,jx=99;
      circle(jx,jy+3,57,'#0e172088');circle(jx,jy,52,'#d8e3dc18');ctx.strokeStyle='#c2d3c344';ctx.lineWidth=2;ctx.beginPath();ctx.arc(jx,jy,51,0,TAU);ctx.stroke();
      const knobX=jx+(input.left?-17:input.right?17:0);circle(knobX,jy,21,input.left||input.right?'#a1c9b188':'#9caeaa55');circle(knobX,jy,12,'#e2e8d855');controls.push({x:20,y:H-150,w:165,h:140,action:'joystick'});
      const B=(x,y,r,label,caption,act,cd=0,max=1)=>{drawRoundButton(x,y,label,caption,!!input[act],r);if(cd>0){ctx.strokeStyle='#111923';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,r-5,-Math.PI/2,-Math.PI/2+TAU*clamp(cd/max,0,1));ctx.stroke();}controls.push({x:x-r-8,y:y-r-10,w:(r+8)*2,h:(r+10)*2,action:act});};
      const right=W-76;
      B(right,H-89,35,'⚔','HIT','attack');B(right-72,H-72,33,'◆','HEAVY','heavy',player.heavyCD,.76);
      B(right,H-174,32,'↑','JUMP','jump');B(right-73,H-141,30,'»','DASH','dash',player.dashCD,.7);
      B(right-143,H-169,32,'◉','GUARD','guard');B(right-161,H-81,29,'✦','WIND','skill1',player.skillCD,3.4);
      B(right-224,H-142,29,'✧','CHAKRA','skill2',player.skill2CD,5.5);B(right-232,H-73,27,'◌','FOCUS','chakra');
      text('Ⅲ',right-163,H-82,11,'#e5e9d8','center',900);
      return;
    }
    controls.push({x:0,y:0,w:W,h:H,action:'menu'});
  }
  function drawTitle(){
    // gentle darken, title screen remains wide landscape
    ctx.fillStyle='#0b111ab8';ctx.fillRect(0,0,W,H);
    const cx=W*.5;rounded(cx-283,70,566,390,12,'#111a24ed','#caa35d77');
    text('SHADOW CIRCUIT',cx,128,40,'#f2dfb6','center',1000);text('忍  •  THE LAST SHINOBI',cx,163,14,'#86b7a4','center',900);
    line(cx-172,184,cx+172,184,'#b78d59',2);
    text('A pixel-art action roguelike',cx,214,16,'#e5dcc9','center',650);text('Dodge. Parry. Break the siege.',cx,240,13,'#9fbbb0','center',650);
    rounded(cx-154,274,308,52,6,'#a95744','#e9c27d');text('BEGIN MISSION',cx,300,16,'#fff0cc','center',950);
    text('LANDSCAPE  •  TOUCH OR KEYBOARD',cx,353,10,'#aeb7b2','center',800);
    text('Move  ◀ ▶ / A D     Jump  SPACE     Dash  SHIFT',cx,382,11,'#cbd1c7','center',600);
    text('Light  J     Heavy  K     Guard / Parry  L     Skills  Q / E',cx,402,11,'#cbd1c7','center',600);
    text(`MODE  ${difficulty}  ·  TAP TO CHANGE`,cx,438,11,'#e7c783','center',850);
    controls.push({x:cx-155,y:270,w:310,h:59,action:'start'});controls.push({x:cx-140,y:415,w:280,h:43,action:'difficulty'});
  }
  function drawPause(){
    ctx.fillStyle='#0b111ac9';ctx.fillRect(0,0,W,H);const cx=W/2;
    rounded(cx-245,72,490,390,9,'#18232deb','#caa35d88');text('PAUSED',cx,111,30,colors.cream,'center',1000);text('MISSION 01  •  CONTROL & RUN OPTIONS',cx,144,11,'#a9b5b0','center',850);
    rounded(cx-110,170,220,43,5,'#527b68','#afc89c');text('RESUME',cx,191,15,'#fff2d6','center',900);
    text(`CONTROL SIZE     ${Math.round((parseFloat(localStorage.getItem('buttonScale'))||1)*100)}%`,cx-35,243,13,colors.cream,'center',850);
    rounded(cx+77,223,42,38,5,'#344757','#7c9a9c');text('+',cx+98,242,22,colors.cream,'center',900);rounded(cx-120,223,42,38,5,'#344757','#7c9a9c');text('−',cx-99,242,22,colors.cream,'center',900);
    text(`BUTTON OPACITY   ${Math.round((parseFloat(localStorage.getItem('buttonOpacity'))||.88)*100)}%`,cx,284,12,'#c9d2cd','center',800);
    rounded(cx-116,304,88,36,5,'#344757','#7c9a9c');text('LESS',cx-72,322,11,colors.cream,'center',900);rounded(cx+28,304,88,36,5,'#344757','#7c9a9c');text('MORE',cx+72,322,11,colors.cream,'center',900);
    rounded(cx-175,365,160,40,5,'#263843','#718b87');text('RESET LAYOUT',cx-95,385,11,colors.cream,'center',850);rounded(cx+15,365,160,40,5,'#613a3a','#bb7770');text('ABANDON RUN',cx+95,385,11,'#ffddd0','center',850);
    text('ESC / P TO RESUME',cx,434,10,'#aeb8b3','center',700);
    controls.push({x:cx-110,y:166,w:220,h:52,action:'resume'},{x:cx+72,y:218,w:53,h:49,action:'sizeUp'},{x:cx-124,y:218,w:53,h:49,action:'sizeDown'},{x:cx+22,y:299,w:100,h:45,action:'opacityUp'},{x:cx-122,y:299,w:100,h:45,action:'opacityDown'},{x:cx-179,y:360,w:168,h:50,action:'reset'},{x:cx+10,y:360,w:170,h:50,action:'abandon'});
  }
  function drawEnd(win){ctx.fillStyle='#0c131bdc';ctx.fillRect(0,0,W,H);const cx=W/2;rounded(cx-240,115,480,300,9,'#18232eee','#cca35e99');text(win?'ROUTE CLEARED':'FALLEN IN THE SHADOWS',cx,164,26,win?'#e8d095':'#e68471','center',1000);text(win?'The gate is open. The village will remember.':'The route is lost, but your resolve remains.',cx,205,13,'#d1d2c7','center',650);text(`SHINOBI ELIMINATED  ${runKills}     SCORE  ${score}     COINS  ${coins}`,cx,250,13,colors.cream,'center',850);
    rounded(cx-118,294,236,48,5,'#a95744','#e9c27d');text('RUN IT BACK',cx,318,15,'#fff0cc','center',950);text('Tap anywhere to return to the mission',cx,366,11,'#aeb8b3','center',700);controls.push({x:cx-124,y:288,w:248,h:60,action:'restart'});
  }
  function drawReward(){ctx.fillStyle='#0b111ad9';ctx.fillRect(0,0,W,H);const cx=W/2;rounded(cx-275,100,550,340,10,'#17232ded','#c4a15e99');text('A MOMENT OF RESOLVE',cx,143,25,colors.cream,'center',1000);text('Choose a run upgrade',cx,177,12,'#aec3b4','center',700);
    const offers=[['WIND-ETCHED STEEL','Attack damage +20%','damage'],['SECOND BREATH','Restore 35 health','heal'],['TWIN LEAP','Unlock double jump','jump']];
    offers.forEach((o,i)=>{const x=cx-246+i*166;rounded(x,218,153,151,7,'#243642','#a48b5e');text(['⚔','✚','↟'][i],x+76,250,28,colors.gold,'center',900);text(o[0],x+76,286,10,colors.cream,'center',900);text(o[1],x+76,311,10,'#afc1b6','center',650);rounded(x+22,336,109,23,4,'#536e62');text('SELECT',x+76,348,9,'#fff0cc','center',900);controls.push({x,y:210,w:153,h:165,action:`reward${i}`});});
  }

  function hitControl(action,down){
    if(action==='menu')return;
    if(action==='joystick'){
      if(down){const r=pointerTouch;if(r&&r.x<W*.5){} }
      return;
    }
    if(down)inputDown(action);else inputUp(action);
  }

  function handleAction(action){
    if(action==='start'){startRun();return;}
    if(action==='difficulty'){difficulty=difficulty==='NORMAL'?'HARD':difficulty==='HARD'?'RELAXED':'NORMAL';return;}
    if(action==='pause'){if(state==='playing')state='pause';return;}
    if(action==='resume'){state='playing';return;}
    if(action==='restart'){state='title';return;}
    if(action==='abandon'){state='title';return;}
    if(action==='reset'){localStorage.setItem('buttonScale','1');localStorage.setItem('buttonOpacity','.88');toastMsg('Control layout reset');return;}
    if(action==='sizeUp'||action==='sizeDown'){
      const old=parseFloat(localStorage.getItem('buttonScale'))||1;
      localStorage.setItem('buttonScale',String(clamp(old+(action==='sizeUp'?'.1':'-.1'),.7,1.3)));
      return;
    }
    if(action==='opacityUp'||action==='opacityDown'){
      const old=parseFloat(localStorage.getItem('buttonOpacity'))||.88;
      localStorage.setItem('buttonOpacity',String(clamp(old+(action==='opacityUp'?'.1':'-.1'),.4,1)));
      return;
    }
    if(action==='reward0'){run.damage*=1.2;state='playing';return;}
    if(action==='reward1'){player.hp=Math.min(run.maxHealth,player.hp+35);state='playing';return;}
    if(action==='reward2'){run.doubleJump=true;state='playing';return;}
  }

  let pointerTouch=null;
  canvas.addEventListener('pointerdown',(ev)=>{
    ev.preventEvent?.();ev.preventDefault();canvas.setPointerCapture?.(ev.pointerId);
    const rectCanvas=canvas.getBoundingClientRect();
    const sx=(ev.clientX-rectCanvas.left)/rectCanvas.width*W;
    const sy=(ev.clientY-rectCanvas.top)/rectCanvas.height*H;
    pointerTouch={x:sx,y:sy,pointerId:ev.pointerId};
    const hit=[...controls].reverse().find(c=>sx>=c.x&&sx<=c.x+c.w&&sy>=c.y&&sy<=c.y+c.h);
    if(hit){
      if(['start','difficulty','pause','resume','restart','abandon','reset','sizeUp','sizeDown','opacityUp','opacityDown','reward0','reward1','reward2'].includes(hit.action)){handleAction(hit.action);}
      else if(hit.action==='joystick'){
        if(sx<hit.x+hit.w*.5)input.left=true,input.right=false;
        else input.right=true,input.left=false;
      }else hitControl(hit.action,true);
    }
  });
  canvas.addEventListener('pointermove',(ev)=>{
    if(!pointerTouch||ev.pointerId!==pointerTouch.pointerId)return;
    const rectCanvas=canvas.getBoundingClientRect();const sx=(ev.clientX-rectCanvas.left)/rectCanvas.width*W;
    if(sx>0&&sx<W*.55){if(sx<W*.35){input.left=true;input.right=false;}else if(sx<W*.55){input.left=false;input.right=false;}}
  });
  canvas.addEventListener('pointerup',(ev)=>{
    if(pointerTouch&&ev.pointerId===pointerTouch.pointerId){pointerTouch=null;}
    input.left=false;input.right=false;
    ['jump','attack','heavy','dash','guard','skill1','skill2','chakra'].forEach(a=>inputUp(a));
  });
  canvas.addEventListener('pointercancel',()=>{pointerTouch=null;input.left=false;input.right=false;['jump','attack','heavy','dash','guard','skill1','skill2','chakra'].forEach(a=>inputUp(a));});

  const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump',ShiftLeft:'dash',ShiftRight:'dash',KeyJ:'attack',KeyK:'heavy',KeyL:'guard',KeyQ:'skill1',KeyE:'skill2',KeyC:'chakra'};
  window.addEventListener('keydown',(ev)=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(ev.code))ev.preventDefault();
    if(ev.repeat&&(ev.code==='KeyP'||ev.code==='Escape'))return;
    if(ev.code==='KeyP'||ev.code==='Escape'){if(state==='playing')state='pause';else if(state==='pause')state='playing';return;}
    const a=keyMap[ev.code];if(!a)return;if(a==='left'||a==='right'||a==='guard'||a==='chakra'||a==='jump'||a==='attack'||a==='heavy'||a==='dash'||a==='skill1'||a==='skill2'){
      if(a==='left'||a==='right')input[a]=true;
      else {if(!ev.repeat)inputDown(a);input[a]=true;}
    }
  });
  window.addEventListener('keyup',(ev)=>{const a=keyMap[ev.code];if(!a)return;if(a==='left'||a==='right')input[a]=false;else{inputUp(a);input[a]=false;}});

  function loop(ts){
    const dt=Math.min(.033,last?(ts-last)/1000:.016);last=ts;update(dt);draw();requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
