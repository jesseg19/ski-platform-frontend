import { useAuth } from '@/auth/AuthContext';
import api from '@/auth/axios';
import { Theme } from '@/constants/theme';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Asset } from 'expo-asset';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 5;

GoogleSignin.configure({
  webClientId: '1006426252858-jrhpcis6mh4as2edvvn0ink9ol5tl0u4.apps.googleusercontent.com',
  offlineAccess: true,
  iosClientId: '789488486637-k5g7e0j9hssugsuu00l8q6vh8vhudeg4.apps.googleusercontent.com',
  scopes: ['email', 'profile'],
});

// Get the full screen height for flexible sizing calculation
const { height: screenHeight } = Dimensions.get('window');
const CARD_MAX_HEIGHT = screenHeight * 0.9; // Card can take up max 90% of screen
const LOGO_SIZE_FACTOR = 0.125;
// Calculate the responsive size, capping it at a maximum of 110
const responsiveLogoSize = Math.min(110, screenHeight * LOGO_SIZE_FACTOR);

// Custom component for Password Input with visibility toggle
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

const preloadAssets = async () => {
  const videoAssets = [
    require('../../assets/how-to-challenge.mp4'),
    require('../../assets/how-to-call-trick.mp4'),
    require('../../assets/how-to-add-letter-without-trick.mp4'),
  ];

  // This downloads them to the device cache in the background
  await Promise.all(videoAssets.map(res => Asset.fromModule(res).downloadAsync()));
};

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
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
        return 'Invalid username/email or password. Please check your credentials and try again.';
      }
      if (status === 403) {
        return 'Login failed. Incorrect username/email or password.';
      }
      if (status === 409) {
        return 'This email or username is already taken. Please try logging in or using a different email/username.';
      }
      if (status === 400) {
        // Check for validation errors from the backend
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          // Combine all field errors into a single message
          const fieldErrors = data.errors.map((err: { field: string, message: string }) =>
            `${err.field}: ${err.message}`
          ).join('\n');
          return `Validation Errors:\n${fieldErrors}`;
        }

        // Fallback for general 400 error messages
        if (message.includes('password')) {
          return 'Invalid password format. Password must be 5+ characters, including numbers and symbols).';
        }
        return message;
      }
      return message;
    }
    return defaultMessage;
  };

  const validateSignup = () => {
    setValidationError('');

    if (!email || !username || !password || !confirmPassword) {
      setValidationError('All fields are required.');
      return false;
    }

    if (!EMAIL_REGEX.test(email)) {
      setValidationError('Please enter a valid email address.');
      return false;
    }

    if (username.length < MIN_USERNAME_LENGTH || username.length > MAX_USERNAME_LENGTH) {
      setValidationError(`Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters.`);
      return false;
    }

    // Basic check for inappropriate characters
    const INAPPROPRIATE_CHARS_REGEX = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?~`]/;
    if (INAPPROPRIATE_CHARS_REGEX.test(username)) {
      setValidationError('Username contains inappropriate characters. Only letters and numbers are recommended.');
      return false;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return false;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match. Please ensure both passwords are identical.');
      return false;
    }

    return true;
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
    preloadAssets();
    setValidationError('');

    if (isLogin) {
      if (!username || !password) {
        setValidationError('Please enter your username/email and password.');
        return;
      }

      try {
        const response = await api.post(`/api/auth/login`, { identifier: username, password: password });

        const accessToken = response.data.accessToken;
        const refreshToken = response.data.refreshToken;
        const userData = {
          username: response.data.username,
          id: response.data.id,
        };
        signIn(accessToken, refreshToken, userData);
      } catch (error) {
        const errorMessage = getAuthErrorMessage(
          error,
          'Login failed. Please check your network and try again.'
        );
        setValidationError(errorMessage);
        console.error('Login failed:', errorMessage);
      }
    } else {
      if (!validateSignup()) {
        Alert.alert('Signup Failed', validationError);
        return;
      }

      try {
        const response = await api.post(`/api/auth/signup`, {
          email,
          username,
          password
        });
        const accessToken = response.data.accessToken;
        const refreshToken = response.data.refreshToken;
        const userData = {
          username: response.data.username,
          id: response.data.id,
        };
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
        placeholder="Username or Email"
        placeholderTextColor="#838383ff"
        onChangeText={setUsername}
        value={username}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <PasswordInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        toggleVisibility={togglePasswordVisibility}
      />

      {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
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
        maxLength={MAX_USERNAME_LENGTH}
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

      {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollViewContainer}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.card, { maxHeight: CARD_MAX_HEIGHT }]}>
              {renderLogoSection()}
              {isLogin ? renderLoginFields() : renderSignupFields()}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  errorText: {
    color: 'red',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
    fontWeight: '500',
    width: '100%',
  },

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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scrollViewContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    width: '100%',
    height: 44,
    marginTop: 10,
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
    color: Theme.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  logoPlaceholder: {
    width: responsiveLogoSize,
    height: responsiveLogoSize,
    borderRadius: responsiveLogoSize / 2,
    backgroundColor: '#E0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B3E0FF',
    overflow: 'hidden',
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
    backgroundColor: Theme.background,
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Theme.border,
    marginBottom: 15,
    fontSize: 16,
    paddingRight: 50,
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
    right: 0,
    padding: 15,
    zIndex: 1,
    color: '#A0A0A0',
  },
  mainButton: {
    width: '100%',
    height: 50,
    backgroundColor: Theme.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20,
    shadowColor: Theme.primary,
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

  socialIconsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '80%',
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
    borderColor: Theme.border,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  termsText: {
    fontSize: 10,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },

  orSignInText: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  switchModeButton: {
    marginTop: 10,
  },
  switchModeText: {
    color: '#007AFF',
    fontSize: 14,

  },
});