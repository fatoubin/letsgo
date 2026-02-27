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

import { useEffect, useState, useMemo } from "react";
import { router } from "expo-router";
import { getMesTrajets, deleteTrajet } from "../../lib/api";


type Trajet = {
  id: number;
  depart: string;
  destination: string;
  places: number;
  heure?: string | null;
  date_depart?: string | null;
  heure_depart?: string | null;
};

type Filtre = "TOUS" | "EN_COURS" | "PASSES";

export default function MesTrajets() {
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔎 recherche + filtre
  const [search, setSearch] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("TOUS");

  // 📥 Charger trajets
  const loadTrajets = async () => {
    try {
      setLoading(true);
      const data = await getMesTrajets();
      setTrajets(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger vos trajets");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
  useCallback(() => {
    loadTrajets();
  }, [])
);


  // 🧠 Date réelle du trajet
  const getTrajetDate = (t: Trajet): Date | null => {
    if (t.date_depart && t.heure_depart) {
      return new Date(`${t.date_depart}T${t.heure_depart}`);
    }
    if (t.heure) {
      return new Date(t.heure.replace(" ", "T"));
    }
    return null;
  };

  // 🔥 Filtres + recherche
  const filteredTrajets = useMemo(() => {
    const now = new Date();

    return trajets.filter((t) => {
      // Recherche
      const txt = `${t.depart} ${t.destination}`.toLowerCase();
      if (!txt.includes(search.toLowerCase())) return false;

      const d = getTrajetDate(t);
      if (!d) return true;

      if (filtre === "EN_COURS") return d >= now;
      if (filtre === "PASSES") return d < now;

      return true;
    });
  }, [trajets, search, filtre]);
  

  // ❌ Supprimer
  const onDelete = (id: number) => {
    Alert.alert(
      "Supprimer le trajet",
      "Voulez-vous supprimer ce trajet ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTrajet(id);
              setTrajets((prev) => prev.filter((t) => t.id !== id));
              Alert.alert("Succès", "Trajet supprimé");
            } catch {
              Alert.alert("Erreur", "Suppression impossible");
            }
          },
        },
      ]
    );
  };

  // ✏️ Modifier
  const onEdit = (trajet: Trajet) => {
    router.push({
      pathname: "/client/modifier-trajet",
      params: { trajet: JSON.stringify(trajet) },
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
        placeholder="Rechercher un trajet..."
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={setSearch}
      />

      {/* 🎛️ Filtres */}
      <View style={styles.filters}>
        {[
          { key: "TOUS", label: "Tous" },
          { key: "EN_COURS", label: "En cours" },
          { key: "PASSES", label: "Passés" },
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

      {/* 📋 Liste */}
      <FlatList
        data={filteredTrajets}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Aucun trajet trouvé</Text>
          </View>
        }
        renderItem={({ item }) => {
          const d = getTrajetDate(item);

          return (
            <View style={styles.card}>
              <Text style={styles.title}>
                {item.depart} → {item.destination}
              </Text>
              

              {d && (
                <Text style={styles.date}>
                  {d.toLocaleDateString()} à {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              )}

              <Text style={styles.places}>
                Places : {item.places}
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

/* 🎨 STYLES — cohérents avec ton app */
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
