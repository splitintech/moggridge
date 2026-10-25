import React, { useState } from 'react';
import { motion, type MotionValue } from 'framer-motion';
import { cardMotionPresets } from '../../src/core';
import { MorphingSurface, SurfaceSlideTrack, useSurfaceImageScale } from '../../src/web';

const slides = [
  { image: 'back-bay.jpg', title: 'A little room to breathe.', alt: "Boston's Back Bay and Charles River" },
  { image: 'north-end.jpg', title: 'Follow the feeling.', alt: "Boston's North End neighborhood" },
  { image: 'south-end.jpg', title: 'Right back where you started.', alt: "Boston's South End neighborhood" },
];

function StudyContent({ close, progress, fullscreen }: { close: () => void; progress: MotionValue<number>; fullscreen: boolean }) {
  const [index, setIndex] = useState(0);
  const scale = useSurfaceImageScale(progress, { enabled: fullscreen });
  return <div className="motion-workshop-portal card-study-content">
    <div className="card-study-viewport">
      <SurfaceSlideTrack index={index} slideCount={slides.length} className="card-study-track" data-testid="card-study-track">
        {slides.map((slide, i) => <section key={slide.image} className="card-study-slide" aria-hidden={i !== index}>
          <div className="card-study-media"><motion.img src={`/card-motion/${slide.image}`} alt={slide.alt} style={{ scale }} draggable={false} /></div>
          <h3>{slide.title}</h3>
        </section>)}
      </SurfaceSlideTrack>
    </div>
    <p aria-live="polite">Slide {index + 1} of {slides.length}</p>
    <div className="card-study-controls">
      <button disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Previous slide</button>
      <button disabled={index === slides.length - 1} onClick={() => setIndex(i => i + 1)}>Next slide</button>
      <button onClick={close}>Close and return</button>
    </div>
  </div>;
}

/** Original listing, button and pill studies use only public package behavior. */
export function CardMotionStudies() {
  return <div className="card-studies">
    {(['listing', 'button', 'pill'] as const).map(kind => <div key={kind}>
      <MorphingSurface id={`card-study-${kind}`} label={`${kind} study`} description="Expand, slide, and return to the original shape."
        presentation={kind === 'listing' ? 'fullscreen' : 'right'} radius={kind === 'pill' ? 22 : 16}
        spring={cardMotionPresets.surface} triggerClassName={`card-study-trigger card-study-trigger--${kind}`}
        trigger={kind === 'listing' ? <><img src="/card-motion/back-bay.jpg" alt="" /><strong>Open listing study</strong></> : `Open ${kind} study`}>
        {(close, progress) => <StudyContent close={close} progress={progress} fullscreen={kind === 'listing'} />}
      </MorphingSurface>
      <p>{kind === 'listing' ? '9:16 card → full screen' : `${kind} → right-edge expansion`}</p>
    </div>)}
  </div>;
}
