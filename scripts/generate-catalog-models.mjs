import { mkdirSync, writeFileSync } from "node:fs";

const output = new URL("../public/catalog/", import.meta.url);
mkdirSync(output, { recursive: true });

function box(x, y, z, sx, sy, sz, material) {
  const p = [
    [-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1], [1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1],
    [-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1], [-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],
    [1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1], [-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]
  ].map(([a,b,c]) => [x+a*sx/2,y+b*sy/2,z+c*sz/2]);
  const n = [[0,0,1],[0,0,-1],[0,1,0],[0,-1,0],[1,0,0],[-1,0,0]].flatMap(v => [v,v,v,v]);
  const i = Array.from({length:6},(_,f)=>[0,1,2,0,2,3].map(v=>v+f*4)).flat();
  return { p, n, i, material };
}

function cylinder(x, y, z, radius, height, material, segments = 20) {
  const p = [], n = [], i = [];
  for (let s=0;s<segments;s++) { const a=s/segments*Math.PI*2; const nx=Math.cos(a), nz=Math.sin(a); p.push([x+nx*radius,y-height/2,z+nz*radius],[x+nx*radius,y+height/2,z+nz*radius]); n.push([nx,0,nz],[nx,0,nz]); }
  for (let s=0;s<segments;s++) { const q=(s+1)%segments; i.push(s*2,q*2,q*2+1,s*2,q*2+1,s*2+1); }
  return { p, n, i, material };
}

function glb(parts, colors) {
  const chunks=[], views=[], accessors=[], primitives=[];
  let offset=0;
  const add=(array, componentType, type, target, min, max)=>{
    const data=Buffer.from(array.buffer); const padded=Buffer.alloc((data.length+3)&~3); data.copy(padded);
    const view=views.length; views.push({buffer:0,byteOffset:offset,byteLength:data.length,target}); chunks.push(padded); offset+=padded.length;
    const accessor=accessors.length; accessors.push({bufferView:view,componentType,count:array.length/(type==="VEC3"?3:1),type,...(min?{min,max}:{})}); return accessor;
  };
  for (const part of parts) {
    const flat=part.p.flat(), pos=new Float32Array(flat), norm=new Float32Array(part.n.flat()), ind=new Uint16Array(part.i);
    const xs=part.p.map(v=>v[0]),ys=part.p.map(v=>v[1]),zs=part.p.map(v=>v[2]);
    primitives.push({attributes:{POSITION:add(pos,5126,"VEC3",34962,[Math.min(...xs),Math.min(...ys),Math.min(...zs)],[Math.max(...xs),Math.max(...ys),Math.max(...zs)]),NORMAL:add(norm,5126,"VEC3",34962)},indices:add(ind,5123,"SCALAR",34963),material:part.material});
  }
  const binary=Buffer.concat(chunks);
  const json={asset:{version:"2.0",generator:"MIRRAI"},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives}],materials:colors.map(c=>({pbrMetallicRoughness:{baseColorFactor:c,metallicFactor:.05,roughnessFactor:.72}})),buffers:[{byteLength:binary.length}],bufferViews:views,accessors};
  const jsonData=Buffer.from(JSON.stringify(json)); const jsonPad=Buffer.alloc((jsonData.length+3)&~3,0x20); jsonData.copy(jsonPad);
  const header=Buffer.alloc(12), jh=Buffer.alloc(8), bh=Buffer.alloc(8); header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jsonPad.length+8+binary.length,8);jh.writeUInt32LE(jsonPad.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,jh,jsonPad,bh,binary]);
}

const arc=[box(0,.72,0,.58,.12,.58,1),box(0,1.08,.25,.58,.62,.1,0),...[-1,1].flatMap(a=>[-1,1].map(b=>box(a*.23,.35,b*.23,.07,.7,.07,0)))];
const halo=[cylinder(0,.78,0,.035,1.5,0),cylinder(0,.035,0,.34,.07,0),box(0,1.53,0,.72,.08,.12,1),box(-.34,1.39,0,.06,.32,.08,1),box(.34,1.39,0,.06,.32,.08,1)];
const plane=[box(0,.78,0,1.45,.12,.78,0),...[-1,1].flatMap(a=>[-1,1].map(b=>box(a*.59,.39,b*.25,.09,.78,.09,1)))];
writeFileSync(new URL("arc-chair.glb",output),glb(arc,[[.38,.24,.14,1],[.48,.34,.24,1]]));
writeFileSync(new URL("halo-lamp.glb",output),glb(halo,[[.18,.17,.15,1],[.82,.66,.3,1]]));
writeFileSync(new URL("plane-table.glb",output),glb(plane,[[.56,.36,.18,1],[.24,.16,.1,1]]));
