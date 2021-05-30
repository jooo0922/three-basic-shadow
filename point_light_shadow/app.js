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
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(cubeSize + 1, cubeSize / 2, 0);
    scene.add(mesh);
  }

  /**
   * 씬 주위를 둘러싸는 상자를 생성함. 
   * 
   * why? 지금 point light에 의해 생성되는 그림자를 보고 싶은거잖아. 근데 point light이 생성하는 그림자는 결국
   * 육면체의 각 면에 spot light을 하나씩, 총 6개의 그림자를 렌더해주는 것과 같음. 그니까 사방으로 그림자가 렌더된다는 거지.
   * 
   * 그럼 결국 6개의 면에서 빛이 발산해서 그림자를 cast 하는 상황에서는
   * 광원 주변이 뚫려있으면 광원에 의해 그림자가 맺힐 만한 mesh가 없으면 확인할 수가 없지?
   * 그래서 그 주변을 둘러싸는 상자 하나를 만든거임  
   */
  {
    const cubeSize = 30;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMat = new THREE.MeshPhongMaterial({
      color: '#CCC',
      side: THREE.BackSide, // 상자 내부 벽면에 맺히는 그림자를 확인해보고 싶은거니까 상자 안쪽 면, 그니까 BackSide만 렌더링해주면 됨.
    });
    const mesh = new THREE.Mesh(cubeGeo, cubeMat);
    mesh.receiveShadow = true; // 상자 내부 벽면은 point light에 의해 생성되는 그림자가 맺히기만 하면 되니까 receiveShadow만 활성화함.
    mesh.position.set(0, cubeSize / 2 - 0.1, 0) // 바닥 메쉬와 겹쳐서 z-파이팅 현상이 발생하지 않도록 상자 밑면을 바닥메쉬보다 살짝 아래에 위치하도록 y좌표값을 할당함.
    /**
     * 조심해야 하는 게, 지금 상자 mesh의 y좌표값이 14.9? 그 정도 되고, 
     * 바닥 메쉬는 position을 따로 지정하지 않았으니까 y좌표값이 0일텐데,
     * 왜 상자 메쉬가 바닥 메쉬보다 약간 아래에 위치하게 되는걸까?
     * 
     * 바닥 메쉬는 y좌표값이 0인 높이에 위치하는 게 맞는데,
     * 지금 cube같은 경우는 원래 y값이 0이었다면 cube의 높이 정 가운데가 (0, 0, 0)자리에 와야 하는거임.
     * 그니까 볼륨이 있는 박스 메쉬들을 씬에 추가하면 해당 메쉬의 정 가운데 부분이 씬의 원점에 위치하는 게 원래 맞는거지.
     * 그래서 박스의 밑면이 씬의 원점에 오게 하려면 y좌표값을 '박스 높이 / 2'로 지정해줘야 하는거임.
     * 
     * 근데 위에서도 말했듯이 박스의 밑면과 바닥 메쉬가 겹치면 z-파이팅 현상으로 깨져보이기 때문에
     * 정확히 30 / 2 = 15가 아니라 거기서 0.1 정도를 뺀 14.9로 해줘서 박스 메쉬의 밑면을 바닥메쉬보다 0.1정도 낮게 위치시킨거임.
     */
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

  // point light: 한 점에서 사방으로 무한히 뻗어나가는 광원.
  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.PointLight(color, intensity);
    light.castShadow = true;
    light.position.set(0, 10, 0);
    scene.add(light);
    // point light는 directional light와 달리 특정한 target이 필요없으므로, 생성도 안하고, 씬에 추가하지도 않음. 

    // PointLight도 spherical Mesh로 빛을 시각화해주는 헬퍼 객체가 존재함.
    // 참고로 PointLightHelper는 점의 표상을 그린다. 
    // '점의 표상'이란, 이론적으로 광원이 '점'이긴 하지만, 그렇다고 점으로 시각화하면 잘 안보일테니
    // 기본값으로 다이아몬드 형태의 와이어프레임을 대신 그려놓은 것이다. 이 형태는 조명에 mesh객체를 넘겨서 다른 형태로 바꿀 수 있음.
    const helper = new THREE.PointLightHelper(light);
    scene.add(helper); // 씬에 추가해줘야 시각화된 헬퍼 객체가 렌더되겠지

    function updateCamera() {}

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
    gui.add(light, 'distance', 0, 40).onChange(updateCamera);
    // point light은 추가로 distance라는 property도 조절할 수 있는데,
    // distance가 0이면 밝기가 무한대고, 0보다 크면 지정된 거리만큼만 빛을 비추어 줌.
    // 이 값도 바꿔주고 나서 헬퍼 객체를 업데이트 해줘야 시각화에 반영되기 때문에 값이 변경됬을 때 updateLight 함수를 호출해주는 것. 

    // dat.GUI 입력폼으로부터 입력값을 받은 뒤 point light의 그림자용 카메라의 속성값을 바꿔주는 folder를 추가함
    {
      const folder = gui.addFolder('Shadow Camera');
      folder.open();
      const minMaxGUIHelper = new MinMaxGUIHelper(light.shadow.camera, 'near', 'far', 0.1);
      folder.add(minMaxGUIHelper, 'min', 0.1, 50, 0.1).name('near').onChange(updateCamera);
      folder.add(minMaxGUIHelper, 'max', 0.1, 50, 0.1).name('far').onChange(updateCamera);
    }

    // point light는 타겟이 필요없으니 조명의 위치에 대해서만 입력값을 받아서 조정하고, 헬퍼 객체 시각화를 씬에서 업데이트 하도록 함.
    makeXYZGUI(gui, light.position, 'position', updateCamera);
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
    resizeRendererToDisplaySize(renderer)

    {
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