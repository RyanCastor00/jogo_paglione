import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { randomBytes } from 'node:crypto';
import { MAX_PLAYERS, MINIGAMES, scoreForPlacement, validMove } from './game/rules.js';

const app = express(); app.use(cors({origin: process.env.CLIENT_ORIGIN?.split(',') || true})); app.use(express.json());
app.get('/health', (_req,res)=>res.json({ok:true,game:'PANIC PARTY',rooms:rooms.size}));
const httpServer = createServer(app);
const io = new Server(httpServer,{cors:{origin:process.env.CLIENT_ORIGIN?.split(',') || '*'}});
const rooms = new Map();
const cleanName = (v)=>String(v||'Player').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,18)||'Player';
const roomCode = ()=>randomBytes(3).toString('hex').toUpperCase();
function publicRoom(r){return {code:r.code,hostId:r.hostId,phase:r.phase,round:r.round,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,character:p.character,ready:p.ready,connected:p.connected,score:p.score,position:p.position}))};}
function emitRoom(r){io.to(r.code).emit('room:update',publicRoom(r));}
function makeRoom(socket, name){let code; do{code=roomCode()}while(rooms.has(code)); const r={code,hostId:socket.id,phase:'lobby',round:0,players:new Map(),timer:null,game:null,endsAt:null}; rooms.set(code,r); joinRoom(socket,r,name); return r;}
function joinRoom(socket,r,name){if(r.phase!=='lobby') throw new Error('A partida já começou.'); if(r.players.size>=MAX_PLAYERS) throw new Error('Sala cheia (máximo 8 jogadores).'); const p={id:socket.id,name:cleanName(name),character:['pip','glitch','bumbo','zip'][r.players.size%4],ready:false,connected:true,score:0,position:{x:(Math.random()-.5)*4,z:(Math.random()-.5)*4,y:0,yaw:0},lastMove:0,magnetCooldown:0,delivered:0,finished:false}; r.players.set(socket.id,p); socket.join(r.code); socket.data.roomCode=r.code; emitRoom(r); socket.emit('room:joined',{code:r.code,playerId:socket.id});}
function endRound(r){if(!r || r.phase!=='playing')return; clearInterval(r.timer); r.timer=null; r.phase='results'; const rows=[...r.players.values()].map(p=>({id:p.id,name:p.name,score:p.score,roundPoints:p.roundPoints||0,place:p.place||null})).sort((a,b)=>b.roundPoints-a.roundPoints); io.to(r.code).emit('round:results',{game:r.game,round:r.round,results:rows,room:publicRoom(r)}); emitRoom(r);}
function startRound(r){r.phase='playing';r.round++;r.game=MINIGAMES[(r.round-1)%MINIGAMES.length];r.endsAt=Date.now()+45000; for(const p of r.players.values()){p.roundPoints=0;p.place=null;p.finished=false;p.delivered=0;p.position={...p.position,x:(Math.random()-.5)*4,z:(Math.random()-.5)*4,y:0};} io.to(r.code).emit('round:start',{game:r.game,round:r.round,duration:45,endsAt:r.endsAt}); emitRoom(r); r.timer=setInterval(()=>{const remaining=Math.max(0,Math.ceil((r.endsAt-Date.now())/1000)); io.to(r.code).emit('round:tick',{remaining}); if(!remaining)endRound(r);},250);}
io.on('connection',(socket)=>{
 socket.emit('server:hello',{version:'0.1.0'});
 socket.on('room:create',(data={},ack=()=>{})=>{try{const r=makeRoom(socket,data.name);ack({ok:true,code:r.code});}catch(e){ack({ok:false,error:e.message});}});
 socket.on('room:join',(data={},ack=()=>{})=>{try{const code=String(data.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);const r=rooms.get(code);if(!r)throw new Error('Sala não encontrada. Confira o código.');joinRoom(socket,r,data.name);ack({ok:true,code});}catch(e){ack({ok:false,error:e.message});}});
 socket.on('player:ready',(ready)=>{const r=rooms.get(socket.data.roomCode);const p=r?.players.get(socket.id);if(!p||r.phase!=='lobby')return;p.ready=!!ready;emitRoom(r);});
 socket.on('player:character',(character)=>{const r=rooms.get(socket.data.roomCode);const p=r?.players.get(socket.id);if(!p||r.phase!=='lobby')return;const allowed=['pip','glitch','bumbo','zip'];if(allowed.includes(character))p.character=character;emitRoom(r);});
 socket.on('match:start',()=>{const r=rooms.get(socket.data.roomCode);if(!r||r.hostId!==socket.id||r.phase!=='lobby'||r.players.size<2)return;for(const p of r.players.values())p.score=0;startRound(r);});
 socket.on('player:move',(data)=>{const r=rooms.get(socket.data.roomCode);const p=r?.players.get(socket.id);if(!r||!p||r.phase!=='playing'||!validMove(data))return;const now=Date.now();if(now-p.lastMove<25)return;p.lastMove=now;p.position={x:Math.max(-14,Math.min(14,data.x)),z:Math.max(-14,Math.min(14,data.z)),y:Math.max(0,Math.min(8,Number(data.y)||0)),yaw:Math.max(-Math.PI*4,Math.min(Math.PI*4,data.yaw))};socket.to(r.code).emit('player:state',{id:p.id,position:p.position});
   // Server awards activity-based courier points, never trusts client score.
   if(r.game==='CHAOS COURIER' && data.deliver===true && now-(p.lastDeliver||0)>1800){p.lastDeliver=now;p.roundPoints+=2;p.delivered++;socket.emit('player:feedback',{message:'Entrega confirmada! +2'});}
   if(r.game==='MAGNET MAYHEM' && data.collect===true && now-(p.lastCollect||0)>900){p.lastCollect=now;p.roundPoints+=1;socket.emit('player:feedback',{message:'Orbe coletado! +1'});}
   if(r.game==='FLOOR PANIC' && data.fell===true && !p.fell){p.fell=true;p.roundPoints=Math.max(0,p.roundPoints-1);socket.emit('player:feedback',{message:'Ops! Você caiu.'});}
 });
 socket.on('player:action',(action)=>{const r=rooms.get(socket.data.roomCode);const p=r?.players.get(socket.id);if(!r||!p||r.phase!=='playing'||!['jump','magnet','hide','deliver'].includes(action))return;const now=Date.now();if(action==='magnet'&&now-(p.magnetCooldown||0)>2200){p.magnetCooldown=now;socket.to(r.code).emit('game:event',{type:'magnet',id:p.id});socket.emit('player:feedback',{message:'Pulso magnético!'});}if(action==='deliver'&&r.game==='CHAOS COURIER'&&now-(p.lastDeliver||0)>1800){p.lastDeliver=now;p.roundPoints+=2;p.delivered++;socket.emit('player:feedback',{message:'Entrega confirmada! +2'});}});
 socket.on('round:continue',()=>{const r=rooms.get(socket.data.roomCode);if(!r||r.hostId!==socket.id||r.phase!=='results')return;for(const p of r.players.values()){p.score+=p.roundPoints||0;p.fell=false;}if(r.round>=6){r.phase='finished';io.to(r.code).emit('match:results',{room:publicRoom(r),results:[...r.players.values()].sort((a,b)=>b.score-a.score).map(p=>({id:p.id,name:p.name,score:p.score}))});emitRoom(r);}else startRound(r);});
 socket.on('room:leave',()=>leave(socket)); socket.on('disconnect',()=>leave(socket));
});
function leave(socket){const code=socket.data.roomCode;if(!code)return;const r=rooms.get(code);if(!r)return;const p=r.players.get(socket.id);if(p){p.connected=false;r.players.delete(socket.id);io.to(code).emit('player:left',{id:socket.id,name:p.name});}socket.leave(code);delete socket.data.roomCode;if(r.hostId===socket.id)r.hostId=r.players.keys().next().value||null;if(r.players.size===0){clearInterval(r.timer);rooms.delete(code);}else{if(r.phase==='playing'&&r.players.size===1){const remaining=[...r.players.values()][0];remaining.roundPoints+=2;endRound(r);}emitRoom(r);}}
const port=Number(process.env.PORT||3001);httpServer.listen(port,'0.0.0.0',()=>console.log(`PANIC PARTY server listening on :${port}`));
