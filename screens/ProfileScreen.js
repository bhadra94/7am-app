import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Video } from 'expo-av';
import { supabase } from '../supabase';

const { width } = Dimensions.get('window');
const clipLabels = { 1: 'your face', 2: 'your body', 3: 'your world' };

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [age, setAge] = useState(null);
  const [gender, setGender] = useState('');
  const [interestedIn, setInterestedIn] = useState('');
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [clips, setClips] = useState([]);
  const [activeClip, setActiveClip] = useState(null);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    const userEmail = userData?.user?.email;
    if (!uid) return;
    setUserId(uid);
    setEmail(userEmail || '');

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, age, gender, interested_in, bio')
      .eq('id', uid)
      .single();

    if (profile) {
      setName(profile.name);
      setNewName(profile.name);
      setAge(profile.age);
      setGender(profile.gender || '');
      setInterestedIn(profile.interested_in || '');
      setBio(profile.bio || '');
      setNewBio(profile.bio || '');
    }

    const { data: userClips } = await supabase
      .from('clips')
      .select('*')
      .eq('user_id', uid)
      .order('clip_number');

    if (userClips) setClips(userClips);
  }

  async function saveName() {
    if (newName.trim().length < 2) {
      Alert.alert('too short', 'name must be at least 2 characters.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ name: newName.trim() })
      .eq('id', userId);

    if (error) {
      Alert.alert('error', 'could not update name.');
    } else {
      setName(newName.trim());
      setEditingName(false);
    }
  }

  async function deleteClip(clipNumber) {
    Alert.alert(
      'delete clip?',
      'you can re-record it afterwards.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'delete',
          style: 'destructive',
          onPress: async () => {
            const clip = clips.find((c) => c.clip_number === clipNumber);
            if (!clip) return;

            // Delete from storage
            const path = `${userId}/clip${clipNumber}`;
            const { data: files } = await supabase.storage
              .from('clips')
              .list(userId);

            const matchingFile = (files || []).find((f) =>
              f.name.startsWith(`clip${clipNumber}`)
            );

            if (matchingFile) {
              await supabase.storage
                .from('clips')
                .remove([`${userId}/${matchingFile.name}`]);
            }

            // Delete from database
            await supabase
              .from('clips')
              .delete()
              .eq('id', clip.id);

            setClips(clips.filter((c) => c.clip_number !== clipNumber));
            setActiveClip(null);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Name section */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>name</Text>
          {editingName ? (
            <View style={s.editRow}>
              <TextInput
                style={s.nameInput}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                autoCapitalize="words"
              />
              <TouchableOpacity style={s.saveBtn} onPress={saveName}>
                <Text style={s.saveBtnText}>save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setNewName(name);
                  setEditingName(false);
                }}
              >
                <Text style={s.cancelText}>cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={s.nameRow}
              onPress={() => setEditingName(true)}
            >
              <Text style={s.nameText}>{name.toLowerCase()}</Text>
              <Text style={s.editHint}>tap to edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Email section */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>email</Text>
          <Text style={s.emailText}>{email}</Text>
        </View>

        {/* Details section */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>details</Text>
          <View style={s.detailsGrid}>
            <View style={s.detailCard}>
              <Text style={s.detailLabel}>age</Text>
              <Text style={s.detailValue}>{age || '—'}</Text>
            </View>
            <View style={s.detailCard}>
              <Text style={s.detailLabel}>gender</Text>
              <Text style={s.detailValue}>{gender || '—'}</Text>
            </View>
            <View style={s.detailCard}>
              <Text style={s.detailLabel}>interested in</Text>
              <Text style={s.detailValue}>{interestedIn || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Bio section */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>bio</Text>
          {editingBio ? (
            <View style={s.editBioWrap}>
              <TextInput
                style={s.bioInput}
                value={newBio}
                onChangeText={setNewBio}
                multiline
                maxLength={150}
                autoFocus
                placeholder="write something about yourself..."
                placeholderTextColor="#3f3f46"
              />
              <Text style={s.bioCount}>{newBio.length}/150</Text>
              <View style={s.editBioRow}>
                <TouchableOpacity
                  style={s.saveBtn}
                  onPress={async () => {
                    const { error } = await supabase
                      .from('profiles')
                      .update({ bio: newBio.trim() })
                      .eq('id', userId);
                    if (!error) {
                      setBio(newBio.trim());
                      setEditingBio(false);
                    }
                  }}
                >
                  <Text style={s.saveBtnText}>save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setNewBio(bio);
                    setEditingBio(false);
                  }}
                >
                  <Text style={s.cancelText}>cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingBio(true)}>
              <Text style={bio ? s.bioText : s.bioPlaceholder}>
                {bio || 'tap to add a bio'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Clips section */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>your clips</Text>

          {clips.length === 0 ? (
            <View style={s.noClips}>
              <Text style={s.noClipsText}>no clips recorded yet.</Text>
              <TouchableOpacity
                style={s.recordBtn}
                onPress={() => navigation.navigate('Record')}
              >
                <Text style={s.recordBtnText}>record clips</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.clipGrid}>
              {[1, 2, 3].map((num) => {
                const clip = clips.find((c) => c.clip_number === num);
                return (
                  <View key={num} style={s.clipCard}>
                    <Text style={s.clipLabel}>{clipLabels[num]}</Text>
                    {clip ? (
                      <>
                        <TouchableOpacity
                          style={s.clipPreview}
                          onPress={() =>
                            setActiveClip(
                              activeClip === num ? null : num
                            )
                          }
                        >
                          {activeClip === num ? (
                            <Video
                              source={{ uri: clip.video_url }}
                              style={s.clipVideo}
                              shouldPlay
                              isLooping
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={s.clipThumb}>
                              <Text style={s.playText}>play</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        {clip.script && (
                          <Text style={s.clipScript}>
                            "{clip.script}"
                          </Text>
                        )}
                        <TouchableOpacity
                          onPress={() => deleteClip(num)}
                        >
                          <Text style={s.deleteText}>delete</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={s.clipEmpty}>
                        <Text style={s.clipEmptyText}>not recorded</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {clips.length > 0 && (
            <TouchableOpacity
              style={s.rerecordBtn}
              onPress={() => navigation.navigate('Record')}
            >
              <Text style={s.rerecordBtnText}>re-record all clips</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account section */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>account</Text>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={async () => {
              await supabase.auth.signOut();
            }}
          >
            <Text style={s.logoutBtnText}>log out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => {
              Alert.alert(
                'delete account?',
                'this will permanently delete your profile, clips, matches, and messages. this cannot be undone.',
                [
                  { text: 'cancel', style: 'cancel' },
                  {
                    text: 'delete my account',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        // Delete video files from storage
                        const { data: files } = await supabase.storage
                          .from('clips')
                          .list(userId);

                        if (files && files.length > 0) {
                          const paths = files.map((f) => `${userId}/${f.name}`);
                          await supabase.storage.from('clips').remove(paths);
                        }

                        // Call the database function to delete everything
                        const { error } = await supabase.rpc('delete_own_account');

                        if (error) {
                          Alert.alert('error', 'could not delete account. try again.');
                          console.log('Delete error:', error);
                        } else {
                          await supabase.auth.signOut();
                        }
                      } catch (err) {
                        Alert.alert('error', 'something went wrong.');
                        console.log('Delete error:', err);
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={s.deleteBtnText}>delete account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#1a1a2e',
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backText: { color: '#52525b', fontSize: 14 },
  scroll: { padding: 24, paddingBottom: 60 },
  section: { marginBottom: 36 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: '#3f3f46',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  editHint: { fontSize: 13, color: '#3f3f46' },
  editRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  nameInput: {
    flex: 1, backgroundColor: '#18181b', borderRadius: 10,
    padding: 14, color: '#fff', fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10,
  },
  saveBtnText: { color: '#0a0a0f', fontSize: 14, fontWeight: '600' },
  cancelText: { color: '#52525b', fontSize: 14 },
  emailText: { fontSize: 15, color: '#52525b' },
  detailsGrid: { flexDirection: 'row', gap: 10 },
  detailCard: {
    flex: 1, backgroundColor: '#18181b', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  detailLabel: { fontSize: 11, color: '#3f3f46', marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#fff' },
  bioText: { fontSize: 15, color: '#a1a1aa', lineHeight: 22 },
  bioPlaceholder: { fontSize: 15, color: '#3f3f46', fontStyle: 'italic' },
  editBioWrap: { gap: 8 },
  bioInput: {
    backgroundColor: '#18181b', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, minHeight: 80, textAlignVertical: 'top',
  },
  bioCount: { fontSize: 11, color: '#3f3f46', textAlign: 'right' },
  editBioRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clipGrid: { gap: 16 },
  clipCard: {
    backgroundColor: '#18181b', borderRadius: 14, padding: 16,
  },
  clipLabel: {
    fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 10,
  },
  clipPreview: {
    height: 180, borderRadius: 10, overflow: 'hidden', marginBottom: 10,
  },
  clipVideo: { flex: 1 },
  clipThumb: {
    flex: 1, backgroundColor: '#27272a', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  playText: { color: '#52525b', fontSize: 14 },
  clipScript: {
    fontSize: 13, color: '#52525b', fontStyle: 'italic',
    marginBottom: 8,
  },
  deleteText: { color: '#52525b', fontSize: 13 },
  clipEmpty: {
    height: 80, backgroundColor: '#27272a', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  clipEmptyText: { color: '#3f3f46', fontSize: 13 },
  noClips: { alignItems: 'center', paddingVertical: 20 },
  noClipsText: { color: '#52525b', fontSize: 15, marginBottom: 16 },
  recordBtn: {
    backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 12,
  },
  recordBtnText: { color: '#0a0a0f', fontSize: 15, fontWeight: '600' },
  rerecordBtn: {
    marginTop: 16, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#18181b', alignItems: 'center',
  },
  rerecordBtnText: { color: '#71717a', fontSize: 15, fontWeight: '500' },
  logoutBtn: {
    paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#18181b', alignItems: 'center',
  },
  logoutBtnText: { color: '#52525b', fontSize: 15, fontWeight: '500' },
  deleteBtn: {
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 10,
  },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
});