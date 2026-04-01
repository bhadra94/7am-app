import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { supabase } from '../supabase';

export default function SettingsScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState('');
  const [hideAge, setHideAge] = useState(false);
  const [pauseProfile, setPauseProfile] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      setUserId(userData.user.id);
      setEmail(userData.user.email || '');
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Privacy */}
        <Text style={s.sectionLabel}>privacy</Text>

        <View style={s.settingRow}>
          <View style={s.settingInfo}>
            <Text style={s.settingTitle}>hide my age</Text>
            <Text style={s.settingDesc}>your age won't be visible on your profile</Text>
          </View>
          <Switch
            value={hideAge}
            onValueChange={setHideAge}
            trackColor={{ false: '#27272a', true: '#fff' }}
            thumbColor={hideAge ? '#0a0a0f' : '#52525b'}
          />
        </View>

        <View style={s.settingRow}>
          <View style={s.settingInfo}>
            <Text style={s.settingTitle}>pause my profile</Text>
            <Text style={s.settingDesc}>temporarily hide yourself from browsing</Text>
          </View>
          <Switch
            value={pauseProfile}
            onValueChange={setPauseProfile}
            trackColor={{ false: '#27272a', true: '#fff' }}
            thumbColor={pauseProfile ? '#0a0a0f' : '#52525b'}
          />
        </View>

        {/* Support */}
        <Text style={[s.sectionLabel, { marginTop: 32 }]}>support</Text>

        <TouchableOpacity style={s.linkRow} onPress={() => {
          Linking.openURL('mailto:support@7am.app?subject=7am%20support');
        }}>
          <Text style={s.linkText}>contact us</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.linkRow} onPress={() => {
          Alert.alert('7am', 'version 1.0.0\n\nbuilt with radical honesty.\nopen source — github.com/bhadra94/7am-app');
        }}>
          <Text style={s.linkText}>about 7am</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.linkRow} onPress={() => {
          Linking.openURL('https://github.com/bhadra94/7am-app');
        }}>
          <Text style={s.linkText}>source code</Text>
        </TouchableOpacity>

        {/* Account */}
        <Text style={[s.sectionLabel, { marginTop: 32 }]}>account</Text>

        <View style={s.emailRow}>
          <Text style={s.emailLabel}>signed in as</Text>
          <Text style={s.emailText}>{email}</Text>
        </View>

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

        <View style={s.footer}>
          <Text style={s.footerText}>7am v1.0.0</Text>
          <Text style={s.footerText}>made with no filters</Text>
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
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: '#3f3f46',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#18181b',
  },
  settingInfo: { flex: 1, marginRight: 16 },
  settingTitle: { fontSize: 15, fontWeight: '500', color: '#fff' },
  settingDesc: { fontSize: 12, color: '#52525b', marginTop: 3 },
  linkRow: {
    paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#18181b',
  },
  linkText: { fontSize: 15, color: '#a1a1aa' },
  emailRow: {
    paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#18181b',
  },
  emailLabel: { fontSize: 12, color: '#3f3f46', marginBottom: 4 },
  emailText: { fontSize: 15, color: '#71717a' },
  logoutBtn: {
    paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#18181b', alignItems: 'center',
    marginTop: 16,
  },
  logoutBtnText: { color: '#a1a1aa', fontSize: 15, fontWeight: '500' },
  deleteBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
  footer: { alignItems: 'center', marginTop: 40, gap: 4 },
  footerText: { fontSize: 12, color: '#27272a' },
});