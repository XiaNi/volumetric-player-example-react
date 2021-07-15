import React, { useEffect, useRef, useState } from 'react';
import DracosisPlayer from "volumetric/web/decoder/Player";
import DracosisPlayerWorker from "volumetric/web/decoder/workerFunction.ts?worker";
import {
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  sRGBEncoding, Object3D, Group
} from "three";
import { OrbitControls } from "three-stdlib";

const cameraOrbitingHeight = 1.7;
const cameraDistance = 6.5;
const cameraVerticalOffset = 0.4;
const cameraFov = 35;

type VolumetricPlayerProps = {
  manifestFilePath: string,
  meshFilePath: string,
  videoFilePath: string,
  style: any
}

const VolumetricPlayer = (props:VolumetricPlayerProps) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer|null>(null);
  const playerRef = useRef<DracosisPlayer|null>(null);
  const anchorRef = useRef<Object3D|null>(null);
  const sceneRef = useRef<Object3D|null>(null);
  const cameraRef = useRef<PerspectiveCamera|null>(null);
  const controlsRef = useRef<OrbitControls|null>(null);
  let animationFrameId:number;
  const [dracosisSequence, setDracosisSequence] = useState<DracosisPlayer|null>(null);
  const [playIsStarted, setPlayIsStarted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingProgress, setBufferingProgress] = useState(0);
  const videoReady = !!dracosisSequence;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (!canvasRef.current) {
      return;
    }

    let w = (container as any).clientWidth,
      h = (container as any).clientHeight;
    if (!sceneRef.current) {
      sceneRef.current = new Scene();
    }
    const scene = sceneRef.current;

    if (!anchorRef.current) {
      anchorRef.current = new Group();
    }
    const anchor = anchorRef.current;
    scene.add(anchor);

    if (!cameraRef.current) {
      cameraRef.current = new PerspectiveCamera(cameraFov, w / h, 0.001, 100);
    }
    const camera = cameraRef.current;
    if (!controlsRef.current) {
      controlsRef.current = new OrbitControls(camera, container);
      controlsRef.current.addEventListener('change', () => {
        renderNeedsUpdate = true;
      });
    }
    const controls = controlsRef.current;

    const renderConfig = {
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    };
    if (!rendererRef.current) {
      rendererRef.current = new WebGLRenderer(renderConfig);
    }
    let renderer = rendererRef.current;
    if (controls) {
      controls.target = new Vector3(0, cameraOrbitingHeight, 0);
      controls.panSpeed = 0.4;
      camera.position.set(0, cameraOrbitingHeight, cameraDistance);
      camera.lookAt(controls.target);
    }
    renderer.outputEncoding = sRGBEncoding;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    (container as any).appendChild(renderer.domElement);
    const onResize = function () {
      console.log('onResize!');
      w = (container as any).clientWidth;
      h = (container as any).clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      setCameraOffset();
      renderNeedsUpdate = true;
    };

    window.addEventListener('resize', onResize);

    /**
     * shift camera from it's center
     */
    function setCameraOffset() {
      const fullWidth = w;
      const fullHeight = h + h * Math.abs(cameraVerticalOffset);
      const width = w;
      const height = h;
      const x = 0;
      const y = h * cameraVerticalOffset;
      /*
        fullWidth — full width of multiview setup
        fullHeight — full height of multiview setup
        x — horizontal offset of subcamera
        y — vertical offset of subcamera
        width — width of subcamera
        height — height of subcamera
       */
      camera.setViewOffset(fullWidth, fullHeight, x, y, width, height);
    }
    setCameraOffset();

    let renderNeedsUpdate = false;
    function render() {
      animationFrameId = requestAnimationFrame(render);
      playerRef.current?.handleRender(() => {
        renderNeedsUpdate = true;
      });
      controls?.update();

      if (renderNeedsUpdate) {
        renderer.render(scene, camera);
        renderNeedsUpdate = false;
      }
    }

    console.log('create new player');
    // dummy to test
    // const box = new Mesh(
    //   new BoxBufferGeometry(0.5, 1.45, 0.5),
    //   new MeshNormalMaterial()
    // );
    // box.position.y = 1.45 / 2;
    // scene.add(box);
    //
    // const head = new Mesh(
    //   new SphereBufferGeometry(0.25),
    //   new MeshNormalMaterial()
    // );
    // head.position.y = 1.7;
    // scene.add(head);

    if (!playerRef.current) {
      playerRef.current = new DracosisPlayer({
        scene: anchor,
        renderer,
        manifestFilePath: props.manifestFilePath,
        meshFilePath: props.meshFilePath,
        videoFilePath: props.videoFilePath,
        worker: new DracosisPlayerWorker(),
        autoplay: false,
        onMeshBuffering: (progress) => {
          console.warn('BUFFERING!!', progress);
          setBufferingProgress(Math.round(progress * 100));
          setIsBuffering(true);
        },
        onFrameShow: () => {
          setIsBuffering(false);
        }
      });
    }

    setDracosisSequence(playerRef.current);

    console.log('+++  dracosisSequence');

    render();

    return () => {
      console.log('+++ CLEANUP player');

      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      // clear volumetric player
      playerRef.current?.dispose();

      playerRef.current = null;
      sceneRef.current = null;
      anchorRef.current = null;
      cameraRef.current = null;

      controlsRef.current?.dispose();
      controlsRef.current = null;

      setDracosisSequence(null);
      setPlayIsStarted(false);
      setIsBuffering(false);
    };
  }, []);

  function startPlayer() {
    if (videoReady && dracosisSequence) {
      dracosisSequence.play();
      setPlayIsStarted(true);
    }
  }

  function advanceOneFrame() {
    console.log('advanceOneFrame');
    if (videoReady && dracosisSequence) {
      dracosisSequence.playOneFrame();
    }
  }

  const playButton = <button onTouchEnd={() => startPlayer()} onClick={() => startPlayer()} className={"button player-play"}>{videoReady ? "Play" : "Loading..."}</button>;
  const oneFrameButton = <button onTouchEnd={() => advanceOneFrame()} onClick={() => advanceOneFrame()} className={"button player-one-frame"}>{videoReady ? "One frame" : "Loading..."}</button>;
  const bufferingIndication = playIsStarted && isBuffering ? <div className={"buffering-indication"}>Buffering...</div> : null;
  const buffering2Indication = isBuffering ? <div className={"buffering-indication-top"}>Buffering...</div> : null;

  return <div className="volumetric__player" style={props.style} ref={containerRef}>
    {playButton}
    {oneFrameButton}
    {bufferingIndication}
    {buffering2Indication}
    <canvas
      ref={canvasRef}
      className={"mainCanvas"}
    />
  </div>;
};

export default VolumetricPlayer;
