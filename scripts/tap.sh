#!/bin/bash
# Tap the clone at design coords (1280x876 space) via synthetic pointer events.
# Usage: tap-clone.sh X Y [SESSION]
X=$1
Y=$2
S=${3:-clone}
agent-browser --session "$S" eval "
(()=>{const c=document.getElementById('game'); const r=c.getBoundingClientRect();
const cx=r.left+($X)*r.width/1280, cy=r.top+($Y)*r.height/876;
const o={bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:1,pointerType:'mouse',isPrimary:true};
c.dispatchEvent(new PointerEvent('pointerdown',o));
window.dispatchEvent(new PointerEvent('pointerup',o));
return 'tap $X,$Y';})()" 2>&1
