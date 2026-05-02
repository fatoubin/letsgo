import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";

import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { getDriverRequests, acceptDemande, rejectDemande, makeOffer } from "../../src/services/api";

type Request = {
  id: number;
  depart: string;
  destination: string;
  nom: string;
  prenom: string;
  telephone: string;
  places: number;
  prix?: number;
  status: "pending" | "accepted" | "rejected";
};

export default function DriverRequestsScreen() {
  const [driverId, setDriverId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Request[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // États pour la modale de négociation
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState<any>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [negotiationMessage, setNegotiationMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (!stored) {
        Alert.alert("Erreur", "Chauffeur non identifié");
        setLoading(false);
        return;
      }
      const id = Number(stored);
      setDriverId(id);
      await fetchRequests(id);
    };
    init();
  }, []);

  // Dans fetchRequests, filtrer uniquement les pending
const fetchRequests = async (id: number) => {
  try {
    setLoading(true);
    const data = await getDriverRequests(id);
    console.log("📥 Demandes reçues:", JSON.stringify(data));
    // Filtrer uniquement les demandes en attente
    const pendingRequests = Array.isArray(data) 
      ? data.filter((item: Request) => item.status === "pending")
      : [];
    setRequests(pendingRequests);
  } catch (error) {
    console.log("❌ DRIVER REQUESTS ERROR", error);
    Alert.alert("Erreur", "Impossible de charger les demandes");
  } finally {
    setLoading(false);
  }
};

  const handleAccept = async (id: number) => {
    setActionLoading(id);
    try {
      await acceptDemande(id);
      Alert.alert("✅ Succès", "Demande acceptée");
      if (driverId) await fetchRequests(driverId);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Action impossible");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await rejectDemande(id);
      Alert.alert("Refusée", "Demande refusée");
      if (driverId) await fetchRequests(driverId);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Action impossible");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMakeOffer = async () => {
    if (!proposedPrice || Number(proposedPrice) <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un prix valide");
      return;
    }
    
    if (!selectedDemande) return;
    
    try {
      const result = await makeOffer({
        demande_id: selectedDemande.id,
        prix_propose: Number(proposedPrice),
        message: negotiationMessage
      });
      
      Alert.alert("✅ Succès", "Offre envoyée au client");
      setShowPriceModal(false);
      setProposedPrice("");
      setNegotiationMessage("");
      setSelectedDemande(null);
      if (driverId) await fetchRequests(driverId);
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible d'envoyer l'offre");
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return price.toLocaleString("fr-FR") + " FCFA";
  };

  const renderItem = ({ item }: { item: Request }) => (
    <View style={styles.card}>
      <Text style={styles.route}>
        {item.depart} → {item.destination}
      </Text>
      
      {item.prix && (
        <Text style={styles.price}>{formatPrice(item.prix)}</Text>
      )}
      
      <Text style={styles.info}>- {item.prenom} {item.nom}</Text>
      <Text style={styles.info}>- {item.telephone}</Text>
      <Text style={styles.info}>- {item.places} place(s) demandée(s)</Text>

      {/* Bouton Faire une offre */}
      <TouchableOpacity 
        style={styles.offerButton}
        onPress={() => {
          setSelectedDemande(item);
          setShowPriceModal(true);
        }}
      >
        <Text style={styles.offerButtonText}>💰 Faire une offre</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        {item.status === "pending" && (
          <>
            <TouchableOpacity 
              style={styles.accept} 
              onPress={() => handleAccept(item.id)}
              disabled={actionLoading === item.id}
            >
              {actionLoading === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionText}>Accepter</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.reject} 
              onPress={() => handleReject(item.id)}
              disabled={actionLoading === item.id}
            >
              {actionLoading === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionText}>Refuser</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        {item.status === "accepted" && (
          <Text style={[styles.statusText, styles.acceptedText]}>Acceptée</Text>
        )}
        {item.status === "rejected" && (
          <Text style={[styles.statusText, styles.rejectedText]}>Refusée</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={globalStyles.screen}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Demandes de réservations</Text>

          {/* Alerte sonore toggle */}
          <View style={styles.alertRow}>
            <Text style={styles.alertText}>Alertes sonores activées pour les nouvelles demandes</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: "#767577", true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>

          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune demande pour le moment.</Text>
              <Text style={styles.footerMessage}>
                "Conduisez prudemment, nous veillons sur vos trajets."
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={requests}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                scrollEnabled={false}
              />
              <Text style={styles.footerMessage}>
                "Conduisez prudemment, nous veillons sur vos trajets."
              </Text>
            </>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Modal pour faire une offre de prix */}
      <Modal
        visible={showPriceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>💰 Faire une offre</Text>
                <Text style={styles.modalSubtitle}>
                  Proposez un prix pour ce trajet
                </Text>

                {selectedDemande && (
                  <Text style={styles.modalRoute}>
                    {selectedDemande.depart} → {selectedDemande.destination}
                  </Text>
                )}

                <Text style={styles.priceLabel}>Prix proposé (FCFA)</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Ex: 5000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={proposedPrice}
                  onChangeText={setProposedPrice}
                />
                <Text style={styles.currencyHint}>Montant total pour la course</Text>

                <Text style={styles.messageLabel}>Message (optionnel)</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Ajoutez un message au client..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline={true}
                  numberOfLines={3}
                  value={negotiationMessage}
                  onChangeText={setNegotiationMessage}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setShowPriceModal(false);
                      setProposedPrice("");
                      setNegotiationMessage("");
                      setSelectedDemande(null);
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={handleMakeOffer}
                  >
                    <Text style={styles.modalConfirmButtonText}>Envoyer l'offre</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  title: {
    color: COLORS.textLight,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
    marginTop: 12,
    textAlign: "center",
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1F2937",
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  alertText: {
    color: COLORS.textLight,
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  route: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111",
  },
  price: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 10,
  },
  accept: {
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  reject: {
    backgroundColor: COLORS.danger,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 10,
    flex: 1,
  },
  acceptedText: {
    color: COLORS.success,
  },
  rejectedText: {
    color: COLORS.danger,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
  },
  footerMessage: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
    fontStyle: "italic",
  },
  offerButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
    alignItems: "center",
  },
  offerButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  // Styles de la modale
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 20,
    width: "85%",
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 20,
  },
  modalRoute: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
    backgroundColor: "#111827",
    padding: 10,
    borderRadius: 10,
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 6,
    marginTop: 10,
  },
  priceInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#000",
  },
  currencyHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  messageLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 6,
    marginTop: 12,
  },
  messageInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#000",
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#374151",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: COLORS.textMuted,
    fontWeight: "600",
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});