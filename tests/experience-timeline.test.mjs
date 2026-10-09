import test from 'node:test';
import assert from 'node:assert/strict';
import {experienceBeat, chapterStops, cinemaFrame} from '../dist/experience-timeline.js';

test('chapter links land on the corresponding held label area', () => {
  chapterStops.forEach((stop, index) => {
    const beat = experienceBeat(stop);
    assert.equal(beat.chapter, index);
    if (index > 0) {
      assert.equal(beat.focus, 1);
      assert.equal(beat.scan, index - 1);
    }
  });
});

test('the light pauses on every label before moving to the next', () => {
  for (const [start, end, row] of [[.33,.40,0],[.48,.56,1],[.64,.72,2]]) {
    for (let p = start; p < end; p += .01) {
      assert.equal(experienceBeat(p).scan, row);
      assert.equal(experienceBeat(p).focus, 1);
    }
  }
  let previous = 0;
  for (let p = 0; p <= 1; p += .001) {
    const beat = experienceBeat(p);
    assert.ok(beat.scan >= previous);
    assert.ok(beat.focus >= 0 && beat.focus <= 1);
    previous = beat.scan;
  }
});

test('the closing lineup restores light and stays visible until the exit', () => {
  for (const p of [.93,.96,1,1.2]) {
    const beat = experienceBeat(p);
    assert.equal(beat.focus, 0);
    assert.equal(beat.copy, 0);
    assert.equal(beat.returnTurn, 1);
    assert.equal(beat.lineup, 1);
  }
  assert.deepEqual(experienceBeat(-1), experienceBeat(0));
});

test('the isolated pullback completes before supporting cans return',()=>{
  const beat=experienceBeat(.847),frame=cinemaFrame(.847);
  assert.equal(frame.withdraw,1);
  assert.equal(beat.lineup,0);
  assert.equal(beat.focus,0);
  assert.equal(beat.copy,0);
  assert.equal(beat.returnTurn,1);
  assert.equal(cinemaFrame(chapterStops[1]).track,0);
  assert.equal(cinemaFrame(chapterStops[2]).track,1);
  assert.equal(cinemaFrame(chapterStops[3]).track,2);
});
