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
} from 'react-native';
import { supabase } from '../supabase';

// --- MATCHES LIST VIEW ---
function MatchesList({ matches, onSelect, onBack }) {
  if (matches.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Matches</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>💜</Text>
          <Text style={s.emptyTitle}>No matches yet</Text>
          <Text style={s.emptyBody}>
            Keep browsing and liking people.{'\n'}
            When someone likes you back, they'll appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Matches</Text>
        <View style={{ width: 50 }} />
      </View>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.matchId}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.matchCard}
            onPress={() => onSelect(item)}
          >
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={s.matchInfo}>
              <Text style={s.matchName}>{item.name}</Text>
              <Text style={s.matchSub}>
                {item.lastMessage || 'Say hello! 👋'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

// --- CHAT VIEW ---
function ChatView({ match, currentUserId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadMessages();

    // Subscribe to new messages in real-time
    const channel = supabase
      .channel(`chat-${match.matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${match.matchId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', match.matchId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  }

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText('');

    const { error } = await supabase.from('messages').insert({
      match_id: match.matchId,
      sender_id: currentUserId,
      text: trimmed,
    });

    if (error) console.log('Send error:', error);
    setSending(false);
  }

  function renderMessage({ item }) {
    const isMe = item.sender_id === currentUserId;
    return (
      <View
        style={[
          s.msgRow,
          { justifyContent: isMe ? 'flex-end' : 'flex-start' },
        ]}
      >
        <View style={[s.msgBubble, isMe ? s.myBubble : s.theirBubble]}>
          <Text style={[s.msgText, isMe ? s.myText : s.theirText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.chatHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.chatName}>{match.name}</Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={s.msgList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyChat}>
                Say something! Be yourself. 😊
              </Text>
            </View>
          }
        />

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Type a message..."
            placeholderTextColor="#52525b"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- MAIN MATCHES SCREEN ---
export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    const { data: userData } = await supabase.auth.getUser();
    const myId = userData?.user?.id;
    setCurrentUserId(myId);

    // Get all matches where I'm involved
    const { data: matchData, error } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Match fetch error:', error);
      setLoading(false);
      return;
    }

    // Get the other person's profile for each match
    const otherIds = (matchData || []).map((m) =>
      m.user1_id === myId ? m.user2_id : m.user1_id
    );

    if (otherIds.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', otherIds);

    const profileMap = {};
    (profiles || []).forEach((p) => {
      profileMap[p.id] = p;
    });

    // Get last message for each match
    const formatted = (matchData || []).map((m) => {
      const otherId = m.user1_id === myId ? m.user2_id : m.user1_id;
      const otherProfile = profileMap[otherId] || {};
      return {
        matchId: m.id,
        otherId,
        name: otherProfile.name || 'Unknown',
        lastMessage: null,
      };
    });

    setMatches(formatted);
    setLoading(false);
  }

  if (selectedMatch) {
    return (
      <ChatView
        match={selectedMatch}
        currentUserId={currentUserId}
        onBack={() => {
          setSelectedMatch(null);
          loadMatches();
        }}
      />
    );
  }

  return (
    <MatchesList
      matches={matches}
      onSelect={setSelectedMatch}
      onBack={() => navigation.goBack()}
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40,
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: '#f4f4f5',
  },
  backText: { color: '#818cf8', fontSize: 15, fontWeight: '600' },

  // Match cards
  matchCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, backgroundColor: '#18181b',
    borderRadius: 14, marginBottom: 10,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  matchInfo: { flex: 1 },
  matchName: { fontSize: 16, fontWeight: '700', color: '#f4f4f5' },
  matchSub: { fontSize: 13, color: '#71717a', marginTop: 2 },

  // Chat header
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
  },
  chatName: { fontSize: 18, fontWeight: '700', color: '#f4f4f5' },

  // Messages
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  msgBubble: {
    maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#27272a',
    borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 15, lineHeight: 20 },
  myText: { color: '#fff' },
  theirText: { color: '#e4e4e7' },
  emptyChat: { color: '#52525b', fontSize: 15 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#1a1a2e',
  },
  input: {
    flex: 1, backgroundColor: '#18181b',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    color: '#fff', fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Empty states
  emptyTitle: {
    fontSize: 24, fontWeight: '700', color: '#f4f4f5', marginBottom: 8,
  },
  emptyBody: {
    fontSize: 15, color: '#71717a', textAlign: 'center',
    lineHeight: 22,
  },
});