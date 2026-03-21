import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { RSA } from 'react-native-rsa-native';
import axios from 'axios';

// IMPORTANT:// Use Public Internet Server via LocalTunnel
const API_URL = 'https://simple-saas-auth-bridge.loca.lt';
const WS_URL = 'wss://simple-saas-auth-bridge.loca.lt';

export default function App() {
  const [keys, setKeys] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [authRequest, setAuthRequest] = useState(null);
  const [status, setStatus] = useState('Initializing...');
  const wsRef = useRef(null);

  useEffect(() => {
    initApp();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const initApp = async () => {
    try {
      setStatus('Generating RSA Keys (This may take a moment)...');
      // 1. Generate Key Pair
      const generatedKeys = await RSA.generateKeys(2048); 
      setKeys(generatedKeys);
      
      setStatus('Registering with Server...');
      // 2. Register public key
      const response = await axios.post(`${API_URL}/register`, {
        publicKey: generatedKeys.public
      });
      
      const newDeviceId = response.data.deviceId;
      setDeviceId(newDeviceId);
      setStatus('Registered. Connecting to relay...');
      
      // 3. Connect to WebSocket
      connectWebSocket(newDeviceId);
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}. Is the server running?`);
    }
  };

  const connectWebSocket = (id) => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'mobile_connect', deviceId: id }));
      setStatus('Connected & Waiting for requests...');
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'auth_request') {
          setAuthRequest(data);
          setStatus('Incoming Request!');
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.onclose = () => {
      setStatus('WebSocket Disconnected. Reconnecting in 3s...');
      setTimeout(() => connectWebSocket(id), 3000);
    };
    
    ws.onerror = (e) => {
      console.error('WebSocket error', e.message);
    }
  };

  const handleResponse = async (action) => {
    if (!authRequest || !keys || !deviceId) return;
    
    try {
      setStatus(`Processing ${action}...`);
      
      const payload = { action, sessionId: authRequest.sessionId, timestamp: Date.now() };
      const payloadString = JSON.stringify(payload);
      
      // Sign the payload (E2EE Signature)
      const signature = await RSA.sign(payloadString, keys.private);
      
      // Send the signed response back to the verify endpoint
      await axios.post(`${API_URL}/verify`, {
        sessionId: authRequest.sessionId,
        deviceId,
        signature,
        payload
      });
      
      setAuthRequest(null);
      setStatus(`Successfully sent ${action} response.`);
      
      // Reset back to waiting after a short delay
      setTimeout(() => {
         setStatus('Connected & Waiting for requests...');
      }, 3000);
      
    } catch (error) {
      console.error('Approval error:', error);
      Alert.alert('Error', 'Failed to send signature response');
      setStatus('Connected & Waiting for requests...');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simple SaaS</Text>
      <Text style={styles.subtitle}>Authenticator</Text>
      
      {deviceId ? (
        <View style={styles.card}>
            <Text style={styles.deviceLabel}>Secure Device ID</Text>
            <Text style={styles.deviceId}>{deviceId.substring(0, 12)}...</Text>
        </View>
      ) : (
        <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
      )}
      
      <Text style={styles.status}>{status}</Text>
      
      {authRequest && (
        <View style={styles.requestContainer}>
          <Text style={styles.requestTitle}>🚪 New Access Request</Text>
          <Text style={styles.requestMessage}>{authRequest.message}</Text>
          <Text style={styles.requestSession}>Session ID: {authRequest.sessionId}</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.denyButton]} 
              onPress={() => handleResponse('Deny')}
            >
              <Text style={styles.buttonText}>DENY</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.approveButton]} 
              onPress={() => handleResponse('Approve')}
            >
              <Text style={styles.buttonText}>APPROVE</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A365D',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#4A5568',
    marginBottom: 30,
    fontWeight: '600'
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
    alignItems: 'center',
    width: '80%'
  },
  deviceLabel: {
    fontSize: 12,
    color: '#718096',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 5
  },
  deviceId: {
    fontSize: 16,
    color: '#2D3748',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  status: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 30,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20
  },
  loader: {
    marginVertical: 20,
  },
  requestContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#4299E1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  requestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#2B6CB0'
  },
  requestMessage: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    color: '#2D3748'
  },
  requestSession: {
    fontSize: 11,
    color: '#A0AEC0',
    marginBottom: 25,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  denyButton: {
    backgroundColor: '#E53E3E',
  },
  approveButton: {
    backgroundColor: '#38A169',
  },
  buttonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5
  },
});
