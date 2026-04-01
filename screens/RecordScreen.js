import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video } from 'expo-av';
import { supabase } from '../supabase';
import { uploadClip } from '../uploadClip';

const clips = [
  {
    id: 1,
    label: 'your face',
    instruction: 'hold the camera at arm\'s length\nfill the frame with your face',
    duration: 10,
  },
  {
    id: 2,
    label: 'your body',
    instruction: 'prop your phone up and step back\nshow yourself head to toe',
    duration: 10,
  },
  {
    id: 3,
    label: 'your world',
    instruction: 'show us where you are right now\nyour room, your street, your life',
    duration: 10,
  },
];

const scripts = [
  "the best meal i ever had was something really simple",
  "if i could live anywhere for a year it would be somewhere warm",
  "the thing that makes me laugh the hardest is honestly pretty stupid",
  "my friends would describe me as someone who talks too much",
  "on a perfect sunday morning you'd find me doing absolutely nothing",
  "the last thing i got really excited about was kind of embarrassing",
  "if i had to sing one song at karaoke i'd pick something classic",
  "the hobby i'd pick up if i had more time is something weird",
  "my most unpopular opinion is one i will defend forever",
  "the best advice i ever got was from someone i didn't expect",
];

function getRandomScript() {
  return scripts[Math.floor(Math.random() * scripts.length)];
}

function PermissionRequest({ onGrant }) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Text style={s.permTitle}>camera access</Text>
        <Text style={s.permBody}>
          7am needs your camera and microphone{'\n'}
          to record your profile clips.
        </Text>
        <TouchableOpacity style={s.permBtn} onPress={onGrant}>
          <Text style={s.permBtnText}>allow camera</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ReviewClip({ uri, onAccept, onRetake, clipLabel, uploading }) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.reviewHeader}>
        <Text style={s.reviewTitle}>{clipLabel}</Text>
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
      {uploading ? (
        <View style={s.uploadingBar}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={s.uploadingText}>uploading...</Text>
        </View>
      ) : (
        <View style={s.reviewBtns}>
          <TouchableOpacity style={s.retakeBtn} onPress={onRetake}>
            <Text style={s.retakeBtnText}>retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acceptBtn} onPress={onAccept}>
            <Text style={s.acceptBtnText}>looks good</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function RecordScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [clipIndex, setClipIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [recordedUri, setRecordedUri] = useState(null);
  const [script, setScript] = useState(getRandomScript());
  const [uploading, setUploading] = useState(false);
  const [facing, setFacing] = useState('front');
  const [userId, setUserId] = useState(null);
  const cameraRef = useRef(null);
  const timerRef = useRef(null);
  const scriptRef = useRef(script);

  const currentClip = clips[clipIndex];

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    }
    getUser();
  }, []);

  useEffect(() => { scriptRef.current = script; }, [script]);
  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

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

  async function startRecording() {
    if (!cameraRef.current) return;
    setIsRecording(true);
    setTimeLeft(currentClip.duration);
    let remaining = currentClip.duration;
    timerRef.current = setInterval(() => {
      remaining--;
      setTimeLeft(remaining);
      if (remaining <= 0) { clearInterval(timerRef.current); stopRecording(); }
    }, 1000);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: currentClip.duration });
      setRecordedUri(video.uri);
    } catch (err) {
      console.log('Recording error:', err);
      Alert.alert('recording failed', 'something went wrong. try again.');
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    if (!cameraRef.current) return;
    cameraRef.current.stopRecording();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function acceptClip() {
    if (!userId) { Alert.alert('error', 'not logged in.'); return; }
    setUploading(true);
    try {
      await uploadClip({
        uri: recordedUri, userId,
        clipNumber: currentClip.id, label: currentClip.label,
        script: scriptRef.current,
      });
      setRecordedUri(null);
      setUploading(false);
      if (clipIndex < clips.length - 1) {
        setClipIndex(clipIndex + 1);
        setScript(getRandomScript());
      } else {
        Alert.alert('done', 'all 3 clips recorded and uploaded.',
          [{ text: 'ok', onPress: () => navigation.replace('Home') }]);
      }
    } catch (err) {
      setUploading(false);
      Alert.alert('upload failed', err.message);
    }
  }

  function retakeClip() { setRecordedUri(null); setScript(getRandomScript()); }

  if (!permission) return <View style={s.container} />;
  if (!permission.granted) return <PermissionRequest onGrant={requestPermission} />;

  if (recordedUri) {
    return (
      <ReviewClip uri={recordedUri} clipLabel={currentClip.label}
        onAccept={acceptClip} onRetake={retakeClip} uploading={uploading} />
    );
  }

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={s.camera} facing={facing} mode="video">
        <SafeAreaView style={s.topBar}>
          <View style={s.clipBadge}>
            <Text style={s.clipBadgeText}>
              {currentClip.id}/3 — {currentClip.label}
            </Text>
          </View>
          <TouchableOpacity style={s.flipBtn}
            onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}>
            <Text style={s.flipBtnText}>flip</Text>
          </TouchableOpacity>
        </SafeAreaView>

        <View style={s.progressDots}>
          {clips.map((c, i) => (
            <View key={c.id} style={[s.progressDot, {
              backgroundColor: i < clipIndex ? '#fff' : i === clipIndex ? '#fff' : '#444',
              opacity: i < clipIndex ? 0.4 : i === clipIndex ? 1 : 0.3,
            }]} />
          ))}
        </View>

        {countdown !== null && (
          <View style={s.countdownOverlay}>
            <Text style={s.countdownNum}>{countdown}</Text>
          </View>
        )}

        <View style={s.scriptBox}>
          <Text style={s.scriptLabel}>say this out loud</Text>
          <Text style={s.scriptText}>"{script}"</Text>
        </View>

        {isRecording && (
          <View style={s.timerBar}>
            <View style={s.recDot} />
            <Text style={s.timerText}>{timeLeft}s</Text>
          </View>
        )}

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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48 },
  camera: { flex: 1 },
  permTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 12 },
  permBody: { fontSize: 15, color: '#52525b', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permBtn: { backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14 },
  permBtnText: { color: '#0a0a0f', fontSize: 16, fontWeight: '600' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  clipBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  clipBadgeText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  flipBtn: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  flipBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  progressDot: { width: 28, height: 3, borderRadius: 1.5 },
  countdownOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  countdownNum: { fontSize: 80, fontWeight: '800', color: '#fff' },
  scriptBox: { position: 'absolute', top: '28%', left: 24, right: 24, backgroundColor: 'rgba(0,0,0,0.6)', padding: 18, borderRadius: 14, alignItems: 'center' },
  scriptLabel: { fontSize: 11, fontWeight: '600', color: '#71717a', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  scriptText: { fontSize: 16, color: '#fff', fontWeight: '500', textAlign: 'center', lineHeight: 24, fontStyle: 'italic' },
  timerBar: { position: 'absolute', top: '22%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, gap: 8 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  timerText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  instruction: { fontSize: 14, color: '#fff', textAlign: 'center', marginBottom: 24, lineHeight: 20, opacity: 0.7 },
  recordBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  recordBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  stopBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  stopBtnInner: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#ef4444' },
  reviewHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 16 },
  reviewTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  videoWrap: { flex: 1, marginHorizontal: 20, marginVertical: 12, borderRadius: 16, overflow: 'hidden' },
  video: { flex: 1 },
  reviewBtns: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingBottom: 40 },
  retakeBtn: { flex: 1, paddingVertical: 18, borderRadius: 14, backgroundColor: '#18181b', alignItems: 'center' },
  retakeBtnText: { color: '#71717a', fontSize: 16, fontWeight: '500' },
  acceptBtn: { flex: 1, paddingVertical: 18, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center' },
  acceptBtnText: { color: '#0a0a0f', fontSize: 16, fontWeight: '600' },
  uploadingBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 50 },
  uploadingText: { color: '#52525b', fontSize: 15 },
});