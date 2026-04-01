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

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    if (profile) setName(profile.name);

    const { data: clips } = await supabase
      .from('clips')
      .select('id')
      .eq('user_id', userId);

    if (clips && clips.length > 0) setHasClips(true);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>7am</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={s.logout}>log out</Text>
        </TouchableOpacity>
      </View>

      <View style={s.center}>
        {name ? (
          <Text style={s.greeting}>hey, {name.toLowerCase()}</Text>
        ) : (
          <Text style={s.greeting}>hey</Text>
        )}

        {hasClips ? (
          <>
            <Text style={s.sub}>your profile is live.</Text>
            <View style={s.buttons}>
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => navigation.navigate('Browse')}
              >
                <Text style={s.primaryBtnText}>browse people</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => navigation.navigate('Matches')}
              >
                <Text style={s.secondaryBtnText}>matches</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.tertiaryBtn}
                onPress={() => navigation.navigate('Record')}
              >
                <Text style={s.tertiaryBtnText}>re-record clips</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={s.sub}>
              record your 3 clips to get started.{'\n'}
              it only takes 30 seconds.
            </Text>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => navigation.navigate('Record')}
            >
              <Text style={s.primaryBtnText}>record my clips</Text>
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
    alignItems: 'center', paddingHorizontal: 32, paddingTop: 16,
  },
  logo: {
    fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -1,
  },
  logout: { color: '#3f3f46', fontSize: 14 },
  center: {
    flex: 1, justifyContent: 'center', paddingHorizontal: 48,
  },
  greeting: {
    fontSize: 32, fontWeight: '800', color: '#fff',
    marginBottom: 8, letterSpacing: -0.5,
  },
  sub: {
    fontSize: 16, color: '#52525b', lineHeight: 24, marginBottom: 40,
  },
  buttons: { gap: 10 },
  primaryBtn: {
    paddingVertical: 18, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center',
  },
  primaryBtnText: {
    color: '#0a0a0f', fontSize: 16, fontWeight: '600',
    letterSpacing: -0.3,
  },
  secondaryBtn: {
    paddingVertical: 18, borderRadius: 14,
    backgroundColor: '#18181b', alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#a1a1aa', fontSize: 16, fontWeight: '500',
  },
  tertiaryBtn: {
    paddingVertical: 16, alignItems: 'center',
  },
  tertiaryBtnText: {
    color: '#3f3f46', fontSize: 14, fontWeight: '500',
  },
});