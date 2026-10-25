import React from "react";
import { Text, View } from "react-native";
import {
  createNavigatorFactory, NavigationContainer, NavigationIndependentTree,
  StackRouter, useNavigationBuilder, useNavigation, useIsFocused,
} from "@react-navigation/native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";
import { MediaHost, MediaSlot, PressableSurface } from "@splitin/react-mobile-interactions/native";

// A real React Navigation stack router; the persistent media owner sits above its screens.
// This minimal navigator deliberately does not implement a platform edge-pop recognizer.
function StackNavigator({ children, initialRouteName }: { children: React.ReactNode; initialRouteName?: string }) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(StackRouter, { children, initialRouteName });
  return <NavigationContent><View style={{ flex: 1 }}>{state.routes.map((route, index) =>
    <View key={route.key} style={{ flex: 1, display: index === state.index ? "flex" : "none" }}>{descriptors[route.key].render()}</View>,
  )}</View></NavigationContent>;
}
const Stack = createNavigatorFactory(StackNavigator)();
const button = { padding: 12, backgroundColor: "#dce8ff", marginVertical: 8, borderRadius: 10 };
function Listing() {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const offset = useSharedValue({ x: 0, y: 0 });
  const onScroll = useAnimatedScrollHandler(event => { offset.value = event.contentOffset; });
  return <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}>
    <Text>Listing video · one player above route history</Text>
    <MediaSlot id="listing:42:video:v1:inline" active={focused} scrollOffset={offset} style={{ height: 160 }} />
    <PressableSurface style={button} onPress={() => navigation.navigate("Detail" as never)}><Text>Push video detail</Text></PressableSurface>
    <View style={{ height: 280 }}><Text>Scroll while the inline player tracks its slot on the UI thread.</Text></View>
  </Animated.ScrollView>;
}
function Detail() {
  const navigation = useNavigation();
  const focused = useIsFocused();
  return <View><Text>Detail route</Text><MediaSlot id="listing:42:video:v1:detail" active={focused} style={{ height: 240 }} />
    <PressableSurface style={button} onPress={() => { if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate("Listing" as never); }}><Text>Back to listing</Text></PressableSurface>
  </View>;
}
export function RouteRecipe({ directEntry = false }: { directEntry?: boolean }) {
  const player = useVideoPlayer(require("./assets/continuity.mp4"), video => { video.loop = true; });
  return <View style={{ height: 420 }}><NavigationIndependentTree><NavigationContainer>
    <MediaHost handleBack={false} surface={<VideoView player={player} style={{ flex: 1 }} surfaceType="textureView" nativeControls />}>
      <Stack.Navigator initialRouteName={directEntry ? "Detail" : "Listing"}>
        <Stack.Screen name="Listing" component={Listing} /><Stack.Screen name="Detail" component={Detail} />
      </Stack.Navigator>
    </MediaHost>
  </NavigationContainer></NavigationIndependentTree></View>;
}
