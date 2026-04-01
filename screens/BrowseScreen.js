import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Video } from 'expo-av';
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

const clipLabels = {
  1: '😊 Face Close-Up',
  2: '🧍 Full Body',
  3: '🌿 Candid Moment',
};

export default function BrowseScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [activeClip, setActiveClip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [matchModal, setMatchModal] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const myId = userData?.user?.id;
    setCurrentUserId(myId);

    // Get people I already liked so we don't show them again
    const { data: myLikes } = await supabase
      .from('likes')
      .select('liked_id')
      .eq('liker_id', myId);

    const likedIds = (myLikes || []).map((l) => l.liked_id);

    // Fetch all profiles
    const { data: allProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, created_at');

    if (profileError) {
      console.log('Profile fetch error:', profileError);
      setLoading(false);
      return;
    }

    // Fetch all clips
    const { data: allClips, error: clipError } = await supabase
      .from('clips')
      .select('*')
      .order('clip_number');

    if (clipError) {
      console.log('Clips fetch error:', clipError);
      setLoading(false);
      return;
    }

    // Combine, exclude self and already-liked people
    const combined = allProfiles
      .filter((p) => p.id !== myId && !likedIds.includes(p.id))
      .map((profile) => ({
        ...profile,
        clips: allClips
          .filter((c) => c.user_id === profile.id)
          .sort((a, b) => a.clip_number - b.clip_number),
      }))
      .filter((p) => p.clips.length > 0);

    setProfiles(combined);
    setLoading(false);
  }

  function nextClip() {
    const current = profiles[profileIndex];
    if (!current) return;
    if (activeClip < current.clips.length - 1) {
      setActiveClip(activeClip + 1);
    }
  }

  function prevClip() {
    if (activeClip > 0) {
      setActiveClip(activeClip - 1);
    }
  }

  function nextProfile() {
    if (profileIndex < profiles.length - 1) {
      setProfileIndex(profileIndex + 1);
      setActiveClip(0);
    } else {
      Alert.alert(
        'No More Profiles',
        "You've seen everyone! Check back later for new people.",
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }

  function handlePass() {
    nextProfile();
  }

  async function handleLike() {
    const profile = profiles[profileIndex];
    if (!profile || !currentUserId) return;

    try {
      // Record the like
      const { error: likeError } = await supabase
        .from('likes')
        .insert({ liker_id: currentUserId, liked_id: profile.id });

      if (likeError) throw likeError;

      // Check if they already liked us (mutual = match!)
      const { data: theirLike } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', profile.id)
        .eq('liked_id', currentUserId)
        .single();

      if (theirLike) {
        // It's a match! Create match record
        const { error: matchError } = await supabase
          .from('matches')
          .insert({
            user1_id: currentUserId,
            user2_id: profile.id,
          });

        if (matchError) console.log('Match error:', matchError);

        // Show match modal
        setMatchModal(profile.name);
      } else {
        nextProfile();
      }
    } catch (err) {
      console.log('Like error:', err);
      nextProfile();
    }
  }

  function dismissMatch() {
    setMatchModal(null);
    nextProfile();
  }

  function goToChat() {
    setMatchModal(null);
    navigation.navigate('Matches');
  }

  // --- LOADING ---
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#818cf8" />
          <Text style={s.loadingText}>Finding people...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- NO PROFILES ---
  if (profiles.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🫥</Text>
          <Text style={s.emptyTitle}>No one here yet</Text>
          <Text style={s.emptyBody}>
            You're one of the first! Share your 7AM link{'\n'}
            and tell people to sign up.
          </Text>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.backBtnText}>Go Back</Text>
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
      <Video
        ref={videoRef}
        source={{ uri: clip.video_url }}
        style={s.video}
        resizeMode="cover"
        shouldPlay
        isLooping
      />

      {/* Tap zones */}
      <View style={s.tapZones}>
        <TouchableOpacity style={s.tapLeft} onPress={prevClip} />
        <TouchableOpacity style={s.tapRight} onPress={nextClip} />
      </View>

      {/* Top overlay */}
      <SafeAreaView style={s.topOverlay}>
        <View style={s.clipBars}>
          {profile.clips.map((c, i) => (
            <View
              key={c.id}
              style={[
                s.clipBar,
                {
                  backgroundColor:
                    i <= activeClip ? '#fff' : 'rgba(255,255,255,0.3)',
                },
              ]}
            />
          ))}
        </View>
        <View style={s.nameRow}>
          <View>
            <Text style={s.name}>{profile.name}</Text>
            <Text style={s.clipLabel}>
              {clipLabels[clip.clip_number] || `Clip ${clip.clip_number}`}
            </Text>
          </View>
          <TouchableOpacity
            style={s.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Script */}
      {clip.script && (
        <View style={s.scriptBox}>
          <Text style={s.scriptLabel}>THEY SAID:</Text>
          <Text style={s.scriptText}>"{clip.script}"</Text>
        </View>
      )}

      {/* Bottom buttons */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.passBtn} onPress={handlePass}>
          <Text style={s.passBtnText}>✕ Pass</Text>
        </TouchableOpacity>
        <Text style={s.counter}>
          {profileIndex + 1} / {profiles.length}
        </Text>
        <TouchableOpacity style={s.likeBtn} onPress={handleLike}>
          <Text style={s.likeBtnText}>💜 Like</Text>
        </TouchableOpacity>
      </View>

      {/* Match Modal */}
      <Modal visible={matchModal !== null} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.matchEmoji}>🎉</Text>
            <Text style={s.matchTitle}>It's a Match!</Text>
            <Text style={s.matchBody}>
              You and {matchModal} liked each other.{'\n'}
              Start a conversation!
            </Text>
            <TouchableOpacity style={s.chatBtn} onPress={goToChat}>
              <Text style={s.chatBtnText}>Go to Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissMatch}>
              <Text style={s.keepBrowsing}>Keep Browsing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40,
  },
  video: { ...StyleSheet.absoluteFillObject },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row', zIndex: 2,
  },
  tapLeft: { flex: 1 },
  tapRight: { flex: 1 },
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 3, paddingHorizontal: 16, paddingTop: 8,
  },
  clipBars: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  clipBar: { flex: 1, height: 3, borderRadius: 2 },
  nameRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  clipLabel: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  scriptBox: {
    position: 'absolute', bottom: 120, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 14, borderRadius: 12, alignItems: 'center', zIndex: 3,
  },
  scriptLabel: {
    fontSize: 10, fontWeight: '700', color: '#818cf8',
    letterSpacing: 1, marginBottom: 6,
  },
  scriptText: {
    fontSize: 15, color: '#fff', fontWeight: '500',
    textAlign: 'center', lineHeight: 22, fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute', bottom: 40,
    left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', zIndex: 3,
  },
  passBtn: {
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  passBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  likeBtn: {
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 30, backgroundColor: '#6366f1',
  },
  likeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  counter: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },

  // Match modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalBox: {
    width: '100%', backgroundColor: '#18181b',
    borderRadius: 24, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: '#6366f1',
  },
  matchEmoji: { fontSize: 56, marginBottom: 16 },
  matchTitle: {
    fontSize: 28, fontWeight: '900', color: '#f4f4f5', marginBottom: 8,
  },
  matchBody: {
    fontSize: 15, color: '#a1a1aa', textAlign: 'center',
    lineHeight: 22, marginBottom: 24,
  },
  chatBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#6366f1', alignItems: 'center', marginBottom: 12,
  },
  chatBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  keepBrowsing: { color: '#71717a', fontSize: 14, fontWeight: '500' },

  // Loading & empty
  loadingText: { color: '#71717a', marginTop: 16, fontSize: 15 },
  emptyTitle: {
    fontSize: 24, fontWeight: '700', color: '#f4f4f5', marginBottom: 8,
  },
  emptyBody: {
    fontSize: 15, color: '#71717a', textAlign: 'center',
    lineHeight: 22, marginBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#6366f1',
  },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});