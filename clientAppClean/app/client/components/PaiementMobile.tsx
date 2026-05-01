import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput, Modal } from "react-native";
import { useState } from "react";
import { API_URL, getToken } from "../../../lib/api";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

type Props = {
    reservationId: number;
    montant: number;
    chauffeurNom: string;
    chauffeurTelephone: string;
    onSuccess: () => void;
    onClose: () => void;
};

export default function PaiementMobile({ reservationId, montant, chauffeurNom, chauffeurTelephone, onSuccess, onClose }: Props) {
    const [loading, setLoading] = useState(false);
    const [operateur, setOperateur] = useState<'wave' | 'om' | null>(null);
    const [telephone, setTelephone] = useState("");
    const [transaction, setTransaction] = useState<any>(null);
    const [codeConfirmation, setCodeConfirmation] = useState("");
    const [confirmationLoading, setConfirmationLoading] = useState(false);

    // Étape 1 : Choisir l'opérateur et initier le paiement
    const initierPaiement = async () => {
        if (!operateur) {
            Alert.alert("Erreur", "Veuillez choisir un moyen de paiement");
            return;
        }
        
        if (!telephone || telephone.length < 9) {
            Alert.alert("Erreur", "Veuillez entrer votre numéro de téléphone");
            return;
        }
        
        setLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/api/paiements/initier`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    reservation_id: reservationId,
                    operateur: operateur,
                    telephone: telephone,
                }),
            });
            
            const data = await response.json();
            
            if (data.transaction_id) {
                setTransaction(data);
                
                // Ouvrir l'application Wave ou Orange Money
                if (operateur === 'wave') {
                    // Wave : ouvrir l'application avec le numéro du chauffeur
                    const waveUrl = `wave://send?number=${chauffeurTelephone}&amount=${montant}`;
                    const canOpen = await Linking.canOpenURL(waveUrl);
                    if (canOpen) {
                        await Linking.openURL(waveUrl);
                    } else {
                        // Fallback : ouvrir le site web Wave
                        await Linking.openURL(`https://wave.com/send?number=${chauffeurTelephone}&amount=${montant}`);
                    }
                } else if (operateur === 'om') {
                    // Orange Money : ouvrir l'application
                    const omUrl = `orangemoney://payment?phone=${chauffeurTelephone}&amount=${montant}`;
                    const canOpen = await Linking.canOpenURL(omUrl);
                    if (canOpen) {
                        await Linking.openURL(omUrl);
                    } else {
                        // Afficher les instructions manuelles
                        Alert.alert(
                            "Instructions de paiement",
                            `Veuillez envoyer ${montant.toLocaleString()} FCFA via Orange Money au numéro :\n\n${chauffeurTelephone}\n\nNuméro de référence : ${data.reference}\n\nCode de confirmation : ${data.code_confirmation}`,
                            [{ text: "OK" }]
                        );
                    }
                }
            } else {
                Alert.alert("Erreur", data.message || "Impossible d'initier le paiement");
            }
        } catch (error) {
            Alert.alert("Erreur", "Impossible de contacter le serveur");
        } finally {
            setLoading(false);
        }
    };

    // Étape 2 : Confirmer le paiement après avoir payé
    const confirmerPaiement = async () => {
        if (!codeConfirmation || codeConfirmation.length !== 6) {
            Alert.alert("Erreur", "Veuillez entrer le code de confirmation à 6 chiffres");
            return;
        }
        
        if (!transaction) {
            Alert.alert("Erreur", "Transaction introuvable");
            return;
        }
        
        setConfirmationLoading(true);
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
                onSuccess();
            } else {
                Alert.alert("Erreur", data.message || "Code invalide");
            }
        } catch (error) {
            Alert.alert("Erreur", "Impossible de confirmer le paiement");
        } finally {
            setConfirmationLoading(false);
        }
    };

    // Réinitialiser et recommencer
    const resetPaiement = () => {
        setTransaction(null);
        setOperateur(null);
        setTelephone("");
        setCodeConfirmation("");
    };

    return (
        <Modal transparent visible animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#9AA4BF" />
                    </TouchableOpacity>
                    
                    <View style={styles.iconContainer}>
                        <Ionicons name="cash-outline" size={48} color="#10B981" />
                    </View>
                    
                    <Text style={styles.title}>Paiement de la course</Text>
                    <Text style={styles.amount}>{montant.toLocaleString()} FCFA</Text>
                    
                    {!transaction ? (
                        // Étape 1 : Choix du moyen de paiement
                        <>
                            <Text style={styles.label}>Choisissez votre moyen de paiement</Text>
                            
                            <View style={styles.operatorContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.operatorBtn,
                                        operateur === 'wave' && styles.operatorSelected,
                                    ]}
                                    onPress={() => setOperateur('wave')}
                                >
                                    <Ionicons 
                                        name="logo-wave" 
                                        size={32} 
                                        color={operateur === 'wave' ? "#fff" : "#9AA4BF"} 
                                    />
                                    <Text style={[
                                        styles.operatorText,
                                        operateur === 'wave' && styles.operatorTextSelected
                                    ]}>Wave</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[
                                        styles.operatorBtn,
                                        operateur === 'om' && styles.operatorSelected,
                                    ]}
                                    onPress={() => setOperateur('om')}
                                >
                                    <Ionicons 
                                        name="phone-portrait-outline" 
                                        size={32} 
                                        color={operateur === 'om' ? "#fff" : "#9AA4BF"} 
                                    />
                                    <Text style={[
                                        styles.operatorText,
                                        operateur === 'om' && styles.operatorTextSelected
                                    ]}>Orange Money</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <TextInput
                                style={styles.input}
                                placeholder="Votre numéro de téléphone"
                                placeholderTextColor="#6B7280"
                                keyboardType="phone-pad"
                                value={telephone}
                                onChangeText={setTelephone}
                            />
                            
                            <TouchableOpacity
                                style={styles.payButton}
                                onPress={initierPaiement}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                                        <Text style={styles.payButtonText}>Continuer</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        // Étape 2 : Confirmation après paiement
                        <>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoTitle}>Instructions</Text>
                                <Text style={styles.infoText}>
                                    {operateur === 'wave' 
                                        ? `1. Ouvrez Wave\n2. Envoyez ${montant.toLocaleString()} FCFA au numéro :\n   ${chauffeurTelephone}\n3. Saisissez le code ci-dessous`
                                        : `1. Ouvrez Orange Money\n2. Envoyez ${montant.toLocaleString()} FCFA au numéro :\n   ${chauffeurTelephone}\n3. Saisissez le code ci-dessous`}
                                </Text>
                                <Text style={styles.referenceText}>
                                    Référence : {transaction.reference}
                                </Text>
                            </View>
                            
                            <TextInput
                                style={styles.input}
                                placeholder="Code de confirmation (6 chiffres)"
                                placeholderTextColor="#6B7280"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={codeConfirmation}
                                onChangeText={setCodeConfirmation}
                            />
                            
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={confirmerPaiement}
                                disabled={confirmationLoading}
                            >
                                {confirmationLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                        <Text style={styles.payButtonText}>Confirmer le paiement</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.resetButton} onPress={resetPaiement}>
                                <Text style={styles.resetText}>❮ Retour</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    
                    <Text style={styles.secureText}>
                        🔒 Paiement sécurisé. Vous recevrez une confirmation par SMS.
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        backgroundColor: "#1C2541",
        borderRadius: 20,
        padding: 24,
        width: "90%",
        maxHeight: "80%",
    },
    closeBtn: {
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 10,
    },
    iconContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
    },
    amount: {
        color: "#4DA3FF",
        fontSize: 28,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 24,
    },
    label: {
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
    input: {
        backgroundColor: "#0B132B",
        borderRadius: 10,
        padding: 14,
        color: "#fff",
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#2A3655",
    },
    payButton: {
        flexDirection: "row",
        backgroundColor: "#2563EB",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 12,
    },
    confirmButton: {
        flexDirection: "row",
        backgroundColor: "#10B981",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginBottom: 12,
    },
    resetButton: {
        alignItems: "center",
        paddingVertical: 8,
    },
    resetText: {
        color: "#4DA3FF",
        fontSize: 14,
    },
    payButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    secureText: {
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
        marginTop: 12,
        fontFamily: "monospace",
    },
});