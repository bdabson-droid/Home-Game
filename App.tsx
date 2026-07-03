import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type PlayerStatus = "host" | "invited" | "seated" | "waitlist";

type Player = {
  id: string;
  name: string;
  phone: string;
  status: PlayerStatus;
};

type Tab = "host" | "join";

const HOME_GAME_CODE = "482913";
const subscriptionPrice = "$14.99 / month";

const initialPlayers: Player[] = [
  {
    id: "host",
    name: "Master host",
    phone: "(555) 010-1000",
    status: "host",
  },
  {
    id: "player-1",
    name: "Maya Chen",
    phone: "(555) 010-2244",
    status: "seated",
  },
  {
    id: "player-2",
    name: "Invite pending",
    phone: "(555) 010-3777",
    status: "invited",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("host");
  const [subscribed, setSubscribed] = useState(false);
  const [hostName, setHostName] = useState("Alex Rivera");
  const [hostPhone, setHostPhone] = useState("(555) 010-1000");
  const [gameName, setGameName] = useState("Friday Night Hold'em");
  const [stakes, setStakes] = useState("$1 / $2 NLH");
  const [seatLimit, setSeatLimit] = useState("9");
  const [invitePhone, setInvitePhone] = useState("");
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [joinName, setJoinName] = useState("");
  const [joinPhone, setJoinPhone] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const seatsAvailable = useMemo(() => {
    const limit = Number.parseInt(seatLimit, 10) || 0;
    const seated = players.filter((player) =>
      ["host", "seated"].includes(player.status),
    ).length;

    return Math.max(limit - seated, 0);
  }, [players, seatLimit]);

  const inviteCount = players.filter((player) => player.status === "invited").length;
  const seatedCount = players.filter((player) =>
    ["host", "seated"].includes(player.status),
  ).length;

  function activateSubscription() {
    setSubscribed(true);
    Alert.alert(
      "Subscription active",
      "The host account can now create private games and invite players.",
    );
  }

  function invitePlayer() {
    const phone = invitePhone.trim();

    if (!subscribed) {
      Alert.alert("Subscription required", "Activate the host subscription first.");
      return;
    }

    if (phone.length < 10) {
      Alert.alert("Phone number needed", "Enter a valid phone number to invite.");
      return;
    }

    if (players.some((player) => player.phone === phone)) {
      Alert.alert("Already invited", "That phone number is already on this game list.");
      return;
    }

    setPlayers((currentPlayers) => [
      ...currentPlayers,
      {
        id: `invite-${Date.now()}`,
        name: "Invite pending",
        phone,
        status: "invited",
      },
    ]);
    setInvitePhone("");
  }

  function joinGame() {
    const name = joinName.trim();
    const phone = joinPhone.trim();

    if (joinCode.trim() !== HOME_GAME_CODE) {
      Alert.alert("Code not found", "Enter the numeric code for this home game.");
      return;
    }

    if (!name || phone.length < 10) {
      Alert.alert("Profile needed", "Enter your name and phone number to join.");
      return;
    }

    const status: PlayerStatus = seatsAvailable > 0 ? "seated" : "waitlist";
    setPlayers((currentPlayers) => [
      ...currentPlayers.filter((player) => player.phone !== phone),
      {
        id: `player-${Date.now()}`,
        name,
        phone,
        status,
      },
    ]);
    setJoinName("");
    setJoinPhone("");
    setJoinCode("");
    setActiveTab("host");
    Alert.alert(
      status === "seated" ? "You're on the list" : "Added to waitlist",
      `${name} joined ${gameName}.`,
    );
  }

  function markSeated(playerId: string) {
    if (seatsAvailable === 0) {
      Alert.alert("Game is full", "Increase the seat limit or wait for a seat to open.");
      return;
    }

    setPlayers((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === playerId ? { ...player, status: "seated" } : player,
      ),
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.screen}>
          <View style={styles.hero}>
            <View style={styles.logo}>
              <MaterialCommunityIcons name="cards-playing" size={32} color="#F6D77A" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Private poker club manager</Text>
              <Text style={styles.title}>Run your home game list from one place.</Text>
              <Text style={styles.subtitle}>
                Hosts subscribe, invite by phone, and give trusted players a code to
                request a seat.
              </Text>
            </View>
          </View>

          <View style={styles.tabBar}>
            <TabButton active={activeTab === "host"} label="Host console" onPress={() => setActiveTab("host")} />
            <TabButton active={activeTab === "join"} label="Join with code" onPress={() => setActiveTab("join")} />
          </View>

          {activeTab === "host" ? (
            <>
              <Card>
                <SectionHeader
                  icon="account-star"
                  title="Master host account"
                  subtitle="Only subscribed hosts can open a private game and send invites."
                />
                <Input label="Host name" value={hostName} onChangeText={setHostName} />
                <Input
                  label="Host phone"
                  value={hostPhone}
                  onChangeText={setHostPhone}
                  keyboardType="phone-pad"
                />
                <View style={styles.subscriptionRow}>
                  <View>
                    <Text style={styles.cardLabel}>Subscription</Text>
                    <Text style={styles.price}>{subscriptionPrice}</Text>
                  </View>
                  <StatusPill status={subscribed ? "active" : "locked"} />
                </View>
                <PrimaryButton
                  label={subscribed ? "Subscription active" : "Pay and activate host tools"}
                  icon={subscribed ? "check-circle" : "credit-card-outline"}
                  onPress={activateSubscription}
                  disabled={subscribed}
                />
              </Card>

              <Card>
                <SectionHeader
                  icon="poker-chip"
                  title="Home game setup"
                  subtitle="This creates the private list players can join by invite or code."
                />
                <Input label="Game name" value={gameName} onChangeText={setGameName} />
                <Input label="Stakes / format" value={stakes} onChangeText={setStakes} />
                <Input
                  label="Seats"
                  value={seatLimit}
                  onChangeText={setSeatLimit}
                  keyboardType="number-pad"
                />
                <View style={styles.codeBox}>
                  <View>
                    <Text style={styles.cardLabel}>Numeric access code</Text>
                    <Text style={styles.code}>{HOME_GAME_CODE}</Text>
                  </View>
                  <MaterialCommunityIcons name="lock-check" size={28} color="#F6D77A" />
                </View>
              </Card>

              <Card>
                <SectionHeader
                  icon="cellphone-message"
                  title="Invite players by phone"
                  subtitle="Invited numbers are tied to this specific home game."
                />
                <Input
                  label="Player phone number"
                  value={invitePhone}
                  onChangeText={setInvitePhone}
                  keyboardType="phone-pad"
                  placeholder="(555) 010-1234"
                />
                <PrimaryButton
                  label="Send invite"
                  icon="send"
                  onPress={invitePlayer}
                  disabled={!subscribed}
                />
              </Card>

              <Card>
                <View style={styles.dashboardHeader}>
                  <SectionHeader
                    icon="format-list-numbered"
                    title={gameName}
                    subtitle={`${stakes} • ${seatedCount} seated • ${inviteCount} pending • ${seatsAvailable} open`}
                  />
                </View>
                {players.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    canSeat={player.status === "invited" || player.status === "waitlist"}
                    onSeat={() => markSeated(player.id)}
                  />
                ))}
              </Card>
            </>
          ) : (
            <Card>
              <SectionHeader
                icon="numeric"
                title="Sign up with a game code"
                subtitle="Players can request a seat when the host gives them the private numeric code."
              />
              <Input label="Your name" value={joinName} onChangeText={setJoinName} />
              <Input
                label="Your phone"
                value={joinPhone}
                onChangeText={setJoinPhone}
                keyboardType="phone-pad"
              />
              <Input
                label="Home game code"
                value={joinCode}
                onChangeText={setJoinCode}
                keyboardType="number-pad"
                placeholder="482913"
              />
              <PrimaryButton label="Join this home game" icon="login" onPress={joinGame} />
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <MaterialCommunityIcons name={icon} size={22} color="#F6D77A" />
      </View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  placeholder?: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#839287"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
    >
      <MaterialCommunityIcons name={icon} size={20} color="#102217" />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function StatusPill({ status }: { status: "active" | "locked" }) {
  return (
    <View style={[styles.pill, status === "active" ? styles.pillActive : styles.pillLocked]}>
      <MaterialCommunityIcons
        name={status === "active" ? "check" : "lock-outline"}
        size={14}
        color={status === "active" ? "#103D25" : "#F6D77A"}
      />
      <Text style={[styles.pillText, status === "active" && styles.pillTextActive]}>
        {status === "active" ? "Active" : "Required"}
      </Text>
    </View>
  );
}

function PlayerRow({
  player,
  canSeat,
  onSeat,
}: {
  player: Player;
  canSeat: boolean;
  onSeat: () => void;
}) {
  const statusLabel: Record<PlayerStatus, string> = {
    host: "Host",
    invited: "Invited",
    seated: "Seated",
    waitlist: "Waitlist",
  };

  return (
    <View style={styles.playerRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{player.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.playerCopy}>
        <Text style={styles.playerName}>{player.name}</Text>
        <Text style={styles.playerPhone}>{player.phone}</Text>
      </View>
      <View style={styles.playerActions}>
        <Text style={styles.playerStatus}>{statusLabel[player.status]}</Text>
        {canSeat ? (
          <Pressable accessibilityRole="button" onPress={onSeat} style={styles.seatButton}>
            <Text style={styles.seatButtonText}>Seat</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0E2017",
  },
  keyboardView: {
    flex: 1,
  },
  screen: {
    gap: 18,
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: "#153626",
    borderColor: "#27563E",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    padding: 20,
  },
  logo: {
    alignItems: "center",
    backgroundColor: "#214C36",
    borderRadius: 20,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: "#F6D77A",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: "#F7FBF8",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  subtitle: {
    color: "#B9C8BD",
    fontSize: 14,
    lineHeight: 20,
  },
  tabBar: {
    backgroundColor: "#132A1F",
    borderRadius: 18,
    flexDirection: "row",
    padding: 4,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 12,
  },
  tabButtonActive: {
    backgroundColor: "#F6D77A",
  },
  tabLabel: {
    color: "#B9C8BD",
    fontSize: 14,
    fontWeight: "800",
  },
  tabLabelActive: {
    color: "#102217",
  },
  card: {
    backgroundColor: "#F7FBF8",
    borderRadius: 26,
    gap: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    gap: 12,
  },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: "#143523",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: "#102217",
    fontSize: 19,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: "#577062",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: "#244333",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#EAF1ED",
    borderColor: "#D7E3DC",
    borderRadius: 16,
    borderWidth: 1,
    color: "#102217",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  subscriptionRow: {
    alignItems: "center",
    backgroundColor: "#EAF1ED",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  cardLabel: {
    color: "#577062",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  price: {
    color: "#102217",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 3,
  },
  pill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pillActive: {
    backgroundColor: "#B9F2C9",
  },
  pillLocked: {
    backgroundColor: "#143523",
  },
  pillText: {
    color: "#F6D77A",
    fontSize: 12,
    fontWeight: "900",
  },
  pillTextActive: {
    color: "#103D25",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#F6D77A",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    padding: 15,
  },
  primaryButtonDisabled: {
    opacity: 0.52,
  },
  primaryButtonText: {
    color: "#102217",
    fontSize: 15,
    fontWeight: "900",
  },
  codeBox: {
    alignItems: "center",
    backgroundColor: "#143523",
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  code: {
    color: "#F7FBF8",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
    marginTop: 2,
  },
  dashboardHeader: {
    marginBottom: 2,
  },
  playerRow: {
    alignItems: "center",
    backgroundColor: "#EAF1ED",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#143523",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  avatarText: {
    color: "#F6D77A",
    fontSize: 18,
    fontWeight: "900",
  },
  playerCopy: {
    flex: 1,
  },
  playerName: {
    color: "#102217",
    fontSize: 15,
    fontWeight: "900",
  },
  playerPhone: {
    color: "#577062",
    fontSize: 13,
    marginTop: 2,
  },
  playerActions: {
    alignItems: "flex-end",
    gap: 6,
  },
  playerStatus: {
    color: "#244333",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  seatButton: {
    backgroundColor: "#143523",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seatButtonText: {
    color: "#F6D77A",
    fontSize: 12,
    fontWeight: "900",
  },
});
