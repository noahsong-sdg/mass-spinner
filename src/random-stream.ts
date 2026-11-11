/*! @license Random123
Copyright 2010-2012, D. E. Shaw Research.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

* Redistributions of source code must retain the above copyright
  notice, this list of conditions, and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright
  notice, this list of conditions, and the following disclaimer in the
  documentation and/or other materials provided with the distribution.

* Neither the name of D. E. Shaw Research nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/** Philox4x32-10 adapted from D. E. Shaw Research's Random123 (BSD-3-Clause).
 * Counter words are little-endian; key words are exactly (seed, streamTag).
 * Reference: https://github.com/DEShawResearch/random123
 * Commit: 9545ff6413f258be2f04c1d319d99aaef7521150, include/Random123/philox.h.
 */
export type Counter128 = readonly [number, number, number, number];
export type PhiloxKey = readonly [number, number];
export const RANDOM_STREAM_VERSION = 'philox4x32-10-u32-v1' as const;
const MAX_WORD = 0xffffffff;
const checkWord = (value:number) => {
  if (!Number.isInteger(value) || value < 0 || value > MAX_WORD)
    throw new Error('Philox seed, tag, counter and key words must be uint32.');
};
function checkWords(words:readonly number[], length:number) {
  if (words.length !== length) throw new Error('Invalid Philox word count.');
  for (const word of words) checkWord(word);
}

// Exact high half of a 32x32-bit product; every intermediate is below 2^53.
function multiplyHigh(a:number, b:number) {
  const a0=a&0xffff, a1=a>>>16, b0=b&0xffff, b1=b>>>16;
  const first=a0*b0, middle=a1*b0+(first>>>16);
  return (a1*b1+(middle>>>16)+(((middle&0xffff)+a0*b1)>>>16))>>>0;
}
function writeBlock(counter:Counter128, key:PhiloxKey, output:Uint32Array) {
  let [a,b,c,d]=counter, [k0,k1]=key;
  for (let round=0; round<10; round++) {
    const low0=Math.imul(0xd2511f53,a)>>>0, high0=multiplyHigh(0xd2511f53,a);
    const low1=Math.imul(0xcd9e8d57,c)>>>0, high1=multiplyHigh(0xcd9e8d57,c);
    a=(high1^b^k0)>>>0; b=low1; c=(high0^d^k1)>>>0; d=low0;
    k0=(k0+0x9e3779b9)>>>0; k1=(k1+0xbb67ae85)>>>0;
  }
  output[0]=a; output[1]=b; output[2]=c; output[3]=d;
}
/** Stateless official ten-round block, exposed for reference/replay checks. */
export function philox4x32(counter:Counter128, key:PhiloxKey):number[] {
  checkWords(counter,4); checkWords(key,2);
  const output=new Uint32Array(4);
  writeBlock(counter,key,output);
  return Array.from(output);
}

/** Four uint32 uniforms per counter block, each exactly word/2^32 in [0,1).
 * Distinct (seed,streamTag) keys name distinct keyed streams; this does not
 * mean individual output values cannot coincide or prove statistical independence.
 * The optional initial block supports explicit replay and counter partitioning.
 */
export function createRandomStream(seed:number, streamTag:number,
  initialCounter:Counter128=[0,0,0,0]):()=>number {
  checkWord(seed); checkWord(streamTag); checkWords(initialCounter,4);
  const counter:[number,number,number,number]=[...initialCounter];
  const key:PhiloxKey=[seed,streamTag], output=new Uint32Array(4);
  let index=4, exhausted=false;
  return () => {
    if (index===4) {
      if (exhausted) throw new Error('Philox 128-bit counter exhausted; stream would repeat.');
      writeBlock(counter,key,output); index=0;
      let word=0;
      while (word<4 && counter[word]===MAX_WORD) {counter[word]=0; word++;}
      if (word===4) exhausted=true;
      else counter[word]++;
    }
    return output[index++]/4294967296;
  };
}
