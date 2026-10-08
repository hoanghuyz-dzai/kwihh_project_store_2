// 3D background (Three.js). Adapts to weak devices; pauses when the tab is hidden.
export function startBackground() {
  const canvas = document.getElementById('bg');
  if (!window.THREE || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const T = window.THREE, weak = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  let renderer; try { renderer = new T.WebGLRenderer({ canvas, antialias: !weak, alpha: true }); } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, weak ? 1 : 2));
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(60, 1, .1, 100); cam.position.z = 9;
  const N = weak ? 450 : 1800, pos = new Float32Array(N * 3); for (let i = 0; i < pos.length; i++) pos[i] = (Math.random() - .5) * 34;
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3));
  const points = new T.Points(pg, new T.PointsMaterial({ color: 0x00e5ff, size: .045, transparent: true, opacity: .85, blending: T.AdditiveBlending })); scene.add(points);
  const hero = new T.Group(); // big futuristic cube: wireframe shell + inner icosahedron
  hero.add(new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(3.2, 3.2, 3.2)), new T.LineBasicMaterial({ color: 0x00e5ff })));
  hero.add(new T.Mesh(new T.IcosahedronGeometry(1.5, 1), new T.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true })));
  hero.position.set(innerWidth < 900 ? 0 : 4.2, 0, -3); scene.add(hero);
  const floaters = [[0xff3df2, -5, 2], [0x00e5ff, -3, -2.5], [0x8b5cf6, 6, 3]].map(([c, x, y]) => { const m = new T.Mesh(new T.OctahedronGeometry(.7), new T.MeshBasicMaterial({ color: c, wireframe: true })); m.position.set(x, y, -4); scene.add(m); return m; });
  const grid = new T.GridHelper(50, 50, 0x8b5cf6, 0x1c1c3a); grid.position.y = -6; scene.add(grid);
  let mx = 0, my = 0, scroll = 0; addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }); addEventListener('scroll', () => { scroll = scrollY / 1500; }, { passive: true });
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }; resize(); addEventListener('resize', resize);
  (function loop(t = 0) {
    requestAnimationFrame(loop); if (document.hidden) return;
    points.rotation.y = t * 0.00004; hero.rotation.x = t * 0.0003; hero.rotation.y = t * 0.0005; floaters.forEach((f, i) => { f.rotation.x += .006; f.rotation.y += .008; f.position.y += Math.sin(t * .001 + i) * .003; });
    cam.position.x += (mx * 3 - cam.position.x) * .04; cam.position.y += (-my * 2 - scroll * 4 - cam.position.y) * .04; cam.lookAt(0, 0, 0); renderer.render(scene, cam);
  })();
}
