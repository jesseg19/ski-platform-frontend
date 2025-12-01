import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
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

// Custom component for Password Input, simplifying the main component logic
const PasswordInput = ({ value, onChangeText, placeholder, secureTextEntry, toggleVisibility }: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry: boolean;
  toggleVisibility: () => void;
}) => (
  <View style={styles.passwordInputContainer}>
    <TextInput
      style={[styles.input, { marginBottom: 0 }]}
      placeholder={placeholder}
      placeholderTextColor="#838383ff"
      onChangeText={onChangeText}
      value={value}
      secureTextEntry={secureTextEntry}
    />
    <TouchableOpacity onPress={toggleVisibility} style={styles.passwordIcon}>
      <FontAwesome5 name={secureTextEntry ? 'eye-slash' : 'eye'} size={16} color="#A0A0A0" />
    </TouchableOpacity>
  </View>
);

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();

  const isLogin = mode === 'login';

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // Helper function to provide clean, user-facing error messages from Axios responses
  const getAuthErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (axios.isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      let message = data?.message || data?.error || defaultMessage;

      // Handle specific HTTP status codes and known backend errors
      if (status === 401) {
        return 'Invalid username or password. Please check your credentials and try again.';
      }
      if (status === 409) {
        return 'This email or username is already taken. Please try logging in or using a different email/username.';
      }
      if (status === 400 && message.includes('password')) {
        return 'Invalid password format. Password must be strong (e.g., 8+ characters, including numbers and symbols).';
      }
      return message;
    }
    return defaultMessage;
  };

  // Google signin
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      console.log('Google Sign-In Response:', response);

      const idToken = response.data?.idToken;
      if (idToken) {
        console.log('Google Sign-In successful. Sending token to backend...');

        const backendResponse = await api.post('/api/auth/google-auth', {
          idToken: idToken,
        });

        const {
          accessToken,
          refreshToken,
          username: userName,
          id: userId,
        } = backendResponse.data;

        signIn(accessToken, refreshToken, { username: userName, id: userId });
        Alert.alert('Success', 'Google Sign-In successful!');
      } else {
        Alert.alert('Cancelled', 'Google Sign-In was cancelled or failed to get ID token.');
      }
    } catch (error) {
      let errorMessage = 'An unknown error occurred during Google sign-in.';

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('User cancelled the login flow');
            return;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            errorMessage = 'Google Play services not available or outdated.';
            break;
          default:
            errorMessage = `Google Sign-In failed: ${error.message}`;
        }
      } else if (axios.isAxiosError(error)) {
        errorMessage = getAuthErrorMessage(error, 'Authentication failed with server error.');
      } else {
        console.error('Unknown Sign-In Error:', String(error));
      }
      Alert.alert('Error', errorMessage);
    }
  };

  // Apple signin
  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = credential;

      if (identityToken) {
        console.log('Apple Sign-In successful. Sending token to backend...');
        const backendResponse = await api.post('/api/auth/apple-auth', {
          idToken: identityToken,
        });
        const {
          accessToken,
          refreshToken,
          username: userName,
          id: userId,
        } = backendResponse.data;

        signIn(accessToken, refreshToken, { username: userName, id: userId });
        Alert.alert('Success', 'Apple Sign-In successful!');
      } else {
        Alert.alert('Cancelled', 'Apple Sign-In was cancelled or failed to get ID token.');
      }
    } catch (e: any) {
      let errorMessage = 'An unknown error occurred during Apple sign-in.';
      if (e.code === 'ERR_REQUEST_CANCELED') {
        console.log('User canceled the sign-in flow');
        return;
      } else if (axios.isAxiosError(e)) {
        errorMessage = getAuthErrorMessage(e, 'Authentication failed with server error.');
      } else {
        errorMessage = `Apple Sign-In failed: ${e.message || 'An unknown error occurred.'}`;
      }
      Alert.alert('Error', errorMessage);
    }
  };


  const handleAuth = async () => {
    console.log(isLogin, username, password, email, confirmPassword);
    if (isLogin) {
      try {
        const response = await api.post(`/api/auth/login`, { username, password });

        const accessToken = response.data.accessToken;
        const refreshToken = response.data.refreshToken;
        const userData = {
          username: response.data.username,
          id: response.data.id,
        };
        console.log('login response:', response.data);
        signIn(accessToken, refreshToken, userData);
      } catch (error) {
        const errorMessage = getAuthErrorMessage(
          error,
          'Login failed. Please check your network and try again.'
        );
        Alert.alert('Login Failed', errorMessage);
        console.error('Login failed:', error);
      }
    } else {
      if (password !== confirmPassword) {
        Alert.alert('Signup Failed', 'Passwords do not match. Please ensure both passwords are identical.');
        return;
      }

      try {
        const response = await api.post(`/api/auth/signup`, {
          email,
          username,
          password,
          confirmPassword,
        });

        const accessToken = response.data.accessToken;
        const refreshToken = response.data.refreshToken;
        const userData = {
          username: response.data.username,
          id: response.data.id,
        };
        console.log('Signup successful! Token:', accessToken, 'User Data:', userData);
        signIn(accessToken, refreshToken, userData);
      } catch (error) {
        const errorMessage = getAuthErrorMessage(
          error,
          'Signup failed. Please check your network and try again.'
        );
        Alert.alert('Signup Failed', errorMessage);
        console.error('Signup failed:', error);
      }
    }
  };

  const renderLogoSection = () => (
    <View style={styles.logoContainer}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => setMode(isLogin ? 'signup' : 'login')}
      >
        <Text style={styles.skipText}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
      </TouchableOpacity>
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

  // Updated to render social buttons in a vertical stack
  const renderSocialButtons = () => (
    <>
      <Text style={styles.orSignInText}>Or sign in with:</Text>
      <View style={styles.socialIconsContainer}>
        {/* Google Sign In */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleGoogleSignIn}
        >
          <FontAwesome name="google" size={24} color="#34A853" />
        </TouchableOpacity>

        {/* Apple Sign In (iOS only) */}
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}
      </View>
      <Text style={styles.termsText}>
        By signing up, you agree to our Terms & Conditions and Privacy Policy
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
      <PasswordInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        toggleVisibility={togglePasswordVisibility}
      />

      <TouchableOpacity style={styles.forgotPassword}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mainButton} onPress={handleAuth}>
        <Text style={styles.mainButtonText}>Log In</Text>
      </TouchableOpacity>
      {renderSocialButtons()}

      <TouchableOpacity
        onPress={() => setMode('signup')}
        style={styles.switchModeButton}
      >
        <Text style={styles.switchModeText}>
          Don&#39;t have an account? <Text style={{ fontWeight: 'bold' }}>Sign Up</Text>
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
      <PasswordInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        toggleVisibility={togglePasswordVisibility}
      />
      <PasswordInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword}
        toggleVisibility={togglePasswordVisibility}
      />

      <TouchableOpacity style={styles.mainButton} onPress={handleAuth}>
        <Text style={styles.mainButtonText}>Sign Up</Text>
      </TouchableOpacity>
      {renderSocialButtons()}

      <TouchableOpacity
        onPress={() => setMode('login')}
        style={styles.switchModeButton}
      >
        <Text style={styles.switchModeText}>
          Already have an account? <Text style={{ fontWeight: 'bold' }}>Log In</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageBackground source={require('@/assets/images/background.png')} style={styles.backgroundImage}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.card}>
            {renderLogoSection()}
            {isLogin ? renderLoginFields() : renderSignupFields()}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '120%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slightly less transparent background
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  button: {
    width: 200,
    height: 44,
  },
  appleButton: {
    width: '100%', // Take up full width of socialIconContainer
    height: 44,
    marginTop: 10, // Added spacing
    marginBottom: 10,
    borderRadius: 10,
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
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: '500',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#B3E0FF',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
    color: '#333',
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
    marginBottom: 15, // Default input spacing
    fontSize: 16, // Added font size to ensure visibility
    paddingRight: 50, // Added padding to prevent text under the eye icon
  },
  passwordInputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15, // Spacing between password fields
  },
  passwordIcon: {
    position: 'absolute',
    right: 0,
    padding: 15,
    zIndex: 1,
    color: '#A0A0A0',
  },
  mainButton: {
    width: '100%',
    height: 50,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10, // More subtle rounding
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Adjusted social container for vertical stacking and better width utilization
  socialIconsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '80%', // Confine social buttons to a smaller width than main form
    marginTop: 5,
    marginBottom: 10,
  },
  socialButton: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  termsText: {
    fontSize: 10,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
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
    marginTop: 10,
  },
  switchModeButton: {
    marginTop: 15,
  },
  switchModeText: {
    color: '#007AFF',
    fontSize: 14,
  },
});