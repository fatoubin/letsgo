import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const NOTIFS = [
  {
    id: 1,
    icon: "checkmark-circle",
    iconColor: "#3DDC97",
    titre: "Réservation confirmée",
    message: "Votre trajet Dakar → Thiès du 21/04 a été confirmé.",
    heure: "Il y a 10 min",
    lu: false,
  },
  {
    id: 2,
    icon: "car",
    iconColor: "#4DA3FF",
    titre: "Nouveau trajet disponible",
    message: "Un covoiturage Almadies → Plateau est disponible à 08h00.",
    heure: "Il y a 1h",
    lu: false,
  },
  {
    id: 3,
    icon: "close-circle",
    iconColor: "#ff6b6b",
    titre: "Réservation annulée",
    message: "Le trajet Ouakam → Centre-ville du 20/04 a été annulé.",
    heure: "Hier",
    lu: true,
  },
  {
    id: 4,
    icon: "bus",
    iconColor: "#FFC107",
    titre: "Rappel de trajet",
    message: "Votre bus Dakar → Mbour part dans 30 minutes.",
    heure: "Hier",
    lu: true,
  },
  {
    id: 5,
    icon: "star",
    iconColor: "#FACC15",
    titre: "Évaluez votre trajet",
    message: "Comment s'est passé votre trajet Dakar → Thiès ?",
    heure: "Il y a 2j",
    lu: true,
  },
];

export default function NotificationsScreen() {
  const nonLues = NOTIFS.filter((n) => !n.lu).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {nonLues > 0 && (
            <Text style={styles.subtitle}>{nonLues} non lue{nonLues > 1 ? "s" : ""}</Text>
          )}
        </View>
        {nonLues > 0 && (
          <TouchableOpacity style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {/* NON LUES */}
        {NOTIFS.filter((n) => !n.lu).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Nouvelles</Text>
            {NOTIFS.filter((n) => !n.lu).map((n) => (
              <TouchableOpacity key={n.id} style={[styles.card, styles.cardUnread]}>
                <View style={[styles.iconBadge, { backgroundColor: n.iconColor + "22" }]}>
                  <Ionicons name={n.icon as any} size={20} color={n.iconColor} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitre}>{n.titre}</Text>
                    <View style={styles.unreadDot} />
                  </View>
                  <Text style={styles.cardMessage}>{n.message}</Text>
                  <Text style={styles.cardHeure}>{n.heure}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* LUES */}
        {NOTIFS.filter((n) => n.lu).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Précédentes</Text>
            {NOTIFS.filter((n) => n.lu).map((n) => (
              <TouchableOpacity key={n.id} style={styles.card}>
                <View style={[styles.iconBadge, { backgroundColor: "#1A2B4A" }]}>
                  <Ionicons name={n.icon as any} size={20} color="#5A6A8A" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitre, { color: "#8899BB" }]}>{n.titre}</Text>
                  <Text style={styles.cardMessage}>{n.message}</Text>
                  <Text style={styles.cardHeure}>{n.heure}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070F23",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#4DA3FF",
    fontSize: 13,
    marginTop: 2,
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#0F1C3A",
    borderWidth: 1,
    borderColor: "#1A2B4A",
  },
  markAllText: {
    color: "#4DA3FF",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionLabel: {
    color: "#8899BB",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#0F1C3A",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1A2B4A",
  },
  cardUnread: {
    borderColor: "#1A4ED8",
    backgroundColor: "#0C1830",
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitre: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4DA3FF",
    marginLeft: 8,
  },
  cardMessage: {
    color: "#5A6A8A",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  cardHeure: {
    color: "#2A3A5A",
    fontSize: 11,
    fontWeight: "600",
  },
});
