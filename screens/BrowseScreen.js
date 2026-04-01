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
  const videoRef = useRef(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const myId = userData?.user?.id;
    setCurrentUserId(myId);

    // Fetch all profiles with their clips
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

    // Combine profiles with their clips, exclude current user
    const combined = allProfiles
      .filter((p) => p.id !== myId)
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
        [{ text: 'OK' }]
      );
    }
  }

  function handlePass() {
    nextProfile();
  }

  function handleLike() {
    const current = profiles[profileIndex];
    if (current) {
      Alert.alert(
        'Liked! 💜',
        `You liked ${current.name}. Matching will be added in the next update!`,
      );
      nextProfile();
    }
  }

  // --- LOADING STATE ---
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

  // --- MAIN BROWSE VIEW ---
  const profile = profiles[profileIndex];
  const clip = profile.clips[activeClip];

  return (
    <View style={s.container}>
      {/* Video player */}
      <Video
        ref={videoRef}
        source={{ uri: clip.video_url }}
        style={s.video}
        resizeMode="cover"
        shouldPlay
        isLooping
      />

      {/* Tap zones for prev/next clip */}
      <View style={s.tapZones}>
        <TouchableOpacity style={s.tapLeft} onPress={prevClip} />
        <TouchableOpacity style={s.tapRight} onPress={nextClip} />
      </View>

      {/* Top overlay: name + clip dots */}
      <SafeAreaView style={s.topOverlay}>
        {/* Clip progress bars */}
        <View style={s.clipBars}>
          {profile.clips.map((c, i) => (
            <View
              key={c.id}
              style={[
                s.clipBar,
                {
                  backgroundColor:
                    i <= activeClip
                      ? '#fff'
                      : 'rgba(255,255,255,0.3)',
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

      {/* Script they read */}
      {clip.script && (
        <View style={s.scriptBox}>
          <Text style={s.scriptLabel}>THEY SAID:</Text>
          <Text style={s.scriptText}>"{clip.script}"</Text>
        </View>
      )}

      {/* Bottom: like / pass buttons */}
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },

  // Tap zones
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 2,
  },
  tapLeft: { flex: 1 },
  tapRight: { flex: 1 },

  // Top overlay
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 3, paddingHorizontal: 16, paddingTop: 8,
  },
  clipBars: {
    flexDirection: 'row', gap: 4, marginBottom: 12,
  },
  clipBar: {
    flex: 1, height: 3, borderRadius: 2,
  },
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

  // Script
  scriptBox: {
    position: 'absolute', bottom: 120, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 14, borderRadius: 12, alignItems: 'center',
    zIndex: 3,
  },
  scriptLabel: {
    fontSize: 10, fontWeight: '700', color: '#818cf8',
    letterSpacing: 1, marginBottom: 6,
  },
  scriptText: {
    fontSize: 15, color: '#fff', fontWeight: '500',
    textAlign: 'center', lineHeight: 22, fontStyle: 'italic',
  },

  // Bottom bar
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
  counter: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500',
  },

  // Loading & empty states
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