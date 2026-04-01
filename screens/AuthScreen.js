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
      Alert.alert('invalid email', 'please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('weak password', 'password must be at least 6 characters.');
      return;
    }
    if (!isLogin && name.trim().length < 2) {
      Alert.alert('name required', 'please enter your name.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        const userId = data.user?.id;
        if (userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ id: userId, name: name.trim() });
          if (profileError) console.log('Profile error:', profileError);
        }

        Alert.alert(
          'account created',
          'you can now log in.',
          [{ text: 'ok', onPress: () => setIsLogin(true) }]
        );
      }
    } catch (error) {
      Alert.alert('error', error.message);
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
          <Text style={s.logo}>7am</Text>
        </View>

        <View style={s.form}>
          {!isLogin && (
            <TextInput
              style={s.input}
              placeholder="your name"
              placeholderTextColor="#3f3f46"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={s.input}
            placeholder="email"
            placeholderTextColor="#3f3f46"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={s.input}
            placeholder="password"
            placeholderTextColor="#3f3f46"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={s.btnText}>
              {loading
                ? 'hold on...'
                : isLogin
                ? 'log in'
                : 'create account'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={s.toggle}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={s.toggleText}>
            {isLogin
              ? "don't have an account? sign up"
              : 'already have an account? log in'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: {
    flex: 1, justifyContent: 'center', paddingHorizontal: 48,
  },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: {
    fontSize: 56, fontWeight: '900', color: '#fff',
    letterSpacing: -2,
  },
  form: { gap: 14 },
  input: {
    backgroundColor: '#18181b',
    borderRadius: 12, padding: 16,
    color: '#fff', fontSize: 15,
  },
  btn: {
    backgroundColor: '#fff',
    paddingVertical: 18, borderRadius: 14,
    alignItems: 'center', marginTop: 6,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: '#0a0a0f', fontSize: 16, fontWeight: '600',
    letterSpacing: -0.3,
  },
  toggle: { alignItems: 'center', marginTop: 24 },
  toggleText: { color: '#52525b', fontSize: 14 },
});