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
} from 'react-native';
import { Video } from 'expo-av';
import { supabase } from '../supabase';

const clipLabels = { 1: 'face', 2: 'body', 3: 'world' };

export default function BrowseScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [activeClip, setActiveClip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [matchModal, setMatchModal] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const myId = userData?.user?.id;
    setCurrentUserId(myId);
    const { data: myLikes } = await supabase.from('likes').select('liked_id').eq('liker_id', myId);
    const likedIds = (myLikes || []).map((l) => l.liked_id);
    const { data: allProfiles } = await supabase.from('profiles').select('id, name, created_at');
    const { data: allClips } = await supabase.from('clips').select('*').order('clip_number');
    const combined = (allProfiles || [])
      .filter((p) => p.id !== myId && !likedIds.includes(p.id))
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

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      </SafeAreaView>
    );
  }

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

  const profile = profiles[profileIndex];
  const clip = profile.clips[activeClip];

  return (
    <View style={s.container}>
      <Video ref={videoRef} source={{ uri: clip.video_url }} style={s.video} resizeMode="cover" shouldPlay isLooping />

      <View style={s.tapZones}>
        <TouchableOpacity style={s.tapLeft} onPress={prevClip} />
        <TouchableOpacity style={s.tapRight} onPress={nextClip} />
      </View>

      <SafeAreaView style={s.topOverlay}>
        <View style={s.clipBars}>
          {profile.clips.map((c, i) => (
            <View key={c.id} style={[s.clipBar, { backgroundColor: i <= activeClip ? '#fff' : 'rgba(255,255,255,0.2)' }]} />
          ))}
        </View>
        <View style={s.nameRow}>
          <View>
            <Text style={s.name}>{profile.name.toLowerCase()}</Text>
            <Text style={s.clipLabel}>{clipLabels[clip.clip_number] || 'clip'}</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={s.closeBtnText}>x</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {clip.script && clip.clip_number === 1 && (
        <View style={s.scriptBox}>
          <Text style={s.scriptLabel}>they said</Text>
          <Text style={s.scriptText}>"{clip.script}"</Text>
        </View>
      )}

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.passBtn} onPress={nextProfile}>
          <Text style={s.passBtnText}>pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.likeBtn} onPress={handleLike}>
          <Text style={s.likeBtnText}>like</Text>
        </TouchableOpacity>
      </View>

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
  video: { ...StyleSheet.absoluteFillObject },
  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 2 },
  tapLeft: { flex: 1 }, tapRight: { flex: 1 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, paddingHorizontal: 16, paddingTop: 8 },
  clipBars: { flexDirection: 'row', gap: 3, marginBottom: 14 },
  clipBar: { flex: 1, height: 2, borderRadius: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 28, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  clipLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  scriptBox: { position: 'absolute', bottom: 110, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 14, borderRadius: 12, alignItems: 'center', zIndex: 3 },
  scriptLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  scriptText: { fontSize: 15, color: '#fff', fontWeight: '400', textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  bottomBar: { position: 'absolute', bottom: 40, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', zIndex: 3, gap: 12 },
  passBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  passBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  likeBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center' },
  likeBtnText: { color: '#0a0a0f', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  modalBox: { width: '100%', padding: 36, alignItems: 'center' },
  matchTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 12 },
  matchBody: { fontSize: 16, color: '#71717a', textAlign: 'center', marginBottom: 36 },
  chatBtn: { width: '100%', paddingVertical: 18, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', marginBottom: 16 },
  chatBtnText: { color: '#0a0a0f', fontSize: 16, fontWeight: '600' },
  keepBrowsing: { color: '#52525b', fontSize: 14 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyBody: { fontSize: 15, color: '#52525b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  backBtn: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, backgroundColor: '#fff' },
  backBtnText: { color: '#0a0a0f', fontSize: 16, fontWeight: '600' },
});