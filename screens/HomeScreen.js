import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../supabase';

export default function HomeScreen({ navigation }) {
  const [name, setName] = useState('');
  const [hasClips, setHasClips] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  async function loadUserInfo() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    // Get profile name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    if (profile) setName(profile.name);

    // Check if user has recorded clips
    const { data: clips } = await supabase
      .from('clips')
      .select('id')
      .eq('user_id', userId);

    if (clips && clips.length > 0) setHasClips(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigation.replace('Auth');
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>7AM</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={s.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={s.center}>
        <Text style={s.greeting}>
          Hey{name ? `, ${name}` : ''}! 👋
        </Text>

        {hasClips ? (
          <>
            <Text style={s.sub}>
              Your profile is live.{'\n'}
              Browse others or re-record your clips.
            </Text>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => navigation.navigate('Browse')}
            >
              <Text style={s.btnText}>Browse Profiles 💜</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => navigation.navigate('Record')}
            >
              <Text style={s.secondaryBtnText}>Re-record My Clips</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.sub}>
              Record your 3 clips to get started.{'\n'}
              It only takes 30 seconds.
            </Text>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => navigation.navigate('Record')}
            >
              <Text style={s.btnText}>Record My Clips 🎬</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, paddingTop: 16,
  },
  logo: { fontSize: 24, fontWeight: '900', color: '#818cf8' },
  logout: { color: '#71717a', fontSize: 14, fontWeight: '500' },
  center: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 40,
  },
  greeting: {
    fontSize: 28, fontWeight: '800', color: '#f4f4f5',
    marginBottom: 12, textAlign: 'center',
  },
  sub: {
    fontSize: 15, color: '#71717a',
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  primaryBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#6366f1', alignItems: 'center', marginBottom: 12,
  },
  secondaryBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#333', alignItems: 'center',
  },
  secondaryBtnText: { color: '#a1a1aa', fontSize: 16, fontWeight: '600' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});