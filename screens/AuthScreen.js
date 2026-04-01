import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '../supabase';

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (!isLogin && name.trim().length < 2) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // --- LOG IN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigation.replace('Home');
      } else {
        // --- SIGN UP ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Create profile in database
        const userId = data.user?.id;
        if (userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: userId, name: name.trim() });
          if (profileError) console.log('Profile error:', profileError);
        }

        Alert.alert(
          'Account created!',
          'Check your email for a confirmation link, then log in. (For testing, you can log in directly.)',
          [{ text: 'OK', onPress: () => setIsLogin(true) }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }

    setLoading(false);
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.inner}
      >
        <View style={s.header}>
          <Text style={s.logo}>7AM</Text>
          <Text style={s.tagline}>
            {isLogin ? 'Welcome back.' : 'Show up as you are.'}
          </Text>
        </View>

        <View style={s.form}>
          {!isLogin && (
            <View style={s.inputWrap}>
              <Text style={s.label}>Your name</Text>
              <TextInput
                style={s.input}
                placeholder="What should people call you?"
                placeholderTextColor="#52525b"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={s.inputWrap}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@email.com"
              placeholderTextColor="#52525b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={s.inputWrap}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#52525b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={s.btnText}>
              {loading
                ? 'Hold on...'
                : isLogin
                ? 'Log In'
                : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.toggle}>
          <Text style={s.toggleText}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={s.toggleLink}>
              {isLogin ? ' Sign Up' : ' Log In'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: {
    flex: 1, justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: {
    fontSize: 48, fontWeight: '900', color: '#818cf8',
    letterSpacing: -1, marginBottom: 8,
  },
  tagline: {
    fontSize: 16, color: '#71717a', fontWeight: '500',
  },
  form: { gap: 18 },
  inputWrap: { gap: 6 },
  label: {
    fontSize: 13, fontWeight: '600', color: '#a1a1aa',
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 16,
    color: '#fff', fontSize: 15,
  },
  btn: {
    backgroundColor: '#6366f1',
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  toggle: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 24,
  },
  toggleText: { color: '#71717a', fontSize: 14 },
  toggleLink: { color: '#818cf8', fontSize: 14, fontWeight: '600' },
});