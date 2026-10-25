import React, { createContext, useContext, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text as NativeText,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  MotionProvider,
  MomentumSurface,
  PresetSurface,
  nativePresetNames,
  PressableSurface,
  SelectionIndicator,
  ElasticSheet,
  SnapCarousel,
  DismissibleSurface,
  ReorderGroup,
  LayoutFlow,
  AnchoredMenu,
  FavoriteButton,
  SettlingProgress,
  Anticipation,
  RewardSequence,
  AnimatedNumber,
  AnimatedText,
  StaggerGroup,
  TiltSurface,
  MediaHost,
  MediaSlot,
  TransitionHost,
  MorphingSurface,
} from "@splitin/react-mobile-interactions/native";
import {
  interactionCatalog,
  motionPresets,
  type MotionFamily,
} from "@splitin/react-mobile-interactions/core";
import { RouteRecipe } from "./RouteRecipe";
const LabSettings = createContext({
  large: false,
  rtl: false,
  disabled: false,
  pending: false,
});
function Text({ style, ...props }: React.ComponentProps<typeof NativeText>) {
  const settings = useContext(LabSettings);
  return (
    <NativeText
      {...props}
      allowFontScaling
      style={[
        {
          fontSize: settings.large ? 22 : 16,
          textAlign: settings.rtl ? "right" : "left",
        },
        style,
      ]}
    />
  );
}
const card = {
  padding: 20,
  margin: 6,
  borderRadius: 16,
  backgroundColor: "#e8eaff",
};
export default function App() {
  const [reduced, setReduced] = useState(false),
    [enabled, setEnabled] = useState(true);
  const [preset, setPreset] = useState<MotionFamily>("precise");
  const [stiffness, setStiffness] = useState(500),
    [damping, setDamping] = useState(30),
    [mass, setMass] = useState(0.5);
  const [large, setLarge] = useState(false),
    [rtl, setRtl] = useState(false),
    [disabled, setDisabled] = useState(false),
    [pending, setPending] = useState(false),
    [reset, setReset] = useState(0);
  const spring = useMemo(
    () => ({ stiffness, damping, mass }),
    [stiffness, damping, mass],
  );
  const settings = useMemo(
    () => ({ large, rtl, disabled, pending }),
    [large, rtl, disabled, pending],
  );
  const choose = (family: MotionFamily) => {
    setPreset(family);
    const values = motionPresets[family];
    setStiffness(values.stiffness);
    setDamping(values.damping);
    setMass(values.mass);
  };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <LabSettings.Provider value={settings}>
            <MotionProvider
              enabled={enabled}
              preset={preset}
              spring={spring}
              reducedMotion={reduced ? "always" : "system"}
            >
              <View style={{ direction: rtl ? "rtl" : "ltr", flex: 1 }}>
                <Text accessibilityRole="header">Motion Lab</Text>
                <ScrollView style={{ maxHeight: 240 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <Text>Reduce motion</Text>
                    <Switch
                      accessibilityLabel="Reduce motion"
                      value={reduced}
                      onValueChange={setReduced}
                    />
                    <Text>Enabled</Text>
                    <Switch
                      accessibilityLabel="Motion enabled"
                      value={enabled}
                      onValueChange={setEnabled}
                    />
                    <Text>Large text</Text>
                    <Switch
                      accessibilityLabel="Large text"
                      value={large}
                      onValueChange={setLarge}
                    />
                    <Text>RTL layout</Text>
                    <Switch
                      accessibilityLabel="RTL layout"
                      value={rtl}
                      onValueChange={setRtl}
                    />
                    <Text>Disabled controls</Text>
                    <Switch
                      accessibilityLabel="Disabled controls"
                      value={disabled}
                      onValueChange={setDisabled}
                    />
                    <Text>Pending favorite</Text>
                    <Switch
                      accessibilityLabel="Pending favorite"
                      value={pending}
                      onValueChange={setPending}
                    />
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {(["precise", "soft", "celebratory"] as const).map(
                      (family) => (
                        <Pressable
                          key={family}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: preset === family }}
                          style={card}
                          onPress={() => choose(family)}
                        >
                          <Text>{family}</Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    <Pressable
                      accessibilityLabel="Decrease stiffness"
                      onPress={() =>
                        setStiffness((value) => Math.max(50, value - 50))
                      }
                    >
                      <Text>Stiffness −</Text>
                    </Pressable>
                    <Text>{stiffness}</Text>
                    <Pressable
                      accessibilityLabel="Increase stiffness"
                      onPress={() =>
                        setStiffness((value) => Math.min(1000, value + 50))
                      }
                    >
                      <Text>+</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Decrease damping"
                      onPress={() =>
                        setDamping((value) => Math.max(5, value - 5))
                      }
                    >
                      <Text> Damping −</Text>
                    </Pressable>
                    <Text>{damping}</Text>
                    <Pressable
                      accessibilityLabel="Increase damping"
                      onPress={() =>
                        setDamping((value) => Math.min(80, value + 5))
                      }
                    >
                      <Text>+</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Decrease mass"
                      onPress={() =>
                        setMass((value) =>
                          Math.max(0.1, Math.round((value - 0.1) * 10) / 10),
                        )
                      }
                    >
                      <Text> Mass −</Text>
                    </Pressable>
                    <Text>{mass}</Text>
                    <Pressable
                      accessibilityLabel="Increase mass"
                      onPress={() =>
                        setMass((value) =>
                          Math.min(3, Math.round((value + 0.1) * 10) / 10),
                        )
                      }
                    >
                      <Text>+</Text>
                    </Pressable>
                  </View>
                  <Text selectable>
                    {JSON.stringify({
                      preset,
                      spring,
                      reducedMotion: reduced ? "always" : "system",
                      enabled,
                    })}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      choose("precise");
                      setDisabled(false);
                      setPending(false);
                      setReset((value) => value + 1);
                    }}
                  >
                    <Text>Reset all scenarios</Text>
                  </Pressable>
                  <Text>
                    {interactionCatalog.length} shared catalog patterns:{" "}
                    {interactionCatalog.join(" · ")}
                  </Text>
                </ScrollView>
                <Lab key={reset} />
              </View>
            </MotionProvider>
          </LabSettings.Provider>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
function Lab() {
  const { disabled, pending } = useContext(LabSettings);
  const [sheet, setSheet] = useState(false),
    [menu, setMenu] = useState(false),
    [favorite, setFavorite] = useState(false),
    [progress, setProgress] = useState(30),
    [reward, setReward] = useState(0),
    [dismissed, setDismissed] = useState(false),
    [items, setItems] = useState([
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
    ]);
  return (
    <TransitionHost
      surface={
        <View style={[card, { flex: 1 }]}>
          <Text>Persistent expanded surface</Text>
        </View>
      }
    >
      <ScrollView>
        <PressableSurface
          disabled={disabled}
          testID="press-compression"
          style={card}
          onPress={() => setSheet(true)}
        >
          <Text>Compression / open sheet</Text>
        </PressableSurface>
        <PressableSurface
          disabled={disabled}
          variant="mechanical"
          style={card}
          onPress={() => setMenu(true)}
        >
          <Text>Mechanical / open menu</Text>
        </PressableSurface>
        <View style={{ height: 60 }}>
          <SelectionIndicator
            rect={{ x: favorite ? 120 : 0, y: 0, width: 110, height: 48 }}
            style={{ backgroundColor: "#bbc0ff", borderRadius: 12 }}
          />
          <FavoriteButton
            disabled={disabled}
            pending={pending}
            selected={favorite}
            onSelectedChange={setFavorite}
          />
        </View>
        <SnapCarousel itemSize={200}>
          {items.map((item) => (
            <View key={item} style={[card, { width: 188 }]}>
              <Text>{item}</Text>
            </View>
          ))}
        </SnapCarousel>
        {!dismissed && (
          <DismissibleSurface onDismiss={() => setDismissed(true)} style={card}>
            <Text>Pull down to dismiss</Text>
          </DismissibleSurface>
        )}
        <PressableSurface
          disabled={disabled}
          style={card}
          onPress={() => setDismissed(false)}
        >
          <Text>Reset dismissal</Text>
        </PressableSurface>
        <Text>Long press a tile, then drag; scroll near an edge.</Text>
        <ReorderGroup
          items={items}
          keyOf={(item) => item}
          onReorder={setItems}
          columns={2}
          cellWidth={150}
          cellHeight={80}
          height={200}
          renderItem={(item) => (
            <View style={card}>
              <Text>{item}</Text>
            </View>
          )}
        />
        <LayoutFlow style={card}>
          <AnimatedText>
            {favorite ? "Selected favorite" : "Favorite not selected"}
          </AnimatedText>
        </LayoutFlow>
        <SettlingProgress value={progress} />
        <PressableSurface
          disabled={disabled}
          style={card}
          onPress={() => {
            setProgress((progress + 20) % 101);
            setReward(reward + 1);
          }}
        >
          <Text>Advance progress / reward</Text>
        </PressableSurface>
        <RewardSequence confirmed={reward > 0} eventId={String(reward)}>
          <AnimatedNumber value={reward} />
        </RewardSequence>
        <Anticipation trigger={reward}>
          <Text>Finite squash/stretch</Text>
        </Anticipation>
        <StaggerGroup>
          <Text>Stagger one</Text>
          <Text>Stagger two</Text>
        </StaggerGroup>
        <TiltSurface style={card}>
          <Text>Drag to tilt</Text>
        </TiltSurface>
        <MorphingSurface id="listing" style={{ height: 130 }}>
          <View style={card}>
            <Text>Expand persistent listing</Text>
          </View>
        </MorphingSurface>
        <VideoRecipe />
        <RouteRecipe />
        <MapMarkerRecipe />
        <PresetGallery />
        <MomentumSurface points={[0, 80, 160]} style={card}><Text>Drag and release to snap; accessibility actions also move.</Text></MomentumSurface>
      </ScrollView>
      <ElasticSheet open={sheet} onOpenChange={setSheet}>
        <Text style={card}>
          Drag the handle; content scroll owns its own gestures.
        </Text>
        {items.map((item) => (
          <Text key={item} style={card}>
            {item}
          </Text>
        ))}
        <PressableSurface
          disabled={disabled}
          onPress={() => setSheet(false)}
          style={card}
        >
          <Text>Close sheet</Text>
        </PressableSurface>
      </ElasticSheet>
      <AnchoredMenu
        open={menu}
        onOpenChange={setMenu}
        anchor={{ x: 20, y: 100, width: 120, height: 40 }}
        style={card}
      >
        <PressableSurface disabled={disabled} onPress={() => setMenu(false)}>
          <Text>Close menu</Text>
        </PressableSurface>
      </AnchoredMenu>
    </TransitionHost>
  );
}
function VideoRecipe() {
  const { disabled } = useContext(LabSettings);
  const [expanded, setExpanded] = useState(false);
  const player = useVideoPlayer(require("./assets/continuity.mp4"), (video) => {
    video.loop = true;
  });
  return (
    <View style={{ height: 530 }}>
      <MediaHost
        initialSlot="inline"
        surface={
          <VideoView
            player={player}
            style={{ flex: 1 }}
            surfaceType="textureView"
            nativeControls
          />
        }
      >
        <MediaSlot id="inline" active={!expanded} style={{ height: 150 }} />
        <PressableSurface
          disabled={disabled}
          style={card}
          onPress={() => setExpanded(!expanded)}
        >
          <Text>Move the same video surface</Text>
        </PressableSurface>
        <MediaSlot id="detail" active={expanded} style={{ height: 270 }} />
      </MediaHost>
    </View>
  );
}

function MapMarkerRecipe() {
  const [selected, setSelected] = useState(false);
  return <View accessibilityLabel="Map marker recipe" style={{height: 150, backgroundColor: "#e2eee8"}}>
    <Text>Map SDK owns the positioned outer marker</Text>
    <View style={{position: "absolute", left: 80, top: 55}}>
      <PressableSurface accessibilityLabel="Select listing marker" accessibilityRole="button" accessibilityState={{selected}} onPress={()=>setSelected(value=>!value)} style={{padding: 14, borderRadius: 24, backgroundColor: selected ? "#9faeff" : "white"}}>
        <Text>{selected ? "Selected listing" : "$1,200"}</Text>
      </PressableSurface>
    </View>
  </View>;
}

function PresetGallery() {
  const [visible, setVisible] = useState(true);
  const { rtl } = useContext(LabSettings);
  return <View><PressableSurface style={card} onPress={() => setVisible(value => !value)}><Text>Reverse all native preset families</Text></PressableSurface>
    {nativePresetNames.map(name => <PresetSurface key={name} name={name} visible={visible} rtl={rtl} style={card}><Text>{name}</Text></PresetSurface>)}
  </View>;
}
