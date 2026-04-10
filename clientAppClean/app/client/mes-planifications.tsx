import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useState, useMemo } from "react";
import { router } from "expo-router";
import { getMesDemandes, deleteDemande } from "../../lib/api"; // 🔁 fonctions API à ajouter

type Demande = {
  id: number;
  depart: string;
  destination: string;
  places: number;
  date_depart: string;    // format YYYY-MM-DD
  heure_depart: string;   // format HH:MM:SS ou HH:MM
  statut: "en_attente" | "accepte" | "expire";
  created_at: string;
};

type Filtre = "TOUTES" | "EN_ATTENTE" | "ACCEPTEES" | "EXPIREES";

export default function MesPlanifications() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔎 recherche + filtre
  const [search, setSearch] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("TOUTES");

  // 📥 Charger les demandes
  const loadDemandes = async () => {
    try {
      setLoading(true);
      const data = await getMesDemandes();
      setDemandes(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger vos demandes");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDemandes();
    }, [])
  );

  // 🧠 Date réelle de la demande (pour tri)
  const getDemandeDate = (d: Demande): Date | null => {
    if (d.date_depart && d.heure_depart) {
      // format date_depart: "2025-03-15", heure_depart: "14:30"
      return new Date(`${d.date_depart}T${d.heure_depart}`);
    }
    return null;
  };

  // 🔥 Filtres + recherche
 const filteredDemandes = useMemo(() => {
  return demandes.filter((d) => {
    // Recherche textuelle
    const txt = `${d.depart} ${d.destination}`.toLowerCase();
    if (!txt.includes(search.toLowerCase())) return false;
    // Filtre par statut (si le filtre sélectionné n'est pas "TOUTES", on applique)
    if (filtre !== "TOUTES" && d.statut !== filtre.toLowerCase()) return false;
    // Option : forcer à ne montrer que les en_attente si le filtre est "TOUTES" ? 
    // Plutôt laisser l'utilisateur choisir via les boutons.
    return true;
  });
}, [demandes, search, filtre]);

  // ❌ Supprimer une demande
  const onDelete = (id: number) => {
    Alert.alert(
      "Supprimer la demande",
      "Voulez-vous supprimer cette demande ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDemande(id); // 🔁 à implémenter dans api.ts
              setDemandes((prev) => prev.filter((d) => d.id !== id));
              Alert.alert("Succès", "Demande supprimée");
            } catch {
              Alert.alert("Erreur", "Suppression impossible");
            }
          },
        },
      ]
    );
  };

  // ✏️ Modifier une demande (redirection vers une page de modification)
  const onEdit = (demande: Demande) => {
    router.push({
      pathname: "/client/modifier-demande", // 🔁 créer cette page si besoin
      params: { demande: JSON.stringify(demande) },
    });
  };

  // ⏳ Loading
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔎 Recherche */}
      <TextInput
        style={styles.search}
        placeholder="Rechercher une demande..."
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={setSearch}
      />

      {/* 🎛️ Filtres par statut */}
      <View style={styles.filters}>
        {[
          { key: "TOUTES", label: "Toutes" },
          { key: "EN_ATTENTE", label: "En attente" },
          { key: "ACCEPTEES", label: "Acceptées" },
          { key: "EXPIREES", label: "Expirées" },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterBtn,
              filtre === f.key && styles.filterActive,
            ]}
            onPress={() => setFiltre(f.key as Filtre)}
          >
            <Text style={styles.filterText}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 📋 Liste des demandes */}
      <FlatList
        data={filteredDemandes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Aucune demande trouvée</Text>
          </View>
        }
        renderItem={({ item }) => {
          const dateObj = getDemandeDate(item);
          const formattedDate = dateObj
            ? dateObj.toLocaleDateString() +
              " à " +
              dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Date non définie";

          return (
            <View style={styles.card}>
              <Text style={styles.title}>
                {item.depart} → {item.destination}
              </Text>

              <Text style={styles.date}>{formattedDate}</Text>

              <Text style={styles.places}>Places : {item.places}</Text>

              <Text
                style={[
                  styles.statut,
                  item.statut === "en_attente" && styles.statutAttente,
                  item.statut === "accepte" && styles.statutAccepte,
                  item.statut === "expire" && styles.statutExpire,
                ]}
              >
                {item.statut === "en_attente" && "⏳ En attente"}
                {item.statut === "accepte" && "✅ Acceptée"}
                {item.statut === "expire" && "❌ Expirée"}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.btnEdit}
                  onPress={() => onEdit(item)}
                >
                  <Text style={styles.btnText}>Modifier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnDelete}
                  onPress={() => onDelete(item.id)}
                >
                  <Text style={styles.btnText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

/* 🎨 STYLES (identiques à ceux de mes-trajets.tsx) */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#e5e7eb",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 16,
  },
  search: {
    backgroundColor: "#1f2933",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  filters: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    backgroundColor: "#1f2933",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  filterActive: {
    backgroundColor: "#2563eb",
  },
  filterText: {
    color: "#fff",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#1f2933",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  date: {
    color: "#9ca3af",
    marginTop: 4,
  },
  places: {
    color: "#e5e7eb",
    marginTop: 6,
  },
  statut: {
    marginTop: 6,
    fontWeight: "500",
  },
  statutAttente: {
    color: "#facc15", // jaune
  },
  statutAccepte: {
    color: "#4ade80", // vert
  },
  statutExpire: {
    color: "#f87171", // rouge
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  btnEdit: {
    backgroundColor: "#2563eb",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnDelete: {
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
  },
});