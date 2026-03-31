import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { autocompleteAddress } from '../lib/api';

export default function TestAutocomplete() {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (input.length >= 2) {
        console.log('🔍 Appel autocomplete pour:', input);
        const results = await autocompleteAddress(input);
        console.log('📦 Résultats:', results);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Tapez un lieu (ex: Ouakam)"
        value={input}
        onChangeText={setInput}
      />
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.placeId}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.text}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 8 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  text: { fontSize: 16 },
});