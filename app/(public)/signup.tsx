import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useState } from 'react';
import {
  Alert,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes
} from '@react-native-google-signin/google-signin';

const PRIMARY_COLOR = '#8CD62B';
const BACKGROUND_COLOR = '#F9F9F9';
const BORDER_COLOR = '#E0E0E0';

GoogleSignin.configure({
  webClientId: '789488486637-uhm44ifm2hamqo3c75h3rmunj35a3d2f.apps.googleusercontent.com',
  offlineAccess: true,
  iosClientId: '789488486637-k5g7e0j9hssugsuu00l8q6vh8vhudeg4.apps.googleusercontent.com',

  scopes: ['email', 'profile'],
});

// --- Types ---
type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signIn } = useAuth();

  const isLogin = mode === 'login';


  // Google signin
  const handleGoogleSignIn = async () => {

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      console.log('Google Sign-In Response:', response);

      const idToken = response.data?.idToken
      if (idToken) {
        console.log('Google Sign-In successful. Sending token to backend...');

        const backendResponse = await api.post('/api/auth/google-auth', {
          idToken: idToken,
        });

        const {
          accessToken,
          refreshToken,
          username: userName,
          id: userId
        } = backendResponse.data;

        signIn(accessToken, refreshToken, { username: userName, id: userId });
        Alert.alert('Success', 'Google Sign-In successful!');

      } else {
        Alert.alert('Cancelled', 'Google Sign-In was cancelled or failed to get ID token.');
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('User cancelled the login flow');
            break;
          case statusCodes.IN_PROGRESS:
            console.log('Operation (e.g., sign in) already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert('Error', 'Google Play services not available or outdated.');
            break;
          default:
            console.error('Google Sign-In Error:', error.code, error.message);
            Alert.alert('Error', `Google Sign-In failed: ${error.message}`);
        }
      } else if (axios.isAxiosError(error)) {
        console.error('Backend Auth Error:', error.response?.data || error.message);
        Alert.alert('Error', `Authentication failed: ${error.response?.data?.message || 'Server error'}`);
      } else {
        console.error('Unknown Sign-In Error:', String(error));
        Alert.alert('Error', 'An unknown error occurred during sign-in.');
      }
    }
  };



  const handleAuth = async () => {
    if (isLogin) {
      try {
        const response = await api.post(`/api/auth/login`, { username, password });

        const accessToken = response.data.accessToken;
        const refreshToken = response.data.refreshToken;
        const userData = {
          username: response.data.username,
          id: response.data.id
        };
        console.log("login response:", response.data);
        signIn(accessToken, refreshToken, userData);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('Login failed:', error.response?.data || error.message);
        } else {
          console.error('Login failed:', String(error));
        }
      }
    } else {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match.');
        return;
      }

      try {
        const response = await api.post(`/api/auth/signup`, { email, username, password, confirmPassword });

        const accessToken = response.data.accessToken;
        const refreshToken = response.data.refreshToken;
        const userData = {
          username: response.data.username,
          id: response.data.id
        };
        console.log("Signup successful! Token:", accessToken, "User Data:", userData);
        signIn(accessToken, refreshToken, userData);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('Signup failed:', error.response?.data || error.message);
        } else {
          console.error('Signup failed:', String(error));
        }
      }
    }
  };

  const socialLogin = (provider: 'google' | 'facebook') => {
    if (provider === 'google') {
      handleGoogleSignIn(); // Call the new function
    } else {
      Alert.alert('Social Login', `Signing in with ${provider} is not yet implemented.`);
    }
  };

  const renderLogoSection = () => (
    <View style={styles.logoContainer}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => setMode(isLogin ? 'signup' : 'login')}
      >
        <Text style={styles.skipText}>{isLogin ? 'Signup' : 'Login'}</Text>
      </TouchableOpacity>
      {/* Placeholder for your S.K.I. logo image */}
      {/* Replace this with an actual <Image> component */}
      <View style={styles.logoPlaceholder}>
        <ImageBackground
          source={require('@/assets/images/logo.png')}
          style={styles.logoPlaceholder}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.welcomeText}>
        {isLogin ? 'Welcome Back!' : 'Create Your Account'}
      </Text>
    </View>
  );

  const renderSocialButtons = () => (
    <>
      <View style={styles.socialIconsContainer}>
        <TouchableOpacity
          style={styles.socialIcon}
          onPress={() => socialLogin('google')}
        >
          <FontAwesome name="google" size={24} color="#34A853" />
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={5}
            style={styles.button}
            onPress={async () => {
              try {
                const credential = await AppleAuthentication.signInAsync({
                  requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                  ],
                });

                const { identityToken, fullName } = credential;

                if (identityToken) {
                  console.log('Apple Sign-In successful. Sending token to backend...');
                  const backendResponse = await api.post('/api/auth/apple-auth', {
                    idToken: identityToken,
                  });
                  const {
                    accessToken,
                    refreshToken,
                    username: userName,
                    id: userId
                  } = backendResponse.data;

                  signIn(accessToken, refreshToken, { username: userName, id: userId });
                  Alert.alert('Success', 'Apple Sign-In successful!');
                } else {
                  Alert.alert('Cancelled', 'Apple Sign-In was cancelled or failed to get ID token.');
                }
              } catch (e: any) {
                if (e.code === 'ERR_REQUEST_CANCELED') {
                  console.log('User canceled the sign-in flow');
                } else if (axios.isAxiosError(e)) {
                  console.error('Backend Auth Error:', e.response?.data || e.message);
                  Alert.alert('Error', `Authentication failed: ${e.response?.data?.message || 'Server error'}`);
                } else {
                  console.error('Apple Sign-In Error:', e.message || String(e));
                  Alert.alert('Error', `Apple Sign-In failed: ${e.message || 'An unknown error occurred.'}`);
                }
              }
            }}
          />
        )}
      </View>
      <Text style={styles.termsText}>
        By signing up, our agree to our Terms & Conditions and Privacy Policy
      </Text>
    </>
  );

  const renderLoginFields = () => (
    <View style={styles.formContainer}>
      <TextInput
        style={styles.input}
        placeholder="Email Address or Username"
        placeholderTextColor="#838383ff"
        onChangeText={setUsername}
        value={username}
        keyboardType="default"
        autoCapitalize="none"
      />
      <View style={styles.passwordInputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#838383ff"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
        />
        <FontAwesome5 name="eye" size={16} color="grey" style={styles.passwordIcon} />
      </View>
      <TouchableOpacity style={styles.forgotPassword}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>
      <Text style={styles.orSignInText}>Or sign in with:</Text>
      <TouchableOpacity style={styles.mainButton} onPress={handleAuth}>
        <Text style={styles.mainButtonText}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setMode('signup')}
        style={styles.switchModeButton}
      >
        <Text style={styles.switchModeText}>
          Don&apos;t have an account? <Text style={{ fontWeight: 'bold' }}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSignupFields = () => (
    <View style={styles.formContainer}>
      <TextInput
        style={styles.input}
        placeholder="Email Address"
        placeholderTextColor="#838383ff"
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#838383ff"
        onChangeText={setUsername}
        value={username}
        autoCapitalize="none"
      />
      <View style={styles.passwordInputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#838383ff"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
        />
        <FontAwesome5 name="eye" size={16} color="grey" style={styles.passwordIcon} />
      </View>
      <View style={styles.passwordInputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#838383ff"
          onChangeText={setConfirmPassword}
          value={confirmPassword}
          secureTextEntry
        />
        <FontAwesome5 name="eye" size={16} color="grey" style={styles.passwordIcon} />
      </View>
      <TouchableOpacity style={styles.mainButton} onPress={handleAuth}>
        <Text style={styles.mainButtonText}>Sign Up</Text>
      </TouchableOpacity>
      {renderSocialButtons()}

    </View>
  );

  return (
    <ImageBackground source={require('@/assets/images/background.png')} style={styles.backgroundImage}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          {renderLogoSection()}
          {isLogin ? renderLoginFields() : renderSignupFields()}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '120%',
    paddingTop: 50, // To account for safe areas and notches
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: 'rgba(182, 182, 182, 0.7)',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  button: {
    width: 200,
    height: 44,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: -10,
    right: 0,
    padding: 10,
  },
  skipText: {
    color: 'grey',
    fontSize: 14,
    fontWeight: '500',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0F0FF', // Light blue background for the logo circle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#B3E0FF',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#007AFF', // Example primary blue color
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 15,
  },
  passwordInputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15,
  },
  passwordIcon: {
    position: 'absolute',
    right: 15,
    padding: 10,
    color: '#A0A0A0',
  },
  mainButton: {
    width: '100%',
    height: 50,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 100,
    marginTop: 5,
    marginBottom: 10,
  },
  socialIcon: {
    padding: 5,
    marginHorizontal: 10,
  },
  termsText: {
    fontSize: 10,
    color: 'grey',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  orSignInText: {
    color: '#A0A0A0',
    fontSize: 12,
    marginBottom: 10,
  },
  switchModeButton: {
    marginTop: 10,
  },
  switchModeText: {
    color: '#007AFF',
    fontSize: 14,
  },
});