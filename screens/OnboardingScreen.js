import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import PagerView from 'react-native-pager-view';

const slides = [
  {
    id: 1,
    title: 'no photos.\njust video.',
    body: 'record yourself live.\nno uploads. no galleries.\njust you, right now.',
  },
  {
    id: 2,
    title: 'no filters.\nno makeup.',
    body: 'our camera detects\neverything artificial.\nwhat you record is\nwhat people see.',
  },
  {
    id: 3,
    title: '30 seconds.\n3 clips.',
    body: 'your face. your body.\nyour world.\nthat\'s your whole profile.',
  },
];

function Slide({ item }) {
  return (
    <View style={s.slide}>
      <Text style={s.title}>{item.title}</Text>
      <Text style={s.body}>{item.body}</Text>
    </View>
  );
}

function Dots({ current, count }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            {
              backgroundColor: i === current ? '#fff' : '#333',
              width: i === current ? 20 : 6,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const [page, setPage] = useState(0);
  const pagerRef = useRef(null);
  const isLast = page === slides.length - 1;

  function handleNext() {
    if (isLast) {
      navigation.replace('Auth');
    } else {
      pagerRef.current?.setPage(page + 1);
    }
  }

  function handleSkip() {
    pagerRef.current?.setPage(slides.length - 1);
  }

  return (
    <SafeAreaView style={s.container}>
      {!isLast && (
        <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
          <Text style={s.skipText}>skip</Text>
        </TouchableOpacity>
      )}

      <PagerView
        ref={pagerRef}
        style={s.pager}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        {slides.map((item) => (
          <Slide key={item.id} item={item} />
        ))}
      </PagerView>

      <View style={s.bottom}>
        <Dots current={page} count={slides.length} />
        <TouchableOpacity style={s.btn} onPress={handleNext}>
          <Text style={s.btnText}>
            {isLast ? 'get started' : 'next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  pager: { flex: 1 },
  slide: {
    flex: 1, justifyContent: 'center',
    paddingHorizontal: 48,
  },
  title: {
    fontSize: 36, fontWeight: '800', color: '#fff',
    lineHeight: 44, marginBottom: 24, letterSpacing: -0.5,
  },
  body: {
    fontSize: 16, color: '#52525b', lineHeight: 26,
    fontWeight: '400',
  },
  bottom: {
    paddingHorizontal: 48, paddingBottom: 48,
    alignItems: 'center', gap: 28,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  btn: {
    width: '100%', paddingVertical: 18, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center',
  },
  btnText: {
    color: '#0a0a0f', fontSize: 16, fontWeight: '600',
    letterSpacing: -0.3,
  },
  skipBtn: {
    position: 'absolute', top: 56, right: 28, zIndex: 10, padding: 8,
  },
  skipText: { color: '#3f3f46', fontSize: 14, fontWeight: '500' },
});