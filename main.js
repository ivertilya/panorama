import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

let perspective = new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.1,10000);
perspective.position.set(150,120,150);

let ortho = new THREE.OrthographicCamera(
 innerWidth/-10, innerWidth/10, innerHeight/10, innerHeight/-10, 0.1, 10000
);
ortho.position.copy(perspective.position);

let camera = perspective;

const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);
document.getElementById('canvas').appendChild(renderer.domElement);

const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AxesHelper(100));
scene.add(new THREE.GridHelper(5000,500));

const keys={};
addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

function move(){
 const v=new THREE.Vector3();
 if(keys.w)v.z-=1;
 if(keys.s)v.z+=1;
 if(keys.a)v.x-=1;
 if(keys.d)v.x+=1;
 if(keys.q)v.y+=1;
 if(keys.e)v.y-=1;
 v.multiplyScalar(1.5);
 camera.position.add(v);
}

function animate(){
 requestAnimationFrame(animate);
 move();
 controls.update();
 renderer.render(scene,camera);
}
animate();

document.getElementById('toggleProjection').onclick=()=>{
 if(camera===perspective){
   ortho.position.copy(camera.position);
   camera=ortho;
 }else{
   perspective.position.copy(camera.position);
   camera=perspective;
 }
 controls.object=camera;
 controls.update();
};

document.getElementById('saveView').onclick=()=>{
 localStorage.setItem('pg_view',JSON.stringify({
   pos:camera.position.toArray()
 }));
};

document.getElementById('loadView').onclick=()=>{
 const d=JSON.parse(localStorage.getItem('pg_view')||'null');
 if(!d)return;
 camera.position.fromArray(d.pos);
};

document.getElementById('exportPNG').onclick=()=>{
 const a=document.createElement('a');
 a.download='perspective-grid.png';
 a.href=renderer.domElement.toDataURL('image/png');
 a.click();
};

addEventListener('resize',()=>{
 renderer.setSize(innerWidth,innerHeight);
 perspective.aspect=innerWidth/innerHeight;
 perspective.updateProjectionMatrix();
});
