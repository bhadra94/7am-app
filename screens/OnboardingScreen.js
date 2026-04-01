import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import PagerView from 'react-native-pager-view';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    icon: '🎥',
    title: 'This is 7AM',
    subtitle: 'Because 7AM is when\nnobody\'s faking it.',
    body: 'No photos. No galleries. No uploads.\nJust live video — recorded in the moment.',
    accent: '#818cf8',
  },
  {
    id: 2,
    icon: '🚫',
    title: 'No Filters.\nNo Faking.',
    subtitle: 'Our AI detects every\nsmooth, overlay, and trick.',
    body: 'What you record is what people see.\nNo edits. No do-overs. Just you.',
    accent: '#a78bfa',
  },
  {
    id: 3,
    icon: '🎬',
    title: 'Record Your\n3 Clips',
    subtitle: '30 seconds. That\'s your whole profile.',
    body: '10s face close-up\n10s full body\n10s candid moment\n\nRead a random script so they hear your real voice.',
    accent: '#c084fc',
  },
];

function Slide({ item }) {
  return (
    <View style={s.slide}>
      <View style={[s.iconCircle, { backgroundColor: item.accent + '20' }]}>  
        <Text style={s.icon}>{item.icon}</Text>
      </View>
      <Text style={s.title}>{item.title}</Text>
      <Text style={[s.subtitle, { color: item.accent }]}>{item.subtitle}</Text>
      <Text style={s.body}>{item.body}</Text>
    </View>
  );
}

function Dots({ current, count, accent }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            {
              backgroundColor: i === current ? accent : '#333',
              width: i === current ? 24 : 8,
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
          <Text style={s.skipText}>Skip</Text>
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
        <Dots
          current={page}
          count={slides.length}
          accent={slides[page].accent}
        />
        <TouchableOpacity
          style={[s.btn, { backgroundColor: slides[page].accent }]}
          onPress={handleNext}
        >
          <Text style={s.btnText}>
            {isLast ? "Get Started" : "Next"}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32,
  },
  icon: { fontSize: 36 },
  title: {
    fontSize: 32, fontWeight: '800', color: '#f4f4f5',
    textAlign: 'center', marginBottom: 12, lineHeight: 38,
  },
  subtitle: {
    fontSize: 16, fontWeight: '600',
    textAlign: 'center', marginBottom: 20, lineHeight: 22,
  },
  body: {
    fontSize: 15, color: '#71717a',
    textAlign: 'center', lineHeight: 24,
  },
  bottom: {
    paddingHorizontal: 40, paddingBottom: 40,
    alignItems: 'center', gap: 24,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  btn: {
    width: '100%', paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  skipBtn: {
    position: 'absolute', top: 56, right: 24, zIndex: 10, padding: 8,
  },
  skipText: { color: '#71717a', fontSize: 15, fontWeight: '500' },
});