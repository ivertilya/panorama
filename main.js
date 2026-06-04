
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xffffff);

const camera=new THREE.PerspectiveCamera(120,innerWidth/innerHeight,0.1,5000);
camera.position.set(0,0,0.01);

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enablePan=false;
controls.enableZoom=false;
controls.target.set(0,0,-1);

const gridGroup=new THREE.Group();
scene.add(gridGroup);

let horizonLine;

function buildGrid(){
  gridGroup.clear();

  const size=1000;
  const step=50;

  for(let x=-size;x<=size;x+=step){
    for(let y=-size;y<=size;y+=step){

      addLine(
        new THREE.Vector3(x,y,-size),
        new THREE.Vector3(x,y,size)
      );

    }
  }

  for(let x=-size;x<=size;x+=step){
    for(let z=-size;z<=size;z+=step){

      addLine(
        new THREE.Vector3(x,-size,z),
        new THREE.Vector3(x,size,z)
      );

    }
  }

  for(let y=-size;y<=size;y+=step){
    for(let z=-size;z<=size;z+=step){

      addLine(
        new THREE.Vector3(-size,y,z),
        new THREE.Vector3(size,y,z)
      );

    }
  }

  const hg=new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-size,0,0),
    new THREE.Vector3(size,0,0)
  ]);

  horizonLine=new THREE.Line(
    hg,
    new THREE.LineBasicMaterial({color:0xff0000})
  );

  scene.add(horizonLine);
}

function addLine(a,b){

  const d=(a.length()+b.length())/2;

  let c=0.2;

  if(document.getElementById('fog')?.checked){
    c=Math.min(0.95,0.15+d/1800);
  }

  const mat=new THREE.LineBasicMaterial({
    color:new THREE.Color(c,c,c)
  });

  const geo=new THREE.BufferGeometry().setFromPoints([a,b]);

  gridGroup.add(new THREE.Line(geo,mat));
}

buildGrid();

document.getElementById('fog').addEventListener('change',()=>{
  buildGrid();
});

document.getElementById('horizon').addEventListener('change',e=>{
  horizonLine.visible=e.target.checked;
});

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene,camera);
}
animate();

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
