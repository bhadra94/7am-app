import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Text style={s.logo}>7AM</Text>
        <Text style={s.msg}>You're in! 🎉</Text>
        <Text style={s.sub}>
          Now let's create your profile.{'\n'}
          Record your 3 clips to get started.
        </Text>
        <TouchableOpacity
          style={s.btn}
          onPress={() => navigation.navigate('Record')}
        >
          <Text style={s.btnText}>Record My Clips 🎬</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 40,
  },
  logo: {
    fontSize: 48, fontWeight: '900', color: '#818cf8',
    marginBottom: 16,
  },
  msg: {
    fontSize: 24, fontWeight: '700', color: '#f4f4f5',
    marginBottom: 12,
  },
  sub: {
    fontSize: 15, color: '#71717a',
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  btn: {
    width: '100%', paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#6366f1', alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});