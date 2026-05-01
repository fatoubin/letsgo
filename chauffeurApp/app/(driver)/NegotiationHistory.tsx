import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getToken, API_URL } from "../../src/services/api";
import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";

type Negotiation = {
  id: number;
  type: "chauffeur" | "client";
  prix_propose: number;
  message: string;
  created_at: string;
  auteur: string;
};

export default function NegotiationHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const offreId = params.offreId as string;
  const isDriver = params.isDriver === "true";
  
  const [negociations, setNegociations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPrice, setNewPrice] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchNegociations();
  }, []);

  const fetchNegociations = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/offre/negociations/${offreId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setNegociations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur chargement négociations:", error);
      Alert.alert("Erreur", "Impossible de charger l'historique");
    } finally {
      setLoading(false);
    }
  };

  const sendCounterOffer = async () => {
    if (!newPrice || Number(newPrice) <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un prix valide");
      return;
    }

    setSending(true);
    try {
      const token = await getToken();
      const endpoint = isDriver ? "/api/driver/make-offer" : "/api/client/counter-offer";
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          offre_id: parseInt(offreId),
          prix_propose: Number(newPrice),
          message: newMessage
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert("✅ Succès", "Contre-offre envoyée");
        setNewPrice("");
        setNewMessage("");
        fetchNegociations();
      } else {
        Alert.alert("Erreur", data.message || "Action impossible");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'envoyer la contre-offre");
    } finally {
      setSending(false);
    }
  };

  const getMessageBubbleStyle = (type: string) => {
    if (type === "chauffeur") {
      return isDriver ? styles.myMessage : styles.otherMessage;
    } else {
      return !isDriver ? styles.myMessage : styles.otherMessage;
    }
  };

  const renderItem = ({ item }: { item: Negotiation }) => (
    <View style={[styles.messageBubble, getMessageBubbleStyle(item.type)]}>
      <Text style={styles.messageAuthor}>{item.auteur}</Text>
      <Text style={styles.messagePrice}>💰 {item.prix_propose.toLocaleString("fr-FR")} FCFA</Text>
      {item.message ? <Text style={styles.messageText}>{item.message}</Text> : null}
      <Text style={styles.messageDate}>
        {new Date(item.created_at).toLocaleString("fr-FR")}
      </Text>
    </View>
  );

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={globalStyles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Négociation</Text>
      </View>

      {/* Historique des messages */}
      <FlatList
        data={negociations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune négociation pour le moment</Text>
          </View>
        }
      />

      {/* Zone pour envoyer une contre-offre */}
      {negociations.length === 0 || 
       (negociations.length > 0 && negociations[negociations.length - 1].type !== 
        (isDriver ? "chauffeur" : "client")) ? (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            {isDriver ? "Proposer un nouveau prix" : "Faire une contre-offre"}
          </Text>
          <TextInput
            style={styles.priceInput}
            placeholder="Prix en FCFA"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={newPrice}
            onChangeText={setNewPrice}
          />
          <TextInput
            style={styles.messageInput}
            placeholder="Message (optionnel)"
            placeholderTextColor={COLORS.textMuted}
            multiline
            value={newMessage}
            onChangeText={setNewMessage}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendCounterOffer}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Envoyer la contre-offre 💬</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>
            En attente de réponse de {isDriver ? "du client" : "du chauffeur"}...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messageBubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: "#1F2937",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageAuthor: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  messagePrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
  },
  inputContainer: {
    backgroundColor: "#1F2937",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  inputLabel: {
    color: COLORS.textLight,
    fontSize: 14,
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  messageInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  waitingContainer: {
    backgroundColor: "#1F2937",
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  waitingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontStyle: "italic",
  },
});