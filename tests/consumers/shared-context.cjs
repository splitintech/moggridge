const assert = require('node:assert/strict');
(async () => {
 const load = name => process.argv[2] === 'esm' ? import(name) : Promise.resolve(require(name));
 const react = await load('react'), React = react.default || react;
 const {renderToString} = await load('react-dom/server');
 const {MemoryRouter} = await load('react-router-dom');
 const {MotionProvider, TransitionHost, SurfaceSlideTrack, useSurfaceImageScale} = await load('@splitin/react-mobile-interactions/web');
 const {useMotionRouter} = await load('@splitin/react-mobile-interactions/integrations/react-router');
 const {createPolicyMotion} = await load('@splitin/react-mobile-interactions/web/compat');
 const motion = createPolicyMotion();
 function Probe() {
  useMotionRouter(); // Must see the host imported from a different public subpath.
  const scale = useSurfaceImageScale();
  assert.equal(scale.get(), 1);
  return React.createElement(SurfaceSlideTrack, {index:1, slideCount:3},
   React.createElement(motion.div, {initial:{opacity:0},animate:{opacity:1}}, 'Shared context'));
 }
 const html = renderToString(React.createElement(MemoryRouter, null,
  React.createElement(MotionProvider, {enabled:false},
   React.createElement(TransitionHost, null, React.createElement(Probe)))));
 assert.ok(html.includes('Shared context'));
 assert.ok(html.includes('translateX(-100%)'), 'packed slide track renders the controlled destination in SSR');
 assert.ok(html.includes('transition-duration:0s'), 'compat subpath must consume the web provider policy');
 assert.ok(html.includes('opacity:1'), 'disabled motion must render the final value');
 console.log(process.argv[2] + ' packed subpaths share their host and policy contexts');
})().catch(error => { console.error(error); process.exitCode = 1; });
