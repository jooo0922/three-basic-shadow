'use strict'

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

import {
  GUI
} from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });
  // 그림자를 드리울 수 있는 조명인 directional light으로 그림자맵을 그리려면 먼저 renderer의 그림자맵 옵션을 true로 켜야 함.
  renderer.shadowMap.enabled = true;

  // camera
  const fov = 45;
  const aspect = 2;
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 10, 20);

  // orbit controls
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, 0); // camera나 object의 .lookAt()처럼 OrbitControls의 타겟? 시점?의 위치를 바꿔주는 것.
  controls.update(); // OrbitControls에서 카메라 이동에 관하여 어떤 값이던 수정해줬으면 .update()를 호출해줘야 그 값이 적용됨.

  // scene을 생성하고 배경색을 black으로 할당함.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('black');

  // 텍스쳐를 로드한 뒤, 땅의 역할을 할 PlaneGeometry를 만들어서 material에 할당함.
  {
    const planeSize = 40;

    const loader = new THREE.TextureLoader();
    const texture = loader.load('./image/checker.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);
    // 2*2의 텍스쳐를 40*40 평면 지오메트리에 x, y축 각각에 20회씩 반복하도록 설정했으니 평면 한 칸에 텍스쳐 하나가 정확히 렌더될거임.

    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide // 평면 지오메트리에 사용되는 머티리얼이기 때문에 양면 모두 렌더링하는 옵션을 지정해준 것.
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    // 모든 scene 안의 mesh들은 1. 그림자를 드리울 수 있고, 2. 그림자의 영향을 받을 수 있도록 옵션을 설정할 수 있다.
    // 1. 그림자를 드리운다는 것은, 해당 메쉬가 조명을 받아서 다른 메쉬에 자신의 그림자를 던진다, 투영한다는 뜻이고,
    // 2. 그림자의 영향을 받는다는 것은, 다른 메쉬에 의해서 생긴 그림자로 인해서 해당 메쉬에 그 그림자가 맺혀서 색상값이 바뀐다는 뜻임.
    // 일반적으로 이런 바닥메쉬들은 그림자를 받기는 하지만, 그림자를 드리울 필요는 없을테니, receiveShadow만 활성화 하는 것임.
    mesh.receiveShadow = true;
    mesh.rotation.x = Math.PI * -0.5; // planeGeometry는 기본적으로 XY축을 기준으로 하니까, XZ축을 기준으로 하려면 평면을 X축으로 -90도 회전시켜야 함. 이거는 기억해두기!
    scene.add(mesh);
  }

  // create cube
  {
    const cubeSize = 4;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMat = new THREE.MeshPhongMaterial({
      color: '#8AC'
    });
    const mesh = new THREE.Mesh(cubeGeo, cubeMat);
    // 바닥 메쉬가 아닌 바닥 위의 메쉬들은 일반적으로 그림자를 투영하기도 하고(castShadow), 받기도 하므로(receiveShadow)
    // 두 옵션 모두 활성화해줘야 함.
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(cubeSize + 1, cubeSize / 2, 0);
    scene.add(mesh);
  }

  // create sphere
  {
    const sphereRadius = 3;
    const sphereWidthDivision = 32;
    const sphereHeightDivision = 16;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, sphereWidthDivision, sphereHeightDivision);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: '#CA8'
    });
    const mesh = new THREE.Mesh(sphereGeo, sphereMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(-sphereRadius - 1, sphereRadius + 2, 0);
    scene.add(mesh);
  }

  // dat.GUI를 이용해서 light의 color, intensity값을 조절할 수 있는 ui를 만들기 위해 color에 관한 헬퍼 클래스를 만든 것.
  class ColorGUIHelper {
    constructor(object, prop) {
      this.object = object;
      this.prop = prop;
    }

    get value() {
      return `#${this.object[this.prop].getHexString()}`
      // Color.getHexString()은 컬러값을 어떤 형태로 넣든 'ffffff' 이런식으로 #을 제외한 문자열로 변환해서 return해줌.
      // 근데 이걸 변환해서 light.color.set()에다가 넣으려면 '#ffffff'이 형태로 넣어줘야 하기 때문에
      // getter 메소드에서 gui로부터 받은 컬러값을 '#ffffff' 이 형태로 변환한 다음에 setter로 리턴해주는 거임.
    }

    set value(hexString) {
      this.object[this.prop].set(hexString);
    }
  }

  // 조명과 타겟의 위치를 둘다 gui로 값을 조절할 수 있도록 해봄. 
  function makeXYZGUI(gui, vector3, name, onChangeFn) {
    const folder = gui.addFolder(name); // 조명과 타겟 각각의 위치값 입력폼을 폴더 형태로 만들어주고,
    folder.add(vector3, 'x', -10, 10).onChange(onChangeFn);
    folder.add(vector3, 'y', -10, 10).onChange(onChangeFn);
    folder.add(vector3, 'z', -10, 10).onChange(onChangeFn);
    // 폴더 안에 vector3 객체를 인자로 받아 vector3의 x,y,z값을 dat.GUI의 입력폼으로 각각 받을 수 있도록 할거임.
    // 이 때, 시각화 헬퍼 객체의 바뀐 위치값을 씬에서 적용하려면 헬퍼 객체의 .update() 메서드를 수동으로 호출해줘야 함.
    // 그래서 값이 바뀔때마다 호출되는 onChange 메소드에 onChangeFn 함수인자 자리에 후술할 updateLight() 함수를 넣어줘서
    // 값이 바뀔 때마다 updateLight() 함수가 호출되어 helper.update()를 수동으로 해주는거임.
  }

  // directional light(직사광): 주로 태양을 표현할 때 사용.
  // 또한 말그대로 directional한, 방향이 존재하는 빛이기 때문에 빛이 어느 방향으로, 어느 타겟(지점)을 향해 진행됨을 알려주는 target값을 설정해줘야 함.
  // 또한 태양빛처럼 평행한 빛을 emit하고, 그림자를 생성할 수 있는 조명.
  // 참고로 directional light은 한 점에서 뻗어나오는 조명이 아니고,
  // '무한한 광원이' 목표를 향해서 평행하게 빛을 내리쬐는 조명임.
  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.castShadow = true; // 조명도 그림자를 드리울 수 있도록 옵션을 활성화 함.
    light.position.set(0, 10, 0);
    light.target.position.set(-5, 0, 0); // directional light은 target(목표 지점)을 생성해야 방향이 있는 빛이 생성됨.
    scene.add(light);
    scene.add(light.target);
    // directional light는 또한 target을 scene에 추가해줘야 변경된 target.position이 적용되서 묙표가 있는 방향으로 빛을 쬐어 줌. 

    /**
     * 우리가 각각 renderer, mesh, light 이런 애들의 그림자맵 옵션을 활성화해서 그림자맵을 렌더해줬는데
     * 그림자들이 제대로 렌더가 안되고 짤리고 있음. 왜 그럴까?
     * 
     * three.js에서는 조명이 생성되면 그 조명의 시점에서 조명의 타겟을 바라보는 별도의 카메라를 생성하게 됨.
     * 이 카메라가 빛의 시점에서 씬을 렌더링해서 그림자 맵을 만드는거지.
     * 그니까 그림자가 카메라 공간 안에서 벗어난 부분이 있다면, 그 부분은 렌더되지 않고 짤리겠지.
     * 
     * 그러면, 빛의 시점에서의 카메라의 속성을 조절해서 그림자가 전부 들어올 수 있게 하면 되겠지?
     * 그래서 먼저 빛의 시점에 있는 카메라를 시각화하기 위해 카메라 헬퍼 객체를 사용해볼것임.
     */
    const cameraHelper = new THREE.CameraHelper(light.shadow.camera);
    scene.add(cameraHelper);

    // DirectionalLight은 조명의 위치를 면으로, 조명의 방향을 선으로 나타내서 눈에 보이지 않는 요소의 시각화를 도와주는
    // 헬퍼 객체인 DirectionalLightHelper가 존재함. 사용법도 아래와 같이 매우 간단함.
    const helper = new THREE.DirectionalLightHelper(light);
    scene.add(helper); // 씬에 추가해줘야 시각화된 헬퍼 객체가 렌더되겠지

    // dat.GUI의 입력폼으로부터 조명과 그림자용 카메라의 값이 바뀔때마다
    // 조명, 조명 헬퍼, 그림자용 카메라, 그림자용 카메라 헬퍼를 한꺼번에 업데이트 해줄거임.
    function updateCamera() {
      light.target.updateMatrixWorld(); // 조명의 경우 값이 바뀌면 light.target을 업데이트 해줘야 함.
      helper.update(); // 조명 헬퍼도 업데이트 해주고
      light.shadow.camera.updateProjectionMatrix(); // 그림자용 카메라도 값이 바뀌면 업데이트 해주고
      cameraHelper.update(); // 그림자용 카메라 헬퍼도 업데이트 해주기
    }
    updateCamera();

    // dat.GUI에서 값을 임력받으면 directional light의 그림자용 카메라는 orthographic camera를 사용하니까
    // 해당 정사영 카메라의 left, right값을 각각 -2, 2로 나누어서 할당해주는 헬퍼 클래스를 만든 것. (top, bottom도 동일)
    class DimensionGUIHelper {
      constructor(obj, minProp, maxProp) {
        this.obj = obj;
        this.minProp = minProp;
        this.maxProp = maxProp;
      }

      get value() {
        return this.obj[this.maxProp] * 2; // getter에서 왜 굳이 기존 this.maxProp(즉 right)값이 굳이 2를 곱하는지는 잘 모르겠음...
      }

      set value(v) {
        this.obj[this.maxProp] = v / 2;
        this.obj[this.minProp] = v / -2;
      }
    }

    // dat.GUI에서 값을 입력받아 그림자용 카메라의 near, far값을 조절하는 헬퍼 클래스 (카메라 챕터에서 사용했던 클래스를 가져온거임.)
    class MinMaxGUIHelper {
      constructor(obj, minProp, maxProp, minDif) {
        this.obj = obj;
        this.minProp = minProp;
        this.maxProp = maxProp;
        this.minDif = minDif;
      }
      get min() {
        return this.obj[this.minProp];
      }
      set min(v) {
        this.obj[this.minProp] = v;
        this.obj[this.maxProp] = Math.max(this.obj[this.maxProp], v + this.minDif);
      }
      get max() {
        return this.obj[this.maxProp];
      }
      set max(v) {
        this.obj[this.maxProp] = v;
        this.min = this.min; // this will call the min setter
      }
    }

    const gui = new GUI();
    gui.addColor(new ColorGUIHelper(light, 'color'), 'value').name('color'); // GUI.addColor() 메소드는 일반적인 입력폼이 아니라 color picker 입력폼을 생성해 줌.
    gui.add(light, 'intensity', 0, 2, 0.01);
    // directional light의 그림자용 카메라의 left, right, top, bottom, near, far, zoom값을 dat.GUI로 조절할 수 있는 
    // folder를 추가하고, 각각의 값에 변화를 줄 수 있는 입력폼들을 폴더 안에 추가해 줌.
    // 각각의 입력폼에 입력하는 값에 변화가 생기면 그림자용 카메라의 속성값이 바뀌었다는 뜻이므로,
    // onChange를 통해 updateCamera 함수를 호출해서 그림자용 카메라 업데이트도 해줘야 함.
    {
      const folder = gui.addFolder('Shadow Camera');
      folder.open(); // 폴더는 기본값이 항상 열려있는 상태로...
      folder.add(new DimensionGUIHelper(light.shadow.camera, 'left', 'right'), 'value', 1, 100)
        .name('width')
        .onChange(updateCamera);
      folder.add(new DimensionGUIHelper(light.shadow.camera, 'bottom', 'top'), 'value', 1, 100)
        .name('height')
        .onChange(updateCamera);
      const minMaxGUIHelper = new MinMaxGUIHelper(light.shadow.camera, 'near', 'far', 0.1);
      folder.add(minMaxGUIHelper, 'min', 0.1, 50, 0.1).name('near').onChange(updateCamera);
      folder.add(minMaxGUIHelper, 'max', 0.1, 50, 0.1).name('far').onChange(updateCamera);
      folder.add(light.shadow.camera, 'zoom', 0.01, 1.5, 0.01).onChange(updateCamera);
    }

    // dat.GUI 입력폼으로부터 조명값이 바뀌면 updateCamera 함수에서 조명과 조명헬퍼도 한꺼번에 업데이트 해줄거임.
    makeXYZGUI(gui, light.position, 'position', updateCamera);
    makeXYZGUI(gui, light.target.position, 'target', updateCamera);
  }

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function animate() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

main();