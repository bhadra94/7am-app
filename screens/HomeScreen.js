import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Text style={s.logo}>7AM</Text>
        <Text style={s.msg}>You're in! 🎉</Text>
        <Text style={s.sub}>
          This is where the video profiles will live.{'\n'}
          We'll build the camera recording flow next.
        </Text>
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
    textAlign: 'center', lineHeight: 22,
  },
});