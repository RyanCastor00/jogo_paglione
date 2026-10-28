import test from 'node:test'; import assert from 'node:assert/strict'; import {scoreForPlacement,validMove,MINIGAMES} from '../src/game/rules.js';
test('four unique minigames exist',()=>assert.equal(new Set(MINIGAMES).size,4));
test('placement scoring rewards higher placements',()=>{assert.ok(scoreForPlacement(1,4)>scoreForPlacement(2,4));assert.equal(scoreForPlacement(1,4,true),13)});
test('movement payload is bounded and numeric',()=>{assert.equal(validMove({x:1,z:2,y:0,yaw:0}),true);assert.equal(validMove({x:500,z:0,yaw:0}),false);assert.equal(validMove({x:'1',z:0,yaw:0}),false)});
