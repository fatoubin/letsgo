import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Linking, Modal, TextInput } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { router } from "expo-router";
import { getMesReservations, annulerReservation, API_URL, getToken } from "../../lib/api";
import { Ionicons } from "@expo/vector-icons";
import * as LinkingLib from "expo-linking";

type Reservation = {
  id: number;
  places: number;
  prix: number;
  created_at: string;
  reservation_status: string;
  trajet_status: string;
  trip_id: number;
  depart: string;
  destination: string;
  heure: string;
  chauffeur_id: number;
  chauffeur_nom: string;
  chauffeur_prenom: string;
  chauffeur_telephone: string;
  vehicle_type: string;
  vehicle_plate: string;
  chauffeur_lat: number;
  chauffeur_lng: number;
  is_online: boolean;
  course_terminee?: boolean;
  paiement_effectue?: boolean;
};

type Filtre = "TOUTES" | "accepted" | "rejected" | "pending" | "a_payer";

type TransactionData = {
  transaction_id: number;
  montant: number;
  telephone_destinataire: string;
  operateur: string;
  reference: string;
  code_confirmation: string;
};

export default function MesReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("TOUTES");
  
  const [showPaiement, setShowPaiement] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [paymentStep, setPaymentStep] = useState<'choose' | 'payment'>('choose');
  const [operateur, setOperateur] = useState<'wave' | 'om' | null>(null);
  const [telephone, setTelephone] = useState("");
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [codeConfirmation, setCodeConfirmation] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getMesReservations();
      
      console.log("📊 ===== DONNÉES API COMPLÈTES =====");
      console.log(JSON.stringify(data, null, 2));
      
      if (data && data.length > 0) {
        data.forEach((item: any) => {
          console.log(`📌 Réservation ID ${item.id}: reservation_status=${item.reservation_status}, trajet_status=${item.trajet_status}`);
        });
      } else {
        console.log("⚠️ Aucune donnée reçue de l'API");
      }
      
      const enrichedData = (Array.isArray(data) ? data : []).map((item: any) => ({
        ...item,
        trajet_status: item.trajet_status || 'active',
        course_terminee: item.trajet_status === 'completed',
        paiement_effectue: item.paiement_effectue || false,
      }));
      setReservations(enrichedData);
    } catch (error) {
      console.error("❌ Erreur chargement:", error);
      Alert.alert("Erreur", "Impossible de charger vos réservations");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [])
  );

  const applyFilter = useCallback(() => {
    console.log("🔍 FILTRE ACTUEL:", filtre);
    console.log("📊 NOMBRE TOTAL RÉSERVATIONS:", reservations.length);
    
    if (filtre === "TOUTES") {
      setFilteredReservations(reservations);
    } else if (filtre === "a_payer") {
      console.log("🔍 Recherche courses à payer...");
      reservations.forEach(r => {
        console.log(`  - ID ${r.id}: status=${r.reservation_status}, trajet=${r.trajet_status}, payée=${r.paiement_effectue}`);
      });
      
      const aPayer = reservations.filter(r => 
        r.reservation_status === 'accepted' && 
        r.trajet_status === 'completed' &&
        !r.paiement_effectue
      );
      
      console.log("✅ Courses à payer trouvées:", aPayer.length);
      setFilteredReservations(aPayer);
    } else {
      setFilteredReservations(reservations.filter(r => r.reservation_status === filtre));
    }
  }, [reservations, filtre]);

  useEffect(() => {
    applyFilter();
  }, [reservations, filtre, applyFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return '✅ Acceptée';
      case 'rejected': return '❌ Refusée';
      default: return '⏳ En cours de traitement';
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleSeeLocation = (reservation: Reservation) => {
    if (reservation.chauffeur_lat && reservation.chauffeur_lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${reservation.chauffeur_lat},${reservation.chauffeur_lng}&travelmode=driving`;
      Linking.openURL(url).catch(err => {
        console.error("Erreur ouverture carte:", err);
        Alert.alert("Erreur", "Impossible d'ouvrir la carte");
      });
    } else {
      Alert.alert("Info", "Position non disponible");
    }
  };

  const handleAnnuler = (reservation: Reservation) => {
    Alert.alert(
      "Annuler la réservation",
      `Voulez-vous vraiment annuler votre réservation pour ${reservation.depart} → ${reservation.destination} ?`,
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              await annulerReservation(reservation.id);
              Alert.alert("Succès", "Réservation annulée");
              loadReservations();
            } catch (error) {
              Alert.alert("Erreur", "Impossible d'annuler la réservation");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const resetPaiement = () => {
    setShowPaiement(false);
    setSelectedReservation(null);
    setPaymentStep('choose');
    setOperateur(null);
    setTelephone("");
    setTransaction(null);
    setCodeConfirmation("");
    setPaymentLoading(false);
  };

  const initierPaiement = async () => {
    if (!operateur) {
      Alert.alert("Erreur", "Veuillez choisir un moyen de paiement");
      return;
    }
    
    if (!telephone || telephone.length < 9) {
      Alert.alert("Erreur", "Veuillez entrer votre numéro de téléphone valide (9 chiffres)");
      return;
    }
    
    if (!selectedReservation) return;
    
    setPaymentLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/paiements/initier`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          reservation_id: selectedReservation.id,
          operateur: operateur,
          telephone: telephone,
        }),
      });
      
      const data = await response.json();
      
      if (data.transaction_id) {
        setTransaction(data);
        setPaymentStep('payment');
        
        if (operateur === 'wave') {
          const waveUrl = `wave://send?number=${data.telephone_destinataire}&amount=${data.montant}`;
          const canOpen = await LinkingLib.canOpenURL(waveUrl);
          if (canOpen) {
            await LinkingLib.openURL(waveUrl);
          } else {
            Alert.alert(
              "Instructions Wave",
              `1. Ouvrez l'application Wave\n2. Envoyez ${data.montant.toLocaleString()} FCFA au numéro :\n   ${data.telephone_destinataire}\n3. Saisissez le code ci-dessous`
            );
          }
        } else if (operateur === 'om') {
          const omUrl = `orangemoney://payment?phone=${data.telephone_destinataire}&amount=${data.montant}`;
          const canOpen = await LinkingLib.canOpenURL(omUrl);
          if (canOpen) {
            await LinkingLib.openURL(omUrl);
          } else {
            Alert.alert(
              "Instructions Orange Money",
              `1. Ouvrez l'application Orange Money\n2. Envoyez ${data.montant.toLocaleString()} FCFA au numéro :\n   ${data.telephone_destinataire}\n3. Saisissez le code ci-dessous`
            );
          }
        }
      } else {
        Alert.alert("Erreur", data.message || "Impossible d'initier le paiement");
      }
    } catch (error) {
      console.error("Erreur initiation:", error);
      Alert.alert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setPaymentLoading(false);
    }
  };

  const confirmerPaiement = async () => {
    if (!codeConfirmation || codeConfirmation.length !== 6) {
      Alert.alert("Erreur", "Veuillez entrer le code de confirmation à 6 chiffres");
      return;
    }
    
    if (!transaction) {
      Alert.alert("Erreur", "Transaction introuvable");
      return;
    }
    
    setPaymentLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/paiements/confirmer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          transaction_id: transaction.transaction_id,
          code_confirmation: codeConfirmation,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert("Succès", data.message);
        resetPaiement();
        loadReservations();
      } else {
        Alert.alert("Erreur", data.message || "Code de confirmation invalide");
      }
    } catch (error) {
      console.error("Erreur confirmation:", error);
      Alert.alert("Erreur", "Impossible de confirmer le paiement");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes réservations</Text>

      <View style={styles.filtersContainer}>
        {[
          { key: "TOUTES", label: "Toutes", color: "#6B7280" },
          { key: "pending", label: "En cours", color: "#F59E0B" },
          { key: "accepted", label: "Acceptées", color: "#10B981" },
          { key: "rejected", label: "Refusées", color: "#EF4444" },
          { key: "a_payer", label: "À payer", color: "#2563EB" },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              filtre === f.key && { backgroundColor: f.color },
            ]}
            onPress={() => setFiltre(f.key as Filtre)}
          >
            <Text style={[styles.filterText, filtre === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#4B5563" />
            <Text style={styles.emptyTitle}>Aucune réservation</Text>
            <Text style={styles.emptyText}>
              {filtre === "TOUTES" 
                ? "Vous n'avez pas encore de réservation" 
                : filtre === "a_payer"
                ? "Aucune course à payer"
                : `Aucune réservation ${filtre === "accepted" ? "acceptée" : filtre === "rejected" ? "refusée" : "en cours"}`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.routeText}>
                {item.depart} → {item.destination}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.reservation_status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.reservation_status) }]}>
                  {getStatusText(item.reservation_status)}
                </Text>
              </View>
            </View>

            {item.reservation_status === 'accepted' && item.trajet_status === 'completed' && !item.paiement_effectue && (
              <View style={styles.courseTermineeBadge}>
                <Ionicons name="checkmark-done-circle" size={14} color="#10B981" />
                <Text style={styles.courseTermineeText}>Course terminée - En attente de paiement</Text>
              </View>
            )}

            {item.reservation_status === 'accepted' && item.paiement_effectue && (
              <View style={styles.paidBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.paidText}>✓ Payée</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={14} color="#9AA4BF" />
              <Text style={styles.infoText}>{formatDate(item.heure)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={14} color="#9AA4BF" />
              <Text style={styles.infoText}>{item.places} place(s) - {item.prix.toLocaleString()} FCFA</Text>
            </View>

            {item.reservation_status === 'accepted' && item.chauffeur_id && (
              <View style={styles.driverSection}>
                <Text style={styles.driverTitle}>Conducteur</Text>
                <View style={styles.driverInfo}>
                  <Ionicons name="person-outline" size={14} color="#4DA3FF" />
                  <Text style={styles.driverText}>{item.chauffeur_prenom} {item.chauffeur_nom}</Text>
                </View>
                {item.vehicle_type && (
                  <View style={styles.driverInfo}>
                    <Ionicons name="car-outline" size={14} color="#4DA3FF" />
                    <Text style={styles.driverText}>{item.vehicle_type} - {item.vehicle_plate}</Text>
                  </View>
                )}
                <View style={styles.driverActions}>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={() => handleCall(item.chauffeur_telephone)}
                  >
                    <Ionicons name="call-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Appeler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.locationButton}
                    onPress={() => handleSeeLocation(item)}
                  >
                    <Ionicons name="location-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Voir position</Text>
                  </TouchableOpacity>
                  {item.trajet_status !== 'completed' && !item.paiement_effectue && (
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => handleAnnuler(item)}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {item.trajet_status === 'completed' && !item.paiement_effectue && (
                  <TouchableOpacity 
                    style={styles.payNowButton}
                    onPress={() => {
                      setSelectedReservation(item);
                      setShowPaiement(true);
                      setPaymentStep('choose');
                      setOperateur(null);
                      setTelephone("");
                      setTransaction(null);
                      setCodeConfirmation("");
                    }}
                  >
                    <Ionicons name="cash-outline" size={18} color="#fff" />
                    <Text style={styles.payNowText}>Payer maintenant</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {item.reservation_status === 'rejected' && (
              <View style={styles.rejectedMessage}>
                <Ionicons name="sad-outline" size={20} color="#EF4444" />
                <Text style={styles.rejectedText}>Votre demande a été refusée</Text>
              </View>
            )}

            {item.reservation_status === 'pending' && (
              <View style={styles.pendingMessage}>
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
                <Text style={styles.pendingText}>En attente de réponse du conducteur...</Text>
              </View>
            )}
          </View>
        )}
      />
      
      <Modal transparent visible={showPaiement} animationType="slide" onRequestClose={resetPaiement}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={resetPaiement}>
              <Ionicons name="close" size={24} color="#9AA4BF" />
            </TouchableOpacity>
            
            <View style={styles.modalIconContainer}>
              <Ionicons name="cash-outline" size={48} color="#10B981" />
            </View>
            
            <Text style={styles.modalTitle}>Paiement de la course</Text>
            <Text style={styles.modalAmount}>
              {selectedReservation?.prix?.toLocaleString()} FCFA
            </Text>
            
            {paymentStep === 'choose' ? (
              <>
                <Text style={styles.modalLabel}>Choisissez votre moyen de paiement</Text>
                
                <View style={styles.operatorContainer}>
                  <TouchableOpacity
                    style={[styles.operatorBtn, operateur === 'wave' && styles.operatorSelected]}
                    onPress={() => setOperateur('wave')}
                  >
                    <Ionicons name="logo-wave" size={32} color={operateur === 'wave' ? "#fff" : "#9AA4BF"} />
                    <Text style={[styles.operatorText, operateur === 'wave' && styles.operatorTextSelected]}>Wave</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.operatorBtn, operateur === 'om' && styles.operatorSelected]}
                    onPress={() => setOperateur('om')}
                  >
                    <Ionicons name="phone-portrait-outline" size={32} color={operateur === 'om' ? "#fff" : "#9AA4BF"} />
                    <Text style={[styles.operatorText, operateur === 'om' && styles.operatorTextSelected]}>Orange Money</Text>
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Votre numéro de téléphone"
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                  value={telephone}
                  onChangeText={setTelephone}
                />
                
                <TouchableOpacity
                  style={styles.modalPayButton}
                  onPress={initierPaiement}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                      <Text style={styles.modalButtonText}>Continuer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>Instructions de paiement</Text>
                  <Text style={styles.infoText}>
                    {operateur === 'wave' 
                      ? `1. Ouvrez l'application Wave\n2. Envoyez ${transaction?.montant?.toLocaleString()} FCFA au numéro :\n   ${transaction?.telephone_destinataire}\n3. Saisissez le code ci-dessous`
                      : `1. Ouvrez l'application Orange Money\n2. Envoyez ${transaction?.montant?.toLocaleString()} FCFA au numéro :\n   ${transaction?.telephone_destinataire}\n3. Saisissez le code ci-dessous`}
                  </Text>
                  <Text style={styles.referenceText}>
                    Référence : {transaction?.reference}
                  </Text>
                  <Text style={styles.referenceText}>
                    Code : {transaction?.code_confirmation}
                  </Text>
                </View>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Code de confirmation (6 chiffres)"
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={codeConfirmation}
                  onChangeText={setCodeConfirmation}
                />
                
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={confirmerPaiement}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.modalButtonText}>Confirmer le paiement</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
            
            <Text style={styles.modalSecureText}>
              🔒 Paiement sécurisé
            </Text>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B132B",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  filtersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#1C2541",
  },
  filterText: {
    color: "#9AA4BF",
    fontSize: 12,
  },
  filterTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#1C2541",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  routeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    color: "#9AA4BF",
    fontSize: 12,
  },
  driverSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  driverTitle: {
    color: "#4DA3FF",
    fontSize: 12,
    marginBottom: 8,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  driverText: {
    color: "#fff",
    fontSize: 12,
  },
  driverActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  payNowButton: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  payNowText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  courseTermineeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B98120",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  courseTermineeText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "500",
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B98120",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
    alignSelf: "flex-start",
  },
  paidText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "500",
  },
  rejectedMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  rejectedText: {
    color: "#EF4444",
    fontSize: 12,
  },
  pendingMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  pendingText: {
    color: "#F59E0B",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#1C2541",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxHeight: "80%",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  modalAmount: {
    color: "#4DA3FF",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
  },
  modalLabel: {
    color: "#9AA4BF",
    fontSize: 14,
    marginBottom: 12,
  },
  operatorContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  operatorBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0B132B",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A3655",
  },
  operatorSelected: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  operatorText: {
    color: "#9AA4BF",
    fontSize: 14,
    fontWeight: "500",
  },
  operatorTextSelected: {
    color: "#fff",
  },
  modalInput: {
    backgroundColor: "#0B132B",
    borderRadius: 10,
    padding: 14,
    color: "#fff",
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A3655",
  },
  modalPayButton: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  modalConfirmButton: {
    flexDirection: "row",
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalSecureText: {
    color: "#6B7280",
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },
  infoCard: {
    backgroundColor: "#0B132B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    color: "#4DA3FF",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  infoText: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 20,
  },
  referenceText: {
    color: "#F59E0B",
    fontSize: 12,
    marginTop: 8,
    fontFamily: "monospace",
  },
});