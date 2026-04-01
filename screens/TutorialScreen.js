import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';

const { width: W } = Dimensions.get('window');

const steps = [
  {
    title: 'this is a profile',
    body: 'you\'ll see 3 video clips from each person.\ntheir face, their body, and their world.',
    mockName: 'alex, 25',
    mockClip: 'face',
    highlight: null,
  },
  {
    title: 'tap to switch clips',
    body: 'tap the left side to go back.\ntap the right side to see the next clip.',
    mockName: 'alex, 25',
    mockClip: 'body',
    highlight: 'clips',
  },
  {
    title: 'pass or like',
    body: 'not interested? tap pass.\nlike what you see? tap like.',
    mockName: 'alex, 25',
    mockClip: 'world',
    highlight: 'buttons',
  },
  {
    title: 'it\'s a match',
    body: 'if they like you back, you match.\nthen you can start talking.',
    mockName: null,
    mockClip: null,
    highlight: 'match',
  },
];

export default function TutorialScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  function next() {
    if (isLast) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  }

  // Match celebration screen
  if (current.highlight === 'match') {
    return (
      <View style={s.container}>
        <View style={s.matchScreen}>
          <Text style={s.matchTitle}>it's a match</Text>
          <Text style={s.matchBody}>{current.body}</Text>
          <TouchableOpacity style={s.startBtn} onPress={next}>
            <Text style={s.startBtnText}>start browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Mock profile background */}
      <View style={s.mockBg}>
        <View style={s.mockGradient} />

        {/* Mock clip bars */}
        <SafeAreaView style={s.topArea}>
          <View style={[s.clipBars, current.highlight === 'clips' && s.highlighted]}>
            {['face', 'body', 'world'].map((c, i) => (
              <View key={c} style={[s.clipBar, {
                backgroundColor: c === current.mockClip ? '#fff' : 'rgba(255,255,255,0.2)',
              }]} />
            ))}
          </View>

          <Text style={s.mockName}>{current.mockName}</Text>
          <Text style={s.mockClipLabel}>{current.mockClip}</Text>
        </SafeAreaView>

        {/* Tap zone hints */}
        {current.highlight === 'clips' && (
          <View style={s.tapHints}>
            <View style={s.tapHint}>
              <Text style={s.tapHintText}>tap</Text>
            </View>
            <View style={s.tapHint}>
              <Text style={s.tapHintText}>tap</Text>
            </View>
          </View>
        )}

        {/* Mock buttons */}
        <View style={[s.mockButtons, current.highlight === 'buttons' && s.highlighted]}>
          <View style={s.mockPassBtn}>
            <Text style={s.mockPassText}>pass</Text>
          </View>
          <View style={s.mockLikeBtn}>
            <Text style={s.mockLikeText}>like</Text>
          </View>
        </View>
      </View>

      {/* Tutorial overlay */}
      <View style={s.overlay}>
        <View style={s.tutorialBox}>
          <Text style={s.tutorialTitle}>{current.title}</Text>
          <Text style={s.tutorialBody}>{current.body}</Text>
          <TouchableOpacity style={s.nextBtn} onPress={next}>
            <Text style={s.nextBtnText}>
              {isLast ? 'got it' : 'next'}
            </Text>
          </TouchableOpacity>
          <Text style={s.stepCounter}>{step + 1} / {steps.length}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },

  // Mock profile
  mockBg: { flex: 1, backgroundColor: '#18181b' },
  mockGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#18181b',
  },
  topArea: {
    paddingHorizontal: 16, paddingTop: 8,
  },
  clipBars: { flexDirection: 'row', gap: 3, marginBottom: 14 },
  clipBar: { flex: 1, height: 2, borderRadius: 1 },
  mockName: {
    fontSize: 28, fontWeight: '800', color: '#fff',
  },
  mockClipLabel: {
    fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 2,
  },

  // Tap hints
  tapHints: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row', zIndex: 2,
  },
  tapHint: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tapHintText: {
    color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '500',
  },

  // Mock buttons
  mockButtons: {
    position: 'absolute', bottom: 40, left: 24, right: 24,
    flexDirection: 'row', gap: 12,
  },
  mockPassBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center',
  },
  mockPassText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  mockLikeBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center',
  },
  mockLikeText: { color: '#0a0a0f', fontSize: 16, fontWeight: '600' },

  // Highlight
  highlighted: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16, padding: 8,
  },

  // Tutorial overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingBottom: 120,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  tutorialBox: {
    backgroundColor: '#0a0a0f',
    borderRadius: 20, padding: 28,
    borderWidth: 0.5, borderColor: '#27272a',
  },
  tutorialTitle: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    marginBottom: 10,
  },
  tutorialBody: {
    fontSize: 15, color: '#71717a', lineHeight: 24,
    marginBottom: 24,
  },
  nextBtn: {
    paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center',
  },
  nextBtnText: {
    color: '#0a0a0f', fontSize: 16, fontWeight: '600',
  },
  stepCounter: {
    color: '#3f3f46', fontSize: 12, textAlign: 'center', marginTop: 12,
  },

  // Match screen
  matchScreen: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 48,
  },
  matchTitle: {
    fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 12,
  },
  matchBody: {
    fontSize: 16, color: '#52525b', textAlign: 'center',
    lineHeight: 24, marginBottom: 36,
  },
  startBtn: {
    width: '100%', paddingVertical: 18, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center',
  },
  startBtnText: {
    color: '#0a0a0f', fontSize: 16, fontWeight: '600',
  },
});