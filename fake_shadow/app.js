'use strict';

import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';

function main() {
  // renderer
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });
  // 물리 기반 조명은 lumens 단위의 power 속성값을 받아 현실세계의 광원과 흡사하게 조명을 렌더해 줌
  renderer.physicallyCorrectLights = true;

  // camera
  const fov = 45;
  const aspect = 2;
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 0, 0);

  // scene의 배경색을 white로 설정함.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('white');

  // 체크무늬 텍스쳐를 로드한 후, 땅의 역할을 할 plane mesh를 생성함.
  const loader = new THREE.TextureLoader();

  {
    const planeSize = 40;

    // 텍스쳐 로드 및 텍스쳐 설정값을 지정함.
    const texture = loader.load('./image/checker.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);

    // 지오메트리와 머티리얼 생성
    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    }); // 체크무늬 땅이 조명의 영향을 받을 필요가 없으므로 재질은 basic material을 사용할 것.
    planeMat.color.setRGB(1.5, 1.5, 1.5);
    // 원래 Color.setRGB()는 각 채널의 값을 0 ~ 1까지의 비율로 지정해서 색상값을 할당하지만
    // 해당 머티리얼이 텍스쳐를 할당받게 되면, 원본 텍스쳐의 각 픽셀의 색상의 R, G, B값에 각각 1.5씩 곱해주는.. 식으로 작동하는 거 같음.
    // 그래서 0x808080(회색), 0xC0C0C0(옅은 회색)에 1.5씩 곱해줘서 흰색, 옅은 흰색 체크판이 된다고 함...
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -0.5; // plane mesh는 XY축을 기준으로 생성되므로, XZ축을 기준으로 생성되려면 X축에 -90도를 곱해야 함.
    scene.add(mesh);
  }

  // 그림자 텍스쳐를 로드한 뒤, 구체 메쉬, 그림자 메쉬를 만들어서 각각 하나의 컨테이너안에 자식노드로 추가해 줌.
  const shadowTexture = loader.load('./image/roundshadow.png');
  const sphereShadowBases = []; // 각각 하나의 구체 메쉬와 그림자 메쉬가 자식노드로 추가된 Object3D들을 담아놓을 배열
  {
    // 구체 지오메트리 생성
    const sphereRadius = 1;
    const sphereWidthDivision = 32;
    const sphereHeightDivision = 16;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, sphereWidthDivision, sphereHeightDivision);

    // 그림자 지오메트리 생성
    const planeSize = 1;
    const shadowGeo = new THREE.PlaneGeometry(planeSize, planeSize);

    const numSpheres = 15; // for loop를 돌려서 만들어 낼 base(Object3D)의 총 갯수
    for (let i = 0; i < numSpheres; i++) {
      // 구체 메쉬, 그림자 메쉬를 자식노드로 묶어서 같이 움직이도록 하는 컨테이너 객체를 만듦.
      const base = new THREE.Object3D();
      scene.add(base);

      // 그림자 메쉬를 생성하여 base에 추가
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true, // 그림자 메쉬에 의해 땅이 가려보이지 않도록 투명으로 설정
        depthWrite: false // 그림자끼리 서로 겹쳐서 충돌하는 현상을 막아주는 속성. 다른 챕터에서 더 자세히 설명해준다고 함.
      });
      // for loop를 돌면서 그림자의 머티리얼을 따로 생성한 이유는, 얘내들이 공의 높이에 따라 프레임마다 투명도가 각기 다르기 때문에
      // 투명도를 각각 따로 컨트롤해주기 위해서 재질도 각각 따로 만든것임.
      // 또 그림자는 빛을 반사하지 않으니까 빛의 영향이 필요없는 basic material을 사용한 것.
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.position.y = 0.001; // 평면 메쉬와 그림자 메쉬의 높이가 같으면 z-파이팅 현상으로 깨져보이므로 GPU가 앞뒤를 구분할 수 있도록 살짝 위에 배치함.
      shadowMesh.rotation.x = Math.PI * -0.5; // -90도 곱해줘야 XZ축 기준으로 변경되겠지?
      const shadowSize = sphereRadius * 4;
      shadowMesh.scale.set(shadowSize, shadowSize, shadowSize);
      // 일단 그림자 지오메트리의 사이즈는 1로 해줬지만, 메쉬로 만들고나서 scale값을 4로 늘려준 것. 
      // 근데 내 생각에는 x, z값만 넣어주면 될 것 같은데, 아마 planeGeometry로 만든 거라서 y값을 넣어줘도 적용이 안되니까 괜찮은걸지도..?
      base.add(shadowMesh);

      // 구체 메쉬 생성하여 base에 추가
      const u = i / numSpheres; // 반복문이 진행되면서 u값은 0 ~ 1 사이의 값이 지정되겠지
      const sphereMat = new THREE.MeshPhongMaterial();
      sphereMat.color.setHSL(u, 1, 0.75); // hue값만 0 ~ 1사이의 값으로 각각 할당한 컬러값을 각각의 구체에 적용하는거지?
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.position.set(0, sphereRadius + 2, 0); // 모든 메쉬는 처음 생성됬을때는 같은 위치에 렌더가 되겠지
      base.add(sphereMesh);

      // 구체 메쉬의 y좌표값을 포함해서 나머지 요소들을 객체로 묶어서 sphereShadowBases에 차곡차곡 담아놓음.
      sphereShadowBases.push({
        base,
        sphereMesh,
        shadowMesh,
        y: sphereMesh.position.y // 얘는 animate 메소드에서 값을 바꿔주면서 위아래로 튕기는 애니메이션을 구현하려고 담아놓은 거겠지
      });
    }
  }

  // 강도가 아주 밝은 HemisphereLight 조명을 하나 생성함.
  {
    const skyColor = 0xB1E1FF; // 하늘색
    const groundColor = 0xB97A20; // 오렌지 브라운
    const intensity = 2;
    const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
    scene.add(light);
  }

  // DirectionalLight도 같이 생성해서 구체들의 윤곽과 양감(?)을 좀 더 분명하게 보여줌.
  // 위에 HemisphereLight는 이런식으로 다른 조명과 같이 사용되는 경우가 많음.
  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(0, 10, 5);
    light.target.position.set(-5, 0, 0);
    scene.add(light);
    scene.add(light.target);
  }

  // resize
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

  // animate
  function animate(t) {
    t *= 0.001 // 초 단위로 변환

    resizeRendererToDisplaySize(renderer);

    {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    // sphereShadowBases안에 담긴 각각의 객체 속 베이스, 구체 메쉬, 그림자 메쉬, 구체 메쉬의 y값에 변화를 주면서 애니메아션을 만들어줄거임.
    sphereShadowBases.forEach((sphereShadowBase, index) => {
      // destructuring assignment를 활용해서 상수값들을 할당해놓은 것임.
      const {
        base,
        sphereMesh,
        shadowMesh,
        y
      } = sphereShadowBase;

      const u = index / sphereShadowBases.length // forEach 가 실행될수록 u는 0 ~ 1 사이의 값이 할당되겠지

      // XZ축을 기준으로 한 컨테이너의 위치값을 매 프레임마다 아래와 같이 계산해 줌.
      const speed = t * 0.2; // speed값은 매 프레임마다 달라지겠지
      const angle = speed + u * Math.PI * 2 * (index % 1 ? 1 : -1);
      // 원의 좌표를 구하는 공식에서 cos, sin 메소드에 넣어줄 각도를 구하는 것.
      // 그럼 angle값은 매 프레임(speed)마다, 컨테이너(index)마다 값이 달라지겠지. -> index는 0인 경우에만 index % 1 = true가 되서 1이 리턴될거임.
      const radius = Math.sin(speed - index) * 10; // 이렇게 하면 컨테이너마다, 매 프레임마다 반지름 값이 달라지겠지
      base.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius); // XZ축을 기준으로 원의 좌표를 구하는 공식인 게 보이지

      // yOff의 변화에 따라 구체 메쉬의 y좌표값(즉 높이갚)과 그림자 메쉬의 투명도를 조절해 줌
      // Math.sin은 -1 ~ 1 사이의 값을 주기적으로 리턴하는데, 이것의 절대값만 yOff에 할당될 수 있다면, 
      // 결과적으로 yOff는 0 ~ 1 사이의 값이 주기적으로 할당될거고, sin에 들어가는 파라미터 값이 t, index에 의해서 결정되므로
      // 매 프레임마다, 컨테이너마다 서로 다른 주기를 갖는 yOff값을 할당받게 되겠지
      const yOff = Math.abs(Math.sin(t * 2 + index));
      // yOff값을 이용해서 구체를 위아래로 튕김
      /**
       * MathUtils.lerp(startPoint, endPoint, t)
       * 
       * t값이 0 ~ 1까지의 비율값만 주어질 수 있는데,
       * 이때의 비율값은 startPoint ~ endPoint 사이의 값에 대한 비율값이고,
       * 해당 비율값에 맞는 startPoint ~ endPoint 사이의 값을 리턴해 줌.
       * 
       * 예를 들어, t = 0이면, startPoint값을 리턴해주고, t = 1이면, endPoint값을 리턴해 줌.
       */
      // 모든 구체 메쉬는 기본 y값이 3으로 동일하므로, 결국 각 구체 메쉬마다 각자의 주기를 가지며 1(3 - 2) ~ 5(3 + 2) 사이의 y값을 반복 할당받겠지
      sphereMesh.position.y = y + THREE.MathUtils.lerp(-2, 2, yOff);
      // 얘도 마찬가지로 0 ~ 1사이의 값을 일정 주기로 할당받는 yOff값에 따라 1 ~ 0.25 사이의 투명도 값을 할당받게 될거임.
      // 얘는 위에 구체메쉬의 y값이랑 반대로 yOff값이 1에 가까울수록, 즉 구체 메쉬의 y값이 클수록 0.25에 가까운, 즉 더 낮은 투명도값을 할당받음.
      shadowMesh.material.opacity = THREE.MathUtils.lerp(1, 0.25, yOff); // 참고로, Material.opacity 속성값은 0.0 ~ 1.0 사이의 값만 할당받음.
    });

    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

main();