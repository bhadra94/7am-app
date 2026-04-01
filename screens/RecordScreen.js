import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video } from 'expo-av';

const { width } = Dimensions.get('window');

// --- CLIP DEFINITIONS ---
const clips = [
  {
    id: 1,
    label: 'Face Close-Up',
    icon: '😊',
    instruction: 'Hold the camera at arm\'s length.\nFill the frame with your face.',
    duration: 10,
  },
  {
    id: 2,
    label: 'Full Body',
    icon: '🧍',
    instruction: 'Prop your phone up and step back.\nShow your full body head to toe.',
    duration: 10,
  },
  {
    id: 3,
    label: 'Candid Moment',
    icon: '🌿',
    instruction: 'Show us your world.\nYour room, your street, your vibe.',
    duration: 10,
  },
];

// --- RANDOM SCRIPTS TO READ ---
const scripts = [
  "The best meal I ever had was something really simple.",
  "If I could live anywhere for a year it would be somewhere warm.",
  "The thing that makes me laugh the hardest is honestly pretty stupid.",
  "My friends would describe me as someone who talks too much.",
  "On a perfect Sunday morning you'd find me doing absolutely nothing.",
  "I'm genuinely afraid of one very specific thing.",
  "The last thing I got really excited about was kind of embarrassing.",
  "If I had to sing one song at karaoke I'd pick something classic.",
  "The hobby I'd pick up if I had more time is something weird.",
  "My most unpopular opinion is one I will defend forever.",
];

function getRandomScript() {
  return scripts[Math.floor(Math.random() * scripts.length)];
}

// --- PERMISSION SCREEN ---
function PermissionRequest({ onGrant }) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>📸</Text>
        <Text style={s.permTitle}>Camera Access Needed</Text>
        <Text style={s.permBody}>
          7AM needs your camera and microphone to record your profile clips. No data leaves your device until you approve it.
        </Text>
        <TouchableOpacity style={s.btn} onPress={onGrant}>
          <Text style={s.btnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- REVIEW SCREEN (after recording a clip) ---
function ReviewClip({ uri, onAccept, onRetake, clipLabel }) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.reviewHeader}>
        <Text style={s.reviewTitle}>{clipLabel}</Text>
        <Text style={s.reviewSub}>Review your clip</Text>
      </View>
      <View style={s.videoWrap}>
        <Video
          source={{ uri }}
          style={s.video}
          useNativeControls
          isLooping
          shouldPlay
          resizeMode="cover"
        />
      </View>
      <View style={s.reviewBtns}>
        <TouchableOpacity style={s.retakeBtn} onPress={onRetake}>
          <Text style={s.retakeBtnText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.acceptBtn} onPress={onAccept}>
          <Text style={s.btnText}>Looks Good ✓</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- MAIN RECORD SCREEN ---
export default function RecordScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [clipIndex, setClipIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [recordedUri, setRecordedUri] = useState(null);
  const [script, setScript] = useState(getRandomScript());
  const [savedClips, setSavedClips] = useState([]);
  const [facing, setFacing] = useState('front');
  const cameraRef = useRef(null);
  const timerRef = useRef(null);

  const currentClip = clips[clipIndex];

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- COUNTDOWN BEFORE RECORDING ---
  function startCountdown() {
    setCountdown(3);
    let count = 3;
    const id = setInterval(() => {
      count--;
      if (count === 0) {
        clearInterval(id);
        setCountdown(null);
        startRecording();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }

  // --- START RECORDING ---
  async function startRecording() {
    if (!cameraRef.current) return;
    setIsRecording(true);
    setTimeLeft(currentClip.duration);

    // Timer that counts down
    let remaining = currentClip.duration;
    timerRef.current = setInterval(() => {
      remaining--;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        stopRecording();
      }
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: currentClip.duration,
      });
      setRecordedUri(video.uri);
    } catch (err) {
      console.log('Recording error:', err);
      Alert.alert('Recording failed', 'Something went wrong. Please try again.');
      setIsRecording(false);
    }
  }

  // --- STOP RECORDING ---
  async function stopRecording() {
    if (!cameraRef.current) return;
    cameraRef.current.stopRecording();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // --- ACCEPT CLIP & MOVE TO NEXT ---
  function acceptClip() {
    const updated = [...savedClips, { ...currentClip, uri: recordedUri }];
    setSavedClips(updated);
    setRecordedUri(null);

    if (clipIndex < clips.length - 1) {
      setClipIndex(clipIndex + 1);
      setScript(getRandomScript());
    } else {
      // All 3 clips done!
      Alert.alert(
        'Profile Complete! 🎉',
        'All 3 clips recorded. In the next update, these will upload to your profile.',
        [{ text: 'Awesome', onPress: () => navigation.replace('Home') }]
      );
    }
  }

  // --- RETAKE CLIP ---
  function retakeClip() {
    setRecordedUri(null);
    setScript(getRandomScript());
  }

  // --- PERMISSIONS NOT GRANTED YET ---
  if (!permission) return <View style={s.container} />;

  if (!permission.granted) {
    return <PermissionRequest onGrant={requestPermission} />;
  }

  // --- REVIEWING A RECORDED CLIP ---
  if (recordedUri) {
    return (
      <ReviewClip
        uri={recordedUri}
        clipLabel={currentClip.label}
        onAccept={acceptClip}
        onRetake={retakeClip}
      />
    );
  }

  // --- CAMERA / RECORDING VIEW ---
  return (
    <View style={s.container}>
      <CameraView
        ref={cameraRef}
        style={s.camera}
        facing={facing}
        mode="video"
      >
        {/* Top bar: clip info + flip camera */}
        <SafeAreaView style={s.topBar}>
          <View style={s.clipBadge}>
            <Text style={s.clipBadgeText}>
              {currentClip.icon} Clip {currentClip.id}/3 — {currentClip.label}
            </Text>
          </View>
          <TouchableOpacity
            style={s.flipBtn}
            onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
          >
            <Text style={{ fontSize: 24 }}>🔄</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Progress dots */}
        <View style={s.progressDots}>
          {clips.map((c, i) => (
            <View
              key={c.id}
              style={[
                s.progressDot,
                {
                  backgroundColor:
                    i < clipIndex
                      ? '#4ade80'
                      : i === clipIndex
                      ? '#818cf8'
                      : '#333',
                },
              ]}
            />
          ))}
        </View>

        {/* Countdown overlay */}
        {countdown !== null && (
          <View style={s.countdownOverlay}>
            <Text style={s.countdownNum}>{countdown}</Text>
          </View>
        )}

        {/* Script to read */}
        <View style={s.scriptBox}>
          <Text style={s.scriptLabel}>READ THIS OUT LOUD:</Text>
          <Text style={s.scriptText}>"{script}"</Text>
        </View>

        {/* Recording timer */}
        {isRecording && (
          <View style={s.timerBar}>
            <View style={s.recDot} />
            <Text style={s.timerText}>{timeLeft}s</Text>
          </View>
        )}

        {/* Bottom: instruction + record button */}
        <View style={s.bottomBar}>
          <Text style={s.instruction}>{currentClip.instruction}</Text>

          {!isRecording && countdown === null && (
            <TouchableOpacity style={s.recordBtn} onPress={startCountdown}>
              <View style={s.recordBtnInner} />
            </TouchableOpacity>
          )}

          {isRecording && (
            <TouchableOpacity style={s.stopBtn} onPress={stopRecording}>
              <View style={s.stopBtnInner} />
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

// --- STYLES ---
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40,
  },
  camera: { flex: 1 },

  // Permission screen
  permTitle: {
    fontSize: 24, fontWeight: '800', color: '#f4f4f5',
    textAlign: 'center', marginBottom: 12,
  },
  permBody: {
    fontSize: 15, color: '#71717a', textAlign: 'center',
    lineHeight: 22, marginBottom: 32,
  },

  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingTop: 8,
  },
  clipBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20,
  },
  clipBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  flipBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)', width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },

  // Progress dots
  progressDots: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, marginTop: 12,
  },
  progressDot: {
    width: 32, height: 4, borderRadius: 2,
  },

  // Countdown
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countdownNum: {
    fontSize: 96, fontWeight: '900', color: '#fff',
  },

  // Script
  scriptBox: {
    position: 'absolute', top: '28%',
    left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16, borderRadius: 12,
    alignItems: 'center',
  },
  scriptLabel: {
    fontSize: 11, fontWeight: '700', color: '#818cf8',
    letterSpacing: 1, marginBottom: 8,
  },
  scriptText: {
    fontSize: 17, color: '#fff', fontWeight: '500',
    textAlign: 'center', lineHeight: 24, fontStyle: 'italic',
  },

  // Timer
  timerBar: {
    position: 'absolute', top: '22%',
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.8)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    gap: 8,
  },
  recDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff',
  },
  timerText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 40,
    left: 0, right: 0, alignItems: 'center',
    paddingHorizontal: 20,
  },
  instruction: {
    fontSize: 14, color: '#fff', textAlign: 'center',
    marginBottom: 24, lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Record button
  recordBtn: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 4, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  recordBtnInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#ef4444',
  },

  // Stop button
  stopBtn: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 4, borderColor: '#ef4444',
    justifyContent: 'center', alignItems: 'center',
  },
  stopBtnInner: {
    width: 30, height: 30, borderRadius: 4,
    backgroundColor: '#ef4444',
  },

  // Review screen
  reviewHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 16 },
  reviewTitle: { fontSize: 20, fontWeight: '700', color: '#f4f4f5' },
  reviewSub: { fontSize: 14, color: '#71717a', marginTop: 4 },
  videoWrap: {
    flex: 1, marginHorizontal: 20, marginVertical: 12,
    borderRadius: 16, overflow: 'hidden',
  },
  video: { flex: 1 },
  reviewBtns: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingBottom: 40,
  },
  retakeBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    borderWidth: 2, borderColor: '#333', alignItems: 'center',
  },
  retakeBtnText: { color: '#a1a1aa', fontSize: 16, fontWeight: '600' },
  acceptBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#4ade80', alignItems: 'center',
  },

  // Shared
  btn: {
    width: '100%', paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#6366f1', alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});