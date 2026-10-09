import test from 'node:test';
import assert from 'node:assert/strict';
import {carouselPose,lineupPose} from '../dist/product-motion.js';

test('turning remains continuous across former rounding boundaries',()=>{
  for(const offset of [-1.5,-.99,-.5,0,.5,.99,1.5]){
    for(const logical of [-2,-1,0,1,2]){
      const before=carouselPose(offset-.00001,logical,3);
      const after=carouselPose(offset+.00001,logical,3);
      for(const key of ['pitch','yaw','roll','depth'])assert.ok(Math.abs(before[key]-after[key])<.001,`${key} jumps at ${offset}`);
    }
  }
});

test('the selected can moves forward and exposes both tilt and turning axes',()=>{
  const selected=carouselPose(0,0,0);
  assert.ok(selected.depth>carouselPose(1,0,0).depth);
  assert.ok(selected.depth>carouselPose(-1,0,0).depth);
  assert.ok(selected.pitch>.15&&selected.roll>.3);
  const later=carouselPose(0,0,3);
  assert.ok(Math.abs(selected.yaw-later.yaw)>.1);
  assert.notEqual(selected.lidYaw,later.lidYaw);
});

test('reduced motion removes drifting, input parallax and independent spinning',()=>{
  assert.deepEqual(carouselPose(0,0,0,0,0,false),carouselPose(0,0,500,.5,.5,false,2));
});

test('the closing collection recedes in depth and exposes different ends',()=>{
  const left=lineupPose(-5),center=lineupPose(0),right=lineupPose(5);
  assert.ok(left.x<center.x&&center.x<right.x);
  assert.ok(left.depth>center.depth&&center.depth>right.depth);
  assert.ok(left.pitch<0&&right.pitch>0);
  for(let offset=-5;offset<=5;offset++){
    for(const value of Object.values(lineupPose(offset)))assert.ok(Number.isFinite(value));
  }
});

// Rocking through both pitch signs must expose the lid and base over a full cycle.
test('opening orbit reveals both ends without turning the front label away',()=>{
  const poses=Array.from({length:121},(_,i)=>carouselPose(0,0,i*.15));
  assert.ok(Math.min(...poses.map(p=>p.pitch))<-.12);
  assert.ok(Math.max(...poses.map(p=>p.pitch))>.30);
  assert.ok(Math.max(...poses.map(p=>p.yaw))-Math.min(...poses.map(p=>p.yaw))>.9);
  assert.ok(poses.every(p=>Math.abs(p.yaw)<Math.PI/2));
});
