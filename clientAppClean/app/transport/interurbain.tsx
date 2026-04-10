import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_URL, getToken } from "../../lib/api";

type Ville = {
  id: number;
  nom: string;
};

type Gare = {
  id: number;
  nom: string;
  adresse: string;
};

type Ligne = {
  id: number;
  ville_depart: string;
  ville_arrivee: string;
  gare_depart_nom: string;
  gare_arrivee_nom: string;
  duree_estimee: number;
  prix: number;
  compagnie: string;
};

type Horaire = {
  id: number;
  heure_depart: string;
  heure_arrivee: string;
};

export default function InterurbainScreen() {
  const [villes, setVilles] = useState<Ville[]>([]);
  const [showVilleModal, setShowVilleModal] = useState(false);
  const [selectType, setSelectType] = useState<"depart" | "arrivee">("depart");
  const [departId, setDepartId] = useState<number | null>(null);
  const [arriveeId, setArriveeId] = useState<number | null>(null);
  const [departNom, setDepartNom] = useState("");
  const [arriveeNom, setArriveeNom] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLigne, setSelectedLigne] = useState<Ligne | null>(null);
  const [horaires, setHoraires] = useState<Horaire[]>([]);
  const [showHoraires, setShowHoraires] = useState(false);
  const [reserving, setReserving] = useState(false);

  // Charger les villes au démarrage
  useEffect(() => {
    loadVilles();
  }, []);

  const loadVilles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/interurbain/villes`);
      const data = await response.json();
      setVilles(data);
    } catch (error) {
      console.error("Erreur chargement villes:", error);
    }
  };

  const openVilleSelector = (type: "depart" | "arrivee") => {
    setSelectType(type);
    setShowVilleModal(true);
  };

  const selectVille = (ville: Ville) => {
    if (selectType === "depart") {
      setDepartId(ville.id);
      setDepartNom(ville.nom);
    } else {
      setArriveeId(ville.id);
      setArriveeNom(ville.nom);
    }
    setShowVilleModal(false);
  };

  const rechercherLignes = async () => {
    if (!departId || !arriveeId) {
      Alert.alert("Erreur", "Sélectionnez la ville de départ et d'arrivée");
      return;
    }

    if (departId === arriveeId) {
      Alert.alert("Erreur", "Les villes de départ et d'arrivée doivent être différentes");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/interurbain/recherche?depart_id=${departId}&arrivee_id=${arriveeId}`
      );
      const data = await response.json();
      setLignes(data);
      setSelectedLigne(null);
      setShowHoraires(false);
      
      if (data.length === 0) {
        Alert.alert("Information", "Aucun trajet trouvé pour cette liaison");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de rechercher les trajets");
    } finally {
      setLoading(false);
    }
  };

  const loadHoraires = async (ligneId: number, ligne: Ligne) => {
    setSelectedLigne(ligne);
    try {
      const response = await fetch(
        `${API_URL}/api/interurbain/lignes/${ligneId}/horaires`
      );
      const data = await response.json();
      setHoraires(data);
      setShowHoraires(true);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les horaires");
    }
  };

  const reserverBillet = async (horaireId: number, prix: number) => {
    const token = await getToken();
    if (!token) {
      Alert.alert(
        "Connexion requise",
        "Veuillez vous connecter pour réserver",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Se connecter", onPress: () => router.push("/auth/login") },
        ]
      );
      return;
    }

    Alert.alert(
      "Confirmation",
      `Réserver 1 place pour ${selectedLigne?.ville_depart} → ${selectedLigne?.ville_arrivee} au prix de ${prix.toLocaleString()} FCFA ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            setReserving(true);
            try {
              const response = await fetch(`${API_URL}/api/interurbain/reserver`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  horaire_id: horaireId,
                  places: 1,
                }),
              });

              if (response.ok) {
                Alert.alert("Succès", "Réservation effectuée !");
                setShowHoraires(false);
              } else {
                const error = await response.text();
                Alert.alert("Erreur", error || "Impossible de réserver");
              }
            } catch (error) {
              Alert.alert("Erreur", "Erreur réseau");
            } finally {
              setReserving(false);
            }
          },
        },
      ]
    );
  };

  const inverserVilles = () => {
    if (departId && arriveeId) {
      const tempId = departId;
      const tempNom = departNom;
      setDepartId(arriveeId);
      setDepartNom(arriveeNom);
      setArriveeId(tempId);
      setArriveeNom(tempNom);
    }
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <Text style={styles.title}>Transport Interurbain</Text>
      <Text style={styles.subtitle}>Déplacez-vous entre les régions du Sénégal</Text>

      {/* Sélecteurs de villes */}
      <View style={styles.cityContainer}>
        <TouchableOpacity
          style={styles.cityButton}
          onPress={() => openVilleSelector("depart")}
        >
          <Ionicons name="location-outline" size={22} color="#4DA3FF" />
          <View>
            <Text style={styles.cityLabel}>Départ</Text>
            <Text style={departNom ? styles.cityValue : styles.cityPlaceholder}>
              {departNom || "Sélectionner"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.swapButton} onPress={inverserVilles}>
          <Ionicons name="swap-vertical" size={24} color="#4DA3FF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cityButton}
          onPress={() => openVilleSelector("arrivee")}
        >
          <Ionicons name="flag-outline" size={22} color="#4DA3FF" />
          <View>
            <Text style={styles.cityLabel}>Arrivée</Text>
            <Text style={arriveeNom ? styles.cityValue : styles.cityPlaceholder}>
              {arriveeNom || "Sélectionner"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Bouton recherche */}
      <TouchableOpacity style={styles.searchButton} onPress={rechercherLignes}>
        <Ionicons name="search" size={20} color="#fff" />
        <Text style={styles.searchButtonText}>Rechercher un trajet</Text>
      </TouchableOpacity>

      {/* Chargement */}
      {loading && <ActivityIndicator size="large" color="#4DA3FF" style={styles.loader} />}

      {/* Liste des lignes */}
      {!showHoraires && lignes.length > 0 && (
        <FlatList
          data={lignes}
          keyExtractor={(item) => item.id.toString()}
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.ligneCard}
              onPress={() => loadHoraires(item.id, item)}
            >
              <View style={styles.ligneHeader}>
                <Text style={styles.ligneTitle}>
                  {item.ville_depart} → {item.ville_arrivee}
                </Text>
                <Text style={styles.lignePrix}>{item.prix.toLocaleString()} FCFA</Text>
              </View>

              {/* Gare de départ */}
              <View style={styles.gareInfo}>
                <Ionicons name="bus-outline" size={14} color="#4DA3FF" />
                <Text style={styles.gareLabel}>Départ :</Text>
                <Text style={styles.gareText} numberOfLines={1}>
                  {item.gare_depart_nom || "Terminus"}
                </Text>
              </View>

              {/* Gare d'arrivée */}
              <View style={styles.gareInfo}>
                <Ionicons name="flag-outline" size={14} color="#4DA3FF" />
                <Text style={styles.gareLabel}>Arrivée :</Text>
                <Text style={styles.gareText} numberOfLines={1}>
                  {item.gare_arrivee_nom || "Gare centrale"}
                </Text>
              </View>

              <View style={styles.ligneFooter}>
                <View style={styles.dureeContainer}>
                  <Ionicons name="time-outline" size={14} color="#9AA4BF" />
                  <Text style={styles.ligneDuree}>
                    {Math.floor(item.duree_estimee / 60)}h{item.duree_estimee % 60}
                  </Text>
                </View>
                <Text style={styles.ligneCompagnie}>{item.compagnie}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Liste des horaires */}
      {showHoraires && selectedLigne && (
        <View style={styles.horairesContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowHoraires(false)}>
            <Ionicons name="arrow-back" size={20} color="#4DA3FF" />
            <Text style={styles.backButtonText}>Retour aux trajets</Text>
          </TouchableOpacity>

          <View style={styles.selectedLigneInfo}>
            <Text style={styles.selectedLigneTitle}>
              {selectedLigne.ville_depart} → {selectedLigne.ville_arrivee}
            </Text>
            <Text style={styles.selectedLignePrix}>
              {selectedLigne.prix.toLocaleString()} FCFA
            </Text>
          </View>

          <FlatList
            data={horaires}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.horaireCard}
                onPress={() => reserverBillet(item.id, selectedLigne.prix)}
                disabled={reserving}
              >
                <View style={styles.horaireTime}>
                  <Ionicons name="time-outline" size={20} color="#4DA3FF" />
                  <Text style={styles.horaireDepart}>
                    {item.heure_depart.substring(0, 5)}
                  </Text>
                  <Text style={styles.horaireSeparator}>→</Text>
                  <Text style={styles.horaireArrivee}>
                    {item.heure_arrivee.substring(0, 5)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.reserverButton}
                  onPress={() => reserverBillet(item.id, selectedLigne.prix)}
                  disabled={reserving}
                >
                  {reserving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.reserverButtonText}>Réserver</Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Message quand aucun résultat */}
      {!loading && !showHoraires && lignes.length === 0 && departId && arriveeId && (
        <View style={styles.emptyContainer}>
          <Ionicons name="bus-outline" size={64} color="#4B5563" />
          <Text style={styles.emptyTitle}>Aucun trajet trouvé</Text>
          <Text style={styles.emptyText}>
            Essayez une autre destination ou modifiez votre recherche
          </Text>
        </View>
      )}

      {/* Modal de sélection des villes */}
      <Modal
        visible={showVilleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVilleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Sélectionner {selectType === "depart" ? "le départ" : "l'arrivée"}
              </Text>
              <TouchableOpacity onPress={() => setShowVilleModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={villes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.villeItem}
                  onPress={() => selectVille(item)}
                >
                  <Text style={styles.villeName}>{item.nom}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
    padding: 16,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9AA4BF",
    fontSize: 14,
    marginBottom: 24,
  },
  cityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cityButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C2541",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  cityLabel: {
    color: "#9AA4BF",
    fontSize: 12,
  },
  cityValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  cityPlaceholder: {
    color: "#4B5563",
    fontSize: 14,
  },
  swapButton: {
    backgroundColor: "#1C2541",
    padding: 12,
    borderRadius: 40,
    marginHorizontal: 8,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loader: {
    marginTop: 40,
  },
  resultsList: {
    flex: 1,
  },
  ligneCard: {
    backgroundColor: "#1C2541",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ligneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ligneTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  lignePrix: {
    color: "#4ADE80",
    fontSize: 16,
    fontWeight: "bold",
  },
  gareInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  gareLabel: {
    color: "#9AA4BF",
    fontSize: 12,
  },
  gareText: {
    color: "#fff",
    fontSize: 12,
    flex: 1,
  },
  ligneFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  dureeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ligneDuree: {
    color: "#9AA4BF",
    fontSize: 12,
  },
  ligneCompagnie: {
    color: "#4DA3FF",
    fontSize: 12,
  },
  horairesContainer: {
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButtonText: {
    color: "#4DA3FF",
    marginLeft: 8,
  },
  selectedLigneInfo: {
    backgroundColor: "#1C2541",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedLigneTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  selectedLignePrix: {
    color: "#4ADE80",
    fontSize: 16,
    fontWeight: "bold",
  },
  horaireCard: {
    backgroundColor: "#1C2541",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  horaireTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  horaireDepart: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  horaireSeparator: {
    color: "#9AA4BF",
    fontSize: 14,
  },
  horaireArrivee: {
    color: "#fff",
    fontSize: 16,
  },
  reserverButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reserverButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptyText: {
    color: "#9AA4BF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1C2541",
    borderRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A3655",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  villeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A3655",
  },
  villeName: {
    color: "#fff",
    fontSize: 16,
  },
});