import React, { useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  motionPresets,
  type MotionEvent,
  type MotionFamily,
  type MotionPolicy,
} from "../../src/core";
import {
  MotionProvider,
  PressableSurface,
  SelectionIndicator,
  ElasticSheet,
  SnapCarousel,
  DismissibleSurface,
  ReorderGroup,
  LayoutFlow,
  LayoutFlowItem,
  AnchoredMenu,
  FavoriteButton,
  SettlingProgress,
  Anticipation,
  RewardSequence,
  AnimatedNumber,
  AnimatedText,
  StaggerGroup,
  TiltSurface,
  TransitionHost,
  MorphingSurface,
  MediaHost,
  MediaSlot,
  useMediaHost,
  useTransitionHost,
} from "../../src/web";
import { useMotionRouter } from "../../src/integrations/react-router";
import "./style.css";
import { CardMotionStudies } from "./CardMotionStudies";
export function MotionWorkshop() {
  const [preset, setPreset] = useState<MotionFamily>("precise"),
    [reduced, setReduced] = useState<MotionPolicy>("system"),
    [enabled, setEnabled] = useState(true),
    [rtl, setRtl] = useState(false),
    [large, setLarge] = useState(false),
    [disabled, setDisabled] = useState(false),
    [pending, setPending] = useState(false),
    [reset, setReset] = useState(0),
    [tab, setTab] = useState("Catalog"),
    [events, setEvents] = useState<string[]>([]),
    [stiffness, setStiffness] = useState(500),
    [damping, setDamping] = useState(30),
    [mass, setMass] = useState(0.5);
  const [mediaDestination, setMediaDestination] = useState<string | null>(null);
  const spring = useMemo(
    () => ({ stiffness, damping, mass }),
    [stiffness, damping, mass],
  );
  const log = (message: string) =>
    setEvents((old) => [message, ...old].slice(0, 12));
  const config = {
    preset,
    reducedMotion: reduced,
    enabled,
    spring,
    rtl,
    largeText: large,
    disabled,
    pending,
  };
  const exportConfig = () => {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(config, null, 2)], {
          type: "application/json",
        }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = "motion-config.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <MotionProvider
      preset={preset}
      spring={spring}
      enabled={enabled}
      reducedMotion={reduced}
      haptics={(intent) => log(`haptic · ${intent}`)}
    >
      <div
        className={`workshop ${large ? "large-text" : ""}`}
        dir={rtl ? "rtl" : "ltr"}
      >
        <header>
          <a className="brand" href="/">
            split<span>in</span>
            <i> / MOTION WORKSHOP</i>
          </a>
          <span>WEB ADAPTER · BETA</span>
        </header>
        <div className="intro">
          <div>
            <p className="eyebrow">SMALL DETAILS. BETTER MOVEMENT.</p>
            <h1>
              Feel the
              <br />
              <em>difference.</em>
            </h1>
          </div>
          <p>
            A working bench for the interactions that make a shared home feel
            effortless.
            <br />
            <small>
              Change the physics. Interrupt a transition. Try it with a
              keyboard.
            </small>
          </p>
        </div>
        <div className="workspace">
          <aside>
            <h2>01 / Tune the system</h2>
            <label>
              Preset
              <select
                value={preset}
                onChange={(event) => {
                  const value = event.target.value as MotionFamily;
                  setPreset(value);
                  setStiffness(motionPresets[value].stiffness);
                  setDamping(motionPresets[value].damping);
                  setMass(motionPresets[value].mass);
                }}
              >
                <option>precise</option>
                <option>soft</option>
                <option>celebratory</option>
              </select>
            </label>
            <label>
              Stiffness <output>{stiffness}</output>
              <input
                type="range"
                min="80"
                max="800"
                value={stiffness}
                onChange={(event) => setStiffness(+event.target.value)}
              />
            </label>
            <label>
              Damping <output>{damping}</output>
              <input
                type="range"
                min="5"
                max="80"
                value={damping}
                onChange={(event) => setDamping(+event.target.value)}
              />
            </label>
            <label>
              Mass <output>{mass}</output>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={mass}
                onChange={(event) => setMass(+event.target.value)}
              />
            </label>
            <label>
              Reduced motion
              <select
                value={reduced}
                onChange={(event) =>
                  setReduced(event.target.value as MotionPolicy)
                }
              >
                <option>system</option>
                <option>always</option>
                <option>never</option>
              </select>
            </label>
            {[
              ["Motion enabled", enabled, setEnabled],
              ["Right to left", rtl, setRtl],
              ["Large text", large, setLarge],
              ["Disabled controls", disabled, setDisabled],
              ["Pending actions", pending, setPending],
            ].map(([label, checked, setter]) => (
              <label className="check" key={String(label)}>
                <input
                  type="checkbox"
                  checked={checked as boolean}
                  onChange={(event) =>
                    (setter as (value: boolean) => void)(event.target.checked)
                  }
                />
                {label as string}
              </label>
            ))}
            <button
              className="primary"
              onClick={() => setReset((value) => value + 1)}
            >
              Reset scenes
            </button>
            <button onClick={exportConfig}>Export configuration ↓</button>
            <details>
              <summary>Provider source</summary>
              <pre>{`<MotionProvider\n preset="${preset}"\n reducedMotion="${reduced}"\n spring={${JSON.stringify(spring)}}\n>\n  <YourInterface />\n</MotionProvider>`}</pre>
            </details>
          </aside>
          <main>
            <nav aria-label="Workshop sections">
              {["Catalog", "Card studies", "Spatial & media", "Recipes"].map((value) => (
                <button
                  key={value}
                  aria-pressed={tab === value}
                  onClick={() => setTab(value)}
                >
                  {value}
                </button>
              ))}
            </nav>
            <MediaHost
              destination={mediaDestination}
              onDestinationChange={setMediaDestination}
              style={{
                zIndex: mediaDestination === "expanded" ? 1002 : undefined,
              }}
              key={reset}
              renderMedia={
                <video
                  data-testid="persistent-video"
                  tabIndex={0}
                  src="/continuity.mp4"
                  controls
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    background: "#183c2e",
                  }}
                />
              }
            >
              <TransitionHost>
                <Scenes
                  tab={tab}
                  disabled={disabled}
                  pending={pending}
                  log={log}
                />
              </TransitionHost>
            </MediaHost>
            <section className="diagnostics">
              <h2>Lifecycle log</h2>
              <button onClick={() => setEvents([])}>Clear</button>
              <ol aria-live="polite">
                {events.map((event, index) => (
                  <li key={index}>{event}</li>
                ))}
              </ol>
              <small>
                Frames stay outside React state. Physical-device qualification
                is a separate gate.
              </small>
            </section>
          </main>
        </div>
        <footer>
          13 interaction patterns · one motion policy · keyboard alternatives
          throughout
        </footer>
      </div>
    </MotionProvider>
  );
}
function Scene({
  number,
  title,
  description,
  code,
  children,
}: {
  number: string;
  title: string;
  description: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <article className="scene">
      <div className="scene-heading">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      <p>{description}</p>
      <div className="stage">{children}</div>
      <details>
        <summary>View source</summary>
        <pre>{code}</pre>
      </details>
    </article>
  );
}
function Scenes({
  tab,
  disabled,
  pending,
  log,
}: {
  tab: string;
  disabled: boolean;
  pending: boolean;
  log: (message: string) => void;
}) {
  const [sheet, setSheet] = useState(false),
    [selected, setSelected] = useState("Monthly"),
    [target, setTarget] = useState<HTMLButtonElement | null>(null),
    [liked, setLiked] = useState(false),
    [progress, setProgress] = useState(45),
    [active, setActive] = useState(false),
    [reward, setReward] = useState(0),
    [dismissed, setDismissed] = useState(false),
    [items, setItems] = useState([
      "Kitchen",
      "Living room",
      "Bedroom",
      "Garden",
    ]),
    [blocks, setBlocks] = useState([1, 2, 3]);
  const selectionRef = useRef<HTMLDivElement>(null),
    host = useTransitionHost(),
    media = useMediaHost(),
    router = useMotionRouter(),
    location = useLocation();
  const event = (event: MotionEvent) =>
    log(
      `transition ${event.id} · ${event.phase}${event.reason ? ` · ${event.reason}` : ""}`,
    );
  const mediaContent = (
    <div className="motion-workshop-portal">
      <div className="expanded-content">
        <h2>Same player. More room.</h2>
        <MediaSlot
          slotId="expanded"
          activateOnMount
          className="media-expanded"
        />
        <p>
          The video remains under one stable parent throughout this transition.
        </p>
      </div>
    </div>
  );
  return (
    <>
      {tab === "Card studies" && <Scene number="18" title="Original card studies"
        description="The original listing, button and pill: reversible expansion, image pullback and spring slides, now shared package APIs."
        code={'<MorphingSurface spring={cardMotionPresets.surface} ... /><SurfaceSlideTrack index={index} slideCount={3} />; const scale = useSurfaceImageScale(progress);'}>
        <CardMotionStudies />
      </Scene>}
      {tab === "Catalog" && (
        <div className="scenes">
          <Scene
            number="01"
            title="Press compression"
            description="A 0.97 scale with a predictable release."
            code={"<PressableSurface>Continue</PressableSurface>"}
          >
            <PressableSurface
              className="primary"
              disabled={disabled}
              onClick={() => log("press · completed")}
            >
              Continue →
            </PressableSurface>
          </Scene>
          <Scene
            number="02"
            title="Mechanical press"
            description="Three pixels of travel. A deliberately tactile action."
            code={'<PressableSurface variant="mechanical" />'}
          >
            <PressableSurface
              className="mechanical"
              variant="mechanical"
              disabled={disabled}
            >
              Reserve your spot
            </PressableSurface>
          </Scene>
          <Scene
            number="03"
            title="Sliding selection"
            description="The indicator follows measured item geometry."
            code={"<SelectionIndicator target={element} container={parent} />"}
          >
            <div className="segmented" ref={selectionRef}>
              <SelectionIndicator
                target={target}
                container={selectionRef.current}
                className="selection-indicator"
              />
              {["Monthly", "Yearly", "Flexible"].map((value) => (
                <button
                  key={value}
                  ref={(element) => {
                    if (value === selected && element && element !== target)
                      setTarget(element);
                  }}
                  aria-pressed={selected === value}
                  disabled={disabled}
                  onClick={() => setSelected(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </Scene>
          <Scene
            number="04"
            title="Elastic sheets"
            description="Drag the handle or use expand/collapse controls. Content scrolls independently."
            code={
              "<ElasticSheet open={open} snapPoints={[0, 220, 420]} dismissOffset={560} />"
            }
          >
            <button disabled={disabled} onClick={() => setSheet(true)}>
              Open sheet ↑
            </button>
            <ElasticSheet
              open={sheet}
              onOpenChange={setSheet}
              label="Home details"
              snapPoints={[0, 220, 420]}
              dismissOffset={560}
            >
              {Array.from({ length: 18 }, (_, index) => (
                <p key={index}>
                  Room detail {index + 1} — scroll inside the sheet.
                </p>
              ))}
              <label>
                Ask your host
                <input placeholder="Keyboard avoidance" />
              </label>
            </ElasticSheet>
          </Scene>
          <Scene
            number="05"
            title="Momentum & snapping"
            description="Shared velocity projection, bounded settling, explicit edge controls."
            code={
              '<SnapCarousel label="Homes" momentumPolicy={{ projectionMs: 220, maxVelocity: 3000 }}>{homes}</SnapCarousel>'
            }
          >
            <SnapCarousel
              label="Homes"
              momentumPolicy={{ projectionMs: 220, maxVelocity: 3000 }}
            >
              {[
                "A quieter morning",
                "Room for everyone",
                "A place to belong",
              ].map((text, index) => (
                <div className={`home-art home-${index}`} key={text}>
                  <span>0{index + 1}</span>
                  <strong>{text}</strong>
                </div>
              ))}
            </SnapCarousel>
          </Scene>
          <Scene
            number="06"
            title="Interactive dismissal"
            description="Drag away or press Dismiss. A cancelled drag returns home."
            code={'<DismissibleSurface axis="x" onDismiss={remove} />'}
          >
            {dismissed ? (
              <button onClick={() => setDismissed(false)}>
                Restore notice
              </button>
            ) : (
              <DismissibleSurface
                axis="x"
                onDismiss={() => {
                  setDismissed(true);
                  log("dismiss · committed");
                }}
                className="notice"
              >
                <strong>Your search is saved.</strong>
                <p>Swipe horizontally to dismiss.</p>
              </DismissibleSurface>
            )}
          </Scene>
          <Scene
            number="07"
            title="Lift, drag & settle"
            description="Stable IDs, a two-column grid, and keyboard move alternatives."
            code={
              "<ReorderGroup columns={2} items={photos} onReorder={setPhotos} ... />"
            }
          >
            <ReorderGroup
              items={items}
              onReorder={setItems}
              getId={(value) => value}
              columns={2}
              label="Photo order"
              className="photo-grid"
              renderItem={(item, index) => (
                <div className={`photo photo-${index}`}>{item}</div>
              )}
            />
          </Scene>
          <Scene
            number="08"
            title="Layout reflow"
            description="Position-only reflow avoids stretching text."
            code={"<LayoutFlow>{content}</LayoutFlow>"}
          >
            <LayoutFlow className="reflow">
              {blocks.map((value) => (
                <LayoutFlowItem key={value}>
                  <button
                    onClick={() =>
                      setBlocks((old) => old.filter((item) => item !== value))
                    }
                  >
                    Room {value} ×
                  </button>
                </LayoutFlowItem>
              ))}
            </LayoutFlow>
            <button
              onClick={() =>
                setBlocks((old) => [...old, Math.max(0, ...old) + 1])
              }
            >
              Add room
            </button>
          </Scene>
          <Scene
            number="09"
            title="Anchored menus"
            description="Collision handling, Escape dismissal, and focus return."
            code={
              '<AnchoredMenu trigger={<button>Options</button>} label="Options" />'
            }
          >
            <AnchoredMenu
              trigger={<button disabled={disabled}>Home options ↗</button>}
              label="Home options"
            >
              <div className="motion-workshop-portal">
                <div className="menu">
                  <h3>Make yourself at home</h3>
                  <button onClick={() => log("menu · saved")}>
                    Save this home
                  </button>
                  <button onClick={() => log("menu · shared")}>
                    Share with a housemate
                  </button>
                </div>
              </div>
            </AnchoredMenu>
          </Scene>
          <Scene
            number="10"
            title="Favorite reaction"
            description="Controlled selection; pending actions remain inert."
            code={
              '<FavoriteButton selected={liked} pending={pending} onSelectedChange={setLiked} label="Save home" />'
            }
          >
            <FavoriteButton
              className={`favorite ${liked ? "selected" : ""}`}
              selected={liked}
              pending={pending}
              disabled={disabled}
              label="Save home"
              onSelectedChange={setLiked}
            >
              {liked ? "♥" : "♡"}
            </FavoriteButton>
            <button onClick={() => setLiked(false)}>Simulate rejection</button>
          </Scene>
          <Scene
            number="11"
            title="Truthful progress"
            description="Animation never displays more than the confirmed value."
            code={
              '<SettlingProgress value={confirmed} label="Profile completion" />'
            }
          >
            <div className="progress-example">
              <AnimatedNumber
                value={progress}
                format={(value) => `${Math.round(value)}%`}
              />
              <SettlingProgress value={progress} label="Profile completion" />
              <input
                aria-label="Confirmed progress"
                type="range"
                value={progress}
                onChange={(event) => setProgress(+event.target.value)}
              />
            </div>
          </Scene>
          <Scene
            number="12"
            title="Anticipation"
            description="Finite squash/stretch on an inner visual layer."
            code={"<Anticipation active={active}><Badge /></Anticipation>"}
          >
            <Anticipation active={active}>
              <span className="anticipation-badge">
                Ready
                <br />
                to move?
              </span>
            </Anticipation>
            <button onClick={() => setActive((value) => !value)}>
              Toggle anticipation
            </button>
          </Scene>
          <Scene
            number="13"
            title="Coordinated rewards"
            description="Confirmed events, seeded particles, one haptic per event ID."
            code={
              "<RewardSequence eventId={event.id} confirmed={event.confirmed} />"
            }
          >
            <RewardSequence
              eventId={reward || null}
              confirmed={reward > 0}
              stages={[
                { id: "badge", atMs: 0 },
                { id: "particles", atMs: 100 },
                { id: "count", atMs: 350 },
              ]}
              onStage={(stage) => log(`reward ${reward} · ${stage}`)}
              onComplete={() => log(`reward ${reward} · complete`)}
              onCancel={() => log("reward · cancelled")}
            >
              <span className="reward-badge">
                ✦{" "}
                <AnimatedNumber
                  value={reward * 100}
                  format={(value) => String(Math.round(value))}
                />
              </span>
            </RewardSequence>
            <button
              disabled={disabled || pending}
              onClick={() => setReward((value) => value + 1)}
            >
              Confirm milestone
            </button>
            <button onClick={() => setReward(0)}>Cancel reward</button>
          </Scene>
        </div>
      )}
      {tab === "Spatial & media" && (
        <div className="scenes spatial">
          <Scene
            number="14"
            title="Reversible surfaces"
            description="Open, interrupt, reverse. Return geometry is measured again on close."
            code={
              '<TransitionHost><MorphingSurface id="home" presentation="right" ... /></TransitionHost>'
            }
          >
            {(["fullscreen", "right", "anchored"] as const).map(
              (presentation) => (
                <MorphingSurface
                  key={presentation}
                  id={presentation}
                  label={`${presentation} details`}
                  presentation={presentation}
                  trigger={
                    <span className="morph-card">
                      ↗<strong>{presentation}</strong>
                      <small>Source → destination</small>
                    </span>
                  }
                  onEvent={event}
                >
                  <div className="motion-workshop-portal">
                    <div className="expanded-content">
                      <h2>Room to explore.</h2>
                      <p>
                        Close immediately to reverse the running spring. Resize
                        the viewport to retarget geometry.
                      </p>
                      <button onClick={host.close}>Reverse now</button>
                    </div>
                  </div>
                </MorphingSurface>
              ),
            )}
          </Scene>
          <Scene
            number="15"
            title="One player, every destination"
            description="Stable parent, stable video element, stable source."
            code={
              '<MediaHost renderMedia={<video src="same.mp4" />}><MediaSlot slotId="inline" /><MediaSlot slotId="expanded" /></MediaHost>'
            }
          >
            <MediaSlot slotId="inline" className="media-inline" />
            <button onClick={() => media.setDestination("inline")}>
              Show inline video
            </button>
            <button
              onClick={(event) =>
                host.open({
                  id: "video",
                  modal: false,
                  source: event.currentTarget,
                  label: "Video details",
                  content: mediaContent,
                  onClose: () => media.setDestination("inline"),
                })
              }
            >
              Expand video
            </button>
            <button
              onClick={(event) =>
                router.open("/listing/demo", {
                  id: "route-video",
                  modal: false,
                  source: event.currentTarget,
                  label: "Routed video",
                  content: mediaContent,
                  onClose: () => media.setDestination("inline"),
                })
              }
            >
              Open video route
            </button>
            <p>Route: {location.pathname}</p>
          </Scene>
        </div>
      )}
      {tab === "Recipes" && (
        <div className="scenes">
          <Scene
            number="R1"
            title="Listing discovery"
            description="Tilt, controlled favorites, and readable content."
            code={"<TiltSurface><FavoriteButton ... /></TiltSurface>"}
          >
            <TiltSurface className="recipe-card">
              <div className="home-art home-1" />
              <h3>A calmer corner of the city</h3>
              <p>2 rooms · shared garden · your next chapter</p>
              <FavoriteButton
                selected={liked}
                onSelectedChange={setLiked}
                pending={pending}
                label="Save recipe home"
              >
                {liked ? "♥" : "♡"}
              </FavoriteButton>
            </TiltSurface>
          </Scene>
          <Scene
            number="R2"
            title="Onboarding confidence"
            description="Truthful progress and restrained entrances."
            code={
              "<StaggerGroup><AnimatedText>Welcome home.</AnimatedText><SettlingProgress ... /></StaggerGroup>"
            }
          >
            <StaggerGroup>
              <AnimatedText>Welcome home.</AnimatedText>
              <p>Your profile is taking shape.</p>
              <SettlingProgress
                value={progress}
                label="Onboarding completion"
              />
              <PressableSurface
                disabled={disabled}
                onClick={() =>
                  setProgress((value) => Math.min(100, value + 10))
                }
              >
                Complete next step
              </PressableSurface>
            </StaggerGroup>
          </Scene>
        </div>
      )}
    </>
  );
}
