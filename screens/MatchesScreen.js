import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { supabase } from '../supabase';

function MatchesList({ matches, onSelect, onBack, onUnmatch }) {
  if (matches.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={s.backText}>back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>matches</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.center}>
          <Text style={s.emptyTitle}>no matches yet</Text>
          <Text style={s.emptyBody}>
            keep browsing.{'\n'}when someone likes you back,{'\n'}they'll show up here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backText}>back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>matches</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.matchId}
        contentContainerStyle={{ padding: 16 }}
                  renderItem={({ item }) => (
          <TouchableOpacity style={s.matchCard} onPress={() => onSelect(item)}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{item.name.charAt(0).toLowerCase()}</Text>
            </View>
            <View style={s.matchInfo}>
              <Text style={s.matchName}>{item.name.toLowerCase()}</Text>
              <Text style={s.matchSub}>{item.lastMessage || 'say hello'}</Text>
            </View>
            <TouchableOpacity
              style={s.unmatchBtn}
              onPress={() => {
                Alert.alert(
                  'unmatch?',
                  `this will remove your match with ${item.name.toLowerCase()} and delete your conversation.`,
                  [
                    { text: 'cancel', style: 'cancel' },
                    {
                      text: 'unmatch',
                      style: 'destructive',
                      onPress: async () => {
                        await supabase.from('messages').delete().eq('match_id', item.matchId);
                        await supabase.from('matches').delete().eq('id', item.matchId);
                        onUnmatch(item.matchId);
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={s.unmatchText}>x</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function ChatView({ match, currentUserId, onBack, onUnmatch }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`chat-${match.matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${match.matchId}` },
        (payload) => { setMessages((prev) => [...prev, payload.new]); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadMessages() {
    const { data } = await supabase.from('messages').select('*').eq('match_id', match.matchId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  }

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    await supabase.from('messages').insert({ match_id: match.matchId, sender_id: currentUserId, text: trimmed });
    setSending(false);
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.chatHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backText}>back</Text>
        </TouchableOpacity>
        <Text style={s.chatName}>{match.name.toLowerCase()}</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert(
            'report or block',
            `what would you like to do with ${match.name.toLowerCase()}?`,
            [
              { text: 'cancel', style: 'cancel' },
              {
                text: 'block & unmatch',
                style: 'destructive',
                onPress: async () => {
                  await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: match.otherId });
                  await supabase.from('messages').delete().eq('match_id', match.matchId);
                  await supabase.from('matches').delete().eq('id', match.matchId);
                  Alert.alert('blocked', 'you won\'t see this person again.');
                  onUnmatch(match.matchId);
                },
              },
              {
                text: 'report & block',
                style: 'destructive',
                onPress: async () => {
                  await supabase.from('reports').insert({ reporter_id: currentUserId, reported_id: match.otherId, reason: 'reported from chat' });
                  await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: match.otherId });
                  await supabase.from('messages').delete().eq('match_id', match.matchId);
                  await supabase.from('matches').delete().eq('id', match.matchId);
                  Alert.alert('reported', 'thanks for keeping 7am safe.');
                  onUnmatch(match.matchId);
                },
              },
            ]
          );
        }}>
          <Text style={s.reportText}>report</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={s.center}><Text style={s.emptyChat}>say something.</Text></View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === currentUserId;
            return (
              <View style={[s.msgRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
                <View style={[s.msgBubble, isMe ? s.myBubble : s.theirBubble]}>
                  <Text style={[s.msgText, isMe ? s.myText : s.theirText]}>{item.text}</Text>
                </View>
              </View>
            );
          }}
        />
        <View style={s.inputBar}>
          <TextInput style={s.input} placeholder="message" placeholderTextColor="#3f3f46"
            value={text} onChangeText={setText} multiline maxLength={500} />
          <TouchableOpacity style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
            onPress={sendMessage} disabled={!text.trim() || sending}>
            <Text style={s.sendBtnText}>send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMatches(); }, []);

  async function loadMatches() {
    const { data: userData } = await supabase.auth.getUser();
    const myId = userData?.user?.id;
    setCurrentUserId(myId);
    const { data: matchData } = await supabase.from('matches').select('*').or(`user1_id.eq.${myId},user2_id.eq.${myId}`).order('created_at', { ascending: false });
    const otherIds = (matchData || []).map((m) => m.user1_id === myId ? m.user2_id : m.user1_id);
    if (otherIds.length === 0) { setMatches([]); setLoading(false); return; }
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', otherIds);
    const profileMap = {};
    (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    const formatted = (matchData || []).map((m) => {
      const otherId = m.user1_id === myId ? m.user2_id : m.user1_id;
      return { matchId: m.id, otherId, name: (profileMap[otherId] || {}).name || 'unknown', lastMessage: null };
    });
    setMatches(formatted);
    setLoading(false);
  }

  if (selectedMatch) {
    return <ChatView match={selectedMatch} currentUserId={currentUserId}
      onBack={() => { setSelectedMatch(null); loadMatches(); }}
      onUnmatch={(matchId) => { setSelectedMatch(null); setMatches(matches.filter((m) => m.matchId !== matchId)); }} />;
  }

  return <MatchesList matches={matches} onSelect={setSelectedMatch} onBack={() => navigation.goBack()}
    onUnmatch={(matchId) => setMatches(matches.filter((m) => m.matchId !== matchId))} />;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#1a1a2e' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backText: { color: '#52525b', fontSize: 14 },
  matchCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#18181b', borderRadius: 14, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  matchInfo: { flex: 1 },
  matchName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  matchSub: { fontSize: 13, color: '#52525b', marginTop: 2 },
  unmatchBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center',
  },
  unmatchText: { color: '#52525b', fontSize: 12, fontWeight: '500' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#1a1a2e' },
  chatName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  reportText: { color: '#52525b', fontSize: 13 },
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 6 },
  msgBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  myBubble: { backgroundColor: '#fff', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#18181b', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  myText: { color: '#0a0a0f' },
  theirText: { color: '#e4e4e7' },
  emptyChat: { color: '#3f3f46', fontSize: 15 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#1a1a2e' },
  input: { flex: 1, backgroundColor: '#18181b', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff' },
  sendBtnDisabled: { opacity: 0.2 },
  sendBtnText: { color: '#0a0a0f', fontSize: 14, fontWeight: '600' },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyBody: { fontSize: 15, color: '#52525b', textAlign: 'center', lineHeight: 22 },
});