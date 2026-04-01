import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Video } from 'expo-av';
import { supabase } from '../supabase';
import TutorialScreen from './TutorialScreen';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.25;
const clipLabels = { 1: 'face', 2: 'body', 3: 'world' };

export default function BrowseScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [activeClip, setActiveClip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [matchModal, setMatchModal] = useState(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [swipeLabel, setSwipeLabel] = useState(null);
  const videoRef = useRef(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const isAnimating = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        setSwipeLabel(null);
      },
      onPanResponderMove: (_, g) => {
        pan.x.setValue(g.dx);
        if (g.dx > 40) setSwipeLabel('like');
        else if (g.dx < -40) setSwipeLabel('pass');
        else setSwipeLabel(null);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD && !isAnimating.current) {
          isAnimating.current = true;
          Animated.timing(pan.x, {
            toValue: W + 100,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setSwipeLabel(null);
            handleLike();
            pan.setValue({ x: 0, y: 0 });
            isAnimating.current = false;
          });
        } else if (g.dx < -SWIPE_THRESHOLD && !isAnimating.current) {
          isAnimating.current = true;
          Animated.timing(pan.x, {
            toValue: -W - 100,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setSwipeLabel(null);
            nextProfile();
            pan.setValue({ x: 0, y: 0 });
            isAnimating.current = false;
          });
        } else {
          setSwipeLabel(null);
          Animated.spring(pan.x, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
          }).start();
        }
      },
    })
  ).current;

  const cardRotate = pan.x.interpolate({
    inputRange: [-W, 0, W],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const cardOpacity = pan.x.interpolate({
    inputRange: [-W, -W * 0.5, 0, W * 0.5, W],
    outputRange: [0.5, 0.8, 1, 0.8, 0.5],
  });

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const myId = userData?.user?.id;
    setCurrentUserId(myId);

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('gender, interested_in')
      .eq('id', myId)
      .single();

    const { data: myLikes } = await supabase.from('likes').select('liked_id').eq('liker_id', myId);
    const likedIds = (myLikes || []).map((l) => l.liked_id);
    const { data: allProfiles } = await supabase.from('profiles').select('id, name, age, gender, interested_in, bio, created_at');
    const { data: allClips } = await supabase.from('clips').select('*').order('clip_number');

    const genderMap = { men: 'man', women: 'woman' };
    const combined = (allProfiles || [])
      .filter((p) => {
        if (p.id === myId) return false;
        if (likedIds.includes(p.id)) return false;
        if (myProfile?.interested_in && myProfile.interested_in !== 'everyone') {
          if (p.gender !== genderMap[myProfile.interested_in]) return false;
        }
        if (p.interested_in && p.interested_in !== 'everyone') {
          if (myProfile?.gender !== genderMap[p.interested_in]) return false;
        }
        return true;
      })
      .map((profile) => ({
        ...profile,
        clips: (allClips || []).filter((c) => c.user_id === profile.id).sort((a, b) => a.clip_number - b.clip_number),
      }))
      .filter((p) => p.clips.length > 0);
    setProfiles(combined);
    setLoading(false);
  }

  function nextClip() {
    const current = profiles[profileIndex];
    if (current && activeClip < current.clips.length - 1) setActiveClip(activeClip + 1);
  }
  function prevClip() { if (activeClip > 0) setActiveClip(activeClip - 1); }
  function nextProfile() {
    if (profileIndex < profiles.length - 1) { setProfileIndex(profileIndex + 1); setActiveClip(0); }
    else { Alert.alert('no more people', 'check back later.', [{ text: 'ok', onPress: () => navigation.goBack() }]); }
  }

  async function handleLike() {
    const profile = profiles[profileIndex];
    if (!profile || !currentUserId) return;
    try {
      await supabase.from('likes').insert({ liker_id: currentUserId, liked_id: profile.id });
      const { data: theirLike } = await supabase.from('likes').select('id').eq('liker_id', profile.id).eq('liked_id', currentUserId).single();
      if (theirLike) {
        await supabase.from('matches').insert({ user1_id: currentUserId, user2_id: profile.id });
        setMatchModal(profile.name);
      } else { nextProfile(); }
    } catch (err) { nextProfile(); }
  }

  function handleReport() {
    const profile = profiles[profileIndex];
    if (!profile || !currentUserId) return;
    Alert.alert(
      'report or block',
      `what would you like to do with ${profile.name.toLowerCase()}?`,
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'block',
          onPress: async () => {
            await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: profile.id });
            Alert.alert('blocked', 'you won\'t see this person again.');
            nextProfile();
          },
        },
        {
          text: 'report & block',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'reason for report',
              'why are you reporting this person?',
              [
                { text: 'inappropriate content', onPress: () => submitReport(profile.id, 'inappropriate content') },
                { text: 'fake profile', onPress: () => submitReport(profile.id, 'fake profile') },
                { text: 'harassment', onPress: () => submitReport(profile.id, 'harassment') },
                { text: 'other', onPress: () => submitReport(profile.id, 'other') },
                { text: 'cancel', style: 'cancel' },
              ]
            );
          },
        },
      ]
    );
  }

  async function submitReport(reportedId, reason) {
    await supabase.from('reports').insert({ reporter_id: currentUserId, reported_id: reportedId, reason });
    await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: reportedId });
    Alert.alert('reported', 'thanks for keeping 7am safe. you won\'t see this person again.');
    nextProfile();
  }

  // --- TUTORIAL ---
  if (showTutorial) {
    return <TutorialScreen onComplete={() => setShowTutorial(false)} />;
  }

  // --- LOADING ---
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      </SafeAreaView>
    );
  }

  // --- NO PROFILES ---
  if (profiles.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.emptyTitle}>no one here yet</Text>
          <Text style={s.emptyBody}>you're early. share 7am{'\n'}and tell people to sign up.</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backBtnText}>go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- MAIN BROWSE ---
  const profile = profiles[profileIndex];
  const clip = profile.clips[activeClip];

  return (
    <View style={s.container}>
      <Animated.View
        style={[
          s.card,
          {
            transform: [
              { translateX: pan.x },
              { rotate: cardRotate },
            ],
            opacity: cardOpacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Video ref={videoRef} source={{ uri: clip.video_url }} style={s.video} resizeMode="cover" shouldPlay isLooping />

        {/* Tap zones for clips */}
        <View style={s.tapZones}>
          <TouchableOpacity style={s.tapLeft} onPress={prevClip} />
          <TouchableOpacity style={s.tapRight} onPress={nextClip} />
        </View>

        {/* Swipe label */}
        {swipeLabel && (
          <View style={[s.swipeLabelWrap, swipeLabel === 'like' ? s.swipeLabelRight : s.swipeLabelLeft]}>
            <Text style={[s.swipeLabelText, swipeLabel === 'like' ? s.likeLabel : s.passLabel]}>
              {swipeLabel}
            </Text>
          </View>
        )}

        {/* Top overlay */}
        <SafeAreaView style={s.topOverlay}>
          <View style={s.clipBars}>
            {profile.clips.map((c, i) => (
              <View key={c.id} style={[s.clipBar, { backgroundColor: i <= activeClip ? '#fff' : 'rgba(255,255,255,0.2)' }]} />
            ))}
          </View>
          <View style={s.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{profile.name.toLowerCase()}{profile.age ? `, ${profile.age}` : ''}</Text>
              <Text style={s.clipLabel}>{clipLabels[clip.clip_number] || 'clip'}</Text>
              {profile.bio ? <Text style={s.bioText}>{profile.bio}</Text> : null}
            </View>
            <View style={s.topBtns}>
              <TouchableOpacity style={s.reportBtn} onPress={handleReport}>
                <Text style={s.reportBtnText}>...</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
                <Text style={s.closeBtnText}>x</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Script */}
        {clip.script && clip.clip_number === 1 && (
          <View style={s.scriptBox}>
            <Text style={s.scriptLabel}>they said</Text>
            <Text style={s.scriptText}>"{clip.script}"</Text>
          </View>
        )}
      </Animated.View>

      {/* Bottom buttons */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.passBtn} onPress={() => {
          Animated.timing(pan.x, { toValue: -W - 100, duration: 250, useNativeDriver: true }).start(() => {
            nextProfile();
            pan.setValue({ x: 0, y: 0 });
          });
        }}>
          <Text style={s.passBtnText}>pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.likeBtn} onPress={() => {
          Animated.timing(pan.x, { toValue: W + 100, duration: 250, useNativeDriver: true }).start(() => {
            handleLike();
            pan.setValue({ x: 0, y: 0 });
          });
        }}>
          <Text style={s.likeBtnText}>like</Text>
        </TouchableOpacity>
      </View>

      {/* Match Modal */}
      <Modal visible={matchModal !== null} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.matchTitle}>it's a match</Text>
            <Text style={s.matchBody}>you and {matchModal} liked each other.</Text>
            <TouchableOpacity style={s.chatBtn} onPress={() => { setMatchModal(null); navigation.navigate('Matches'); }}>
              <Text style={s.chatBtnText}>go to chat</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMatchModal(null); nextProfile(); }}>
              <Text style={s.keepBrowsing}>keep browsing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48 },

  // Card
  card: {
    flex: 1, marginBottom: 90,
    borderRadius: 0, overflow: 'hidden',
  },
  video: { ...StyleSheet.absoluteFillObject },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 2 },
  tapLeft: { flex: 1 }, tapRight: { flex: 1 },

  // Swipe labels
  swipeLabelWrap: {
    position: 'absolute', top: '40%', zIndex: 5,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 8, borderWidth: 3,
  },
  swipeLabelLeft: {
    right: 30, borderColor: '#ef4444',
    transform: [{ rotate: '15deg' }],
  },
  swipeLabelRight: {
    left: 30, borderColor: '#4ade80',
    transform: [{ rotate: '-15deg' }],
  },
  swipeLabelText: {
    fontSize: 32, fontWeight: '900', textTransform: 'uppercase',
  },
  likeLabel: { color: '#4ade80' },
  passLabel: { color: '#ef4444' },

  // Top overlay
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, paddingHorizontal: 16, paddingTop: 8 },
  clipBars: { flexDirection: 'row', gap: 3, marginBottom: 14 },
  clipBar: { flex: 1, height: 2, borderRadius: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 28, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  clipLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  bioText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 18, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  topBtns: { flexDirection: 'row', gap: 8 },
  reportBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  reportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: -4 },

  // Script
  scriptBox: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 14, borderRadius: 12, alignItems: 'center', zIndex: 3 },
  scriptLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  scriptText: { fontSize: 15, color: '#fff', fontWeight: '400', textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 30, left: 24, right: 24,
    flexDirection: 'row', gap: 12, zIndex: 3,
  },
  passBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  passBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  likeBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center' },
  likeBtnText: { color: '#0a0a0f', fontSize: 16, fontWeight: '600' },

  // Match modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  modalBox: { width: '100%', padding: 36, alignItems: 'center' },
  matchTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 12 },
  matchBody: { fontSize: 16, color: '#52525b', textAlign: 'center', marginBottom: 36 },
  chatBtn: { width: '100%', paddingVertical: 18, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', marginBottom: 16 },
  chatBtnText: { color: '#0a0a0f', fontSize: 16, fontWeight: '600' },
  keepBrowsing: { color: '#52525b', fontSize: 14 },

  // Empty state
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyBody: { fontSize: 15, color: '#52525b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  backBtn: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, backgroundColor: '#fff' },
  backBtnText: { color: '#0a0a0f', fontSize: 16, fontWeight: '600' },
});