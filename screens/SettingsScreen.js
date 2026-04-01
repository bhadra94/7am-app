import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { supabase } from '../supabase';

function OptionRow({ label, options, selected, onSelect }) {
  return (
    <View style={s.optionRow}>
      <Text style={s.optionLabel}>{label}</Text>
      <View style={s.optionBtns}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionBtn, selected === opt.value && s.optionBtnActive]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[s.optionBtnText, selected === opt.value && s.optionBtnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [interestedIn, setInterestedIn] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [original, setOriginal] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;
    setUserId(uid);

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, age, gender, interested_in, bio')
      .eq('id', uid)
      .single();

    if (profile) {
      const vals = {
        name: profile.name || '',
        age: profile.age ? String(profile.age) : '',
        gender: profile.gender || '',
        interestedIn: profile.interested_in || '',
        bio: profile.bio || '',
      };
      setName(vals.name);
      setAge(vals.age);
      setGender(vals.gender);
      setInterestedIn(vals.interestedIn);
      setBio(vals.bio);
      setOriginal(vals);
    }
    setLoading(false);
  }

  function checkChanges(field, value) {
    const updated = { name, age, gender, interestedIn, bio, [field]: value };
    const changed = updated.name !== original.name ||
      updated.age !== original.age ||
      updated.gender !== original.gender ||
      updated.interestedIn !== original.interestedIn ||
      updated.bio !== original.bio;
    setHasChanges(changed);
  }

  async function saveSettings() {
    if (name.trim().length < 2) {
      Alert.alert('invalid name', 'name must be at least 2 characters.');
      return;
    }
    const ageNum = parseInt(age);
    if (!ageNum || ageNum < 18 || ageNum > 100) {
      Alert.alert('invalid age', 'age must be between 18 and 100.');
      return;
    }
    if (!gender) {
      Alert.alert('gender required', 'please select your gender.');
      return;
    }
    if (!interestedIn) {
      Alert.alert('preference required', 'please select who you\'re interested in.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        age: ageNum,
        gender,
        interested_in: interestedIn,
        bio: bio.trim(),
      })
      .eq('id', userId);

    setSaving(false);

    if (error) {
      Alert.alert('error', 'could not save settings.');
    } else {
      const newVals = { name: name.trim(), age: String(ageNum), gender, interestedIn, bio: bio.trim() };
      setOriginal(newVals);
      setHasChanges(false);
      Alert.alert('saved', 'your settings have been updated.');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.loadingText}>loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => {
          if (hasChanges) {
            Alert.alert('unsaved changes', 'you have unsaved changes. discard them?', [
              { text: 'keep editing', style: 'cancel' },
              { text: 'discard', style: 'destructive', onPress: () => navigation.goBack() },
            ]);
          } else {
            navigation.goBack();
          }
        }}>
          <Text style={s.backText}>back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>settings</Text>
        <TouchableOpacity
          onPress={saveSettings}
          disabled={!hasChanges || saving}
        >
          <Text style={[s.saveText, (!hasChanges || saving) && s.saveTextDisabled]}>
            {saving ? '...' : 'save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={(v) => { setName(v); checkChanges('name', v); }}
            autoCapitalize="words"
          />
        </View>

        {/* Age */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>age</Text>
          <TextInput
            style={s.input}
            value={age}
            onChangeText={(v) => { setAge(v); checkChanges('age', v); }}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* Gender */}
        <OptionRow
          label="i am a"
          options={[
            { value: 'man', label: 'man' },
            { value: 'woman', label: 'woman' },
            { value: 'nonbinary', label: 'nonbinary' },
          ]}
          selected={gender}
          onSelect={(v) => { setGender(v); checkChanges('gender', v); }}
        />

        {/* Interested in */}
        <OptionRow
          label="interested in"
          options={[
            { value: 'men', label: 'men' },
            { value: 'women', label: 'women' },
            { value: 'everyone', label: 'everyone' },
          ]}
          selected={interestedIn}
          onSelect={(v) => { setInterestedIn(v); checkChanges('interestedIn', v); }}
        />

        {/* Bio */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>bio</Text>
          <TextInput
            style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={bio}
            onChangeText={(v) => { setBio(v); checkChanges('bio', v); }}
            multiline
            maxLength={150}
            placeholder="write something about yourself..."
            placeholderTextColor="#3f3f46"
          />
          <Text style={s.charCount}>{bio.length}/150</Text>
        </View>

        {/* Danger zone */}
        <View style={[s.section, { marginTop: 20 }]}>
          <Text style={s.sectionLabel}>account</Text>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={async () => { await supabase.auth.signOut(); }}
          >
            <Text style={s.logoutBtnText}>log out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => {
              Alert.alert(
                'delete account?',
                'this will permanently delete everything. this cannot be undone.',
                [
                  { text: 'cancel', style: 'cancel' },
                  {
                    text: 'delete my account',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const { data: files } = await supabase.storage.from('clips').list(userId);
                        if (files && files.length > 0) {
                          const paths = files.map((f) => `${userId}/${f.name}`);
                          await supabase.storage.from('clips').remove(paths);
                        }
                        const { error } = await supabase.rpc('delete_own_account');
                        if (!error) await supabase.auth.signOut();
                        else Alert.alert('error', 'could not delete account.');
                      } catch (err) {
                        Alert.alert('error', 'something went wrong.');
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#52525b', fontSize: 15 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#1a1a2e',
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backText: { color: '#52525b', fontSize: 14 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saveTextDisabled: { color: '#3f3f46' },
  scroll: { padding: 24, paddingBottom: 60 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: '#3f3f46',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  input: {
    backgroundColor: '#18181b', borderRadius: 12, padding: 16,
    color: '#fff', fontSize: 15,
  },
  charCount: { fontSize: 11, color: '#3f3f46', textAlign: 'right', marginTop: 6 },
  optionRow: { marginBottom: 24 },
  optionLabel: {
    fontSize: 12, fontWeight: '600', color: '#3f3f46',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  optionBtns: { flexDirection: 'row', gap: 8 },
  optionBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#18181b', alignItems: 'center',
  },
  optionBtnActive: { backgroundColor: '#fff' },
  optionBtnText: { color: '#52525b', fontSize: 14, fontWeight: '500' },
  optionBtnTextActive: { color: '#0a0a0f', fontWeight: '600' },
  logoutBtn: {
    paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#18181b', alignItems: 'center',
  },
  logoutBtnText: { color: '#52525b', fontSize: 15, fontWeight: '500' },
  deleteBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
});