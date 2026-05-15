import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.89.158:3000';

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [payFrequency, setPayFrequency] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [signupError, setSignupError] = useState('');
  const [plaidConnecting, setPlaidConnecting] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [settingsIncome, setSettingsIncome] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('finch_token');
      if (savedToken) {
        setToken(savedToken);
        await loadDashboard(savedToken);
      } else {
        setScreen('welcome');
        setLoading(false);
      }
    } catch (err) {
      setScreen('welcome');
      setLoading(false);
    }
  };

  const loadDashboard = async (tok) => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`
        }
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setDashboard(data);
        setSettingsIncome(data.user.monthly_income?.toString() || '');
        setScreen('dashboard');
        setLoginError('');
      } else {
        console.error('Dashboard error:', data.error);
        setLoginError(data.error || 'Failed to load dashboard');
        await AsyncStorage.removeItem('finch_token');
        setScreen('welcome');
      }
    } catch (err) {
      console.error('Load error:', err.message);
      setLoginError('Connection error: ' + err.message);
      setScreen('welcome');
    } finally {
      setLoginLoading(false);
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError('Email and password required');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        setLoginError('Invalid credentials');
        setLoginLoading(false);
        return;
      }

      await AsyncStorage.setItem('finch_token', data.token);
      setToken(data.token);
      await loadDashboard(data.token);
    } catch (err) {
      setLoginError('Connection error');
      setLoginLoading(false);
    }
  };

  const handleSignupStep1 = () => {
    if (!signupEmail || !signupPassword) {
      setSignupError('Email and password required');
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters');
      return;
    }
    setSignupError('');
    setScreen('signup-pay');
  };

  const handleSignupStep2 = () => {
    if (!payFrequency) {
      setSignupError('Select pay frequency');
      return;
    }
    setSignupError('');
    setScreen('signup-income');
  };

  const handleSignupStep3 = async () => {
    if (!monthlyIncome || parseFloat(monthlyIncome) <= 0) {
      setSignupError('Enter valid income');
      return;
    }
    setSignupError('');
    setScreen('signup-bank');
  };

  const handlePlaidSuccess = async (publicToken) => {
    setPlaidConnecting(true);
    
    try {
      const res = await fetch(`${API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          phone: 'finch-app@finch.local',
          payFrequency: payFrequency,
          monthlyIncome: parseFloat(monthlyIncome),
          public_token: publicToken
        })
      });
  
      const data = await res.json();
      
      if (data.success && data.token) {
        await AsyncStorage.setItem('finch_token', data.token);
        setToken(data.token);
        await loadDashboard(data.token);
      } else {
        setSignupError(data.error || 'Signup failed');
        setPlaidConnecting(false);
      }
    } catch (err) {
      setSignupError('Connection error: ' + err.message);
      setPlaidConnecting(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('finch_token');
    setToken(null);
    setUser(null);
    setDashboard(null);
    setLoginEmail('');
    setLoginPassword('');
    setScreen('welcome');
  };

  const updatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setUpdateMessage('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setUpdateMessage('Password updated!');
        setNewPassword('');
      } else {
        setUpdateMessage(data.error || 'Failed to update');
      }
    } catch (err) {
      setUpdateMessage('Error');
    }
  };

  const updateIncome = async () => {
    if (!settingsIncome || parseFloat(settingsIncome) <= 0) {
      setUpdateMessage('Valid income required');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/update-income`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ monthlyIncome: parseFloat(settingsIncome) })
      });

      const data = await res.json();
      if (res.ok) {
        setUpdateMessage('Income updated!');
      } else {
        setUpdateMessage(data.error || 'Failed to update');
      }
    } catch (err) {
      setUpdateMessage('Error');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  // WELCOME SCREEN
  if (screen === 'welcome') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.welcomeContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🐦</Text>
            <Text style={styles.appName}>Finch</Text>
            <Text style={styles.tagline}>Know before you forget</Text>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>⚡</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Instant notifications</Text>
                <Text style={styles.featureDesc}>Every purchase scored in seconds</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🧠</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Personalised to you</Text>
                <Text style={styles.featureDesc}>Based on your income and balance</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🔒</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Read-only access</Text>
                <Text style={styles.featureDesc}>We can never touch your money</Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setScreen('signup-account')}
            >
              <Text style={styles.primaryButtonText}>Create account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setScreen('login')}
            >
              <Text style={styles.secondaryButtonText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // LOGIN SCREEN
  if (screen === 'login') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <TouchableOpacity
            style={styles.backButtonSmall}
            onPress={() => setScreen('welcome')}
          >
            <Text style={styles.backButtonSmallText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.authHeader}>
            <Text style={styles.authTitle}>Welcome back</Text>
            <Text style={styles.authSubtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#666"
              value={loginEmail}
              onChangeText={setLoginEmail}
              editable={!loginLoading}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#666"
              secureTextEntry
              value={loginPassword}
              onChangeText={setLoginPassword}
              editable={!loginLoading}
            />
          </View>

          {loginError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginButton, loginLoading && styles.buttonLoading]}
            onPress={handleLogin}
            disabled={loginLoading}
          >
            <Text style={styles.loginButtonText}>
              {loginLoading ? 'Signing in...' : 'Sign in'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // SIGNUP SCREEN 1 - Account
  if (screen === 'signup-account') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <TouchableOpacity
            style={styles.backButtonSmall}
            onPress={() => setScreen('welcome')}
          >
            <Text style={styles.backButtonSmallText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
          </View>

          <View style={styles.authHeader}>
            <Text style={styles.authTitle}>Create account</Text>
            <Text style={styles.authSubtitle}>Get instant spending insights</Text>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#666"
              value={signupEmail}
              onChangeText={setSignupEmail}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#666"
              secureTextEntry
              value={signupPassword}
              onChangeText={setSignupPassword}
            />
          </View>

          {signupError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{signupError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleSignupStep1}
          >
            <Text style={styles.loginButtonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // SIGNUP SCREEN 2 - Pay Frequency
  if (screen === 'signup-pay') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <TouchableOpacity
            style={styles.backButtonSmall}
            onPress={() => setScreen('signup-account')}
          >
            <Text style={styles.backButtonSmallText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepDot} />
          </View>

          <View style={styles.authHeader}>
            <Text style={styles.authTitle}>How often do you get paid?</Text>
            <Text style={styles.authSubtitle}>This helps us understand your finances</Text>
          </View>

          <View style={styles.optionsContainer}>
            {['weekly', 'biweekly', 'monthly'].map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.optionButton,
                  payFrequency === freq && styles.optionButtonSelected,
                ]}
                onPress={() => setPayFrequency(freq)}
              >
                <Text style={[
                  styles.optionButtonText,
                  payFrequency === freq && styles.optionButtonTextSelected,
                ]}>
                  {freq === 'weekly' ? '📅 Weekly' : freq === 'biweekly' ? '📆 Every 2 weeks' : '🗓️ Monthly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {signupError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{signupError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleSignupStep2}
          >
            <Text style={styles.loginButtonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // SIGNUP SCREEN 3 - Income
  if (screen === 'signup-income') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <TouchableOpacity
            style={styles.backButtonSmall}
            onPress={() => setScreen('signup-pay')}
          >
            <Text style={styles.backButtonSmallText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>

          <View style={styles.authHeader}>
            <Text style={styles.authTitle}>Monthly take-home?</Text>
            <Text style={styles.authSubtitle}>After tax. Helps us score your purchases.</Text>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Monthly income (USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 3500"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
            />
          </View>

          {signupError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{signupError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleSignupStep3}
          >
            <Text style={styles.loginButtonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // SIGNUP SCREEN 4 - Bank Connection
  if (screen === 'signup-bank') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <TouchableOpacity
            style={styles.backButtonSmall}
            onPress={() => setScreen('signup-income')}
          >
            <Text style={styles.backButtonSmallText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.authHeader}>
            <Text style={styles.authTitle}>Connect your bank</Text>
            <Text style={styles.authSubtitle}>Secure & read-only access</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>🏦 Bank credentials are secure</Text>
            <Text style={styles.infoBoxText}>Your login goes directly to your bank, never through Finch</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>🚫 Read-only access</Text>
            <Text style={styles.infoBoxText}>We can only view transactions, never move money</Text>
          </View>

          {signupError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{signupError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => handlePlaidSuccess('public-sandbox-test')}
            disabled={plaidConnecting}
          >            
            <Text style={styles.loginButtonText}>
              {plaidConnecting ? 'Connecting...' : 'Connect bank'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // DASHBOARD SCREEN
  if (screen === 'dashboard' && dashboard) {
    return (
      <View style={styles.container}>
        <View style={styles.dashHeader}>
          <View>
            <Text style={styles.dashGreeting}>Balance</Text>
            <Text style={styles.balanceAmount}>
              ${(dashboard.balance || 0).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setScreen('settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.dashContent} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Spent this month</Text>
              <Text style={styles.statValue}>
                ${dashboard.totalSpentThisMonth || 0}
              </Text>
              <View style={styles.statMeta}>
                <Text style={styles.statMeta}>
                  of ${dashboard.user?.monthly_income || 0}
                </Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Top category</Text>
              <Text style={styles.statValue}>
                {dashboard.topCategory?.name || '—'}
              </Text>
              <Text style={styles.statMeta}>
                {dashboard.topCategory
                  ? `$${dashboard.topCategory.amount}`
                  : 'No data'}
              </Text>
            </View>
          </View>

          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetTitle}>Monthly budget</Text>
              <Text style={styles.budgetPercent}>
                {dashboard.incomeUsedPercent}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(dashboard.incomeUsedPercent, 100)}%`,
                    backgroundColor:
                      dashboard.incomeUsedPercent > 90
                        ? '#ff6b6b'
                        : dashboard.incomeUsedPercent > 70
                        ? '#ffa94d'
                        : '#00d9ff',
                  },
                ]}
              />
            </View>
            <View style={styles.budgetRange}>
              <Text style={styles.budgetRangeText}>$0</Text>
              <Text style={styles.budgetRangeText}>
                ${dashboard.user?.monthly_income || 0}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            {dashboard.recentTransactions?.length > 0 ? (
              dashboard.recentTransactions.slice(0, 5).map((tx, i) => {
                let scoreEmoji = '⚪';
                if (tx.score >= 80) scoreEmoji = '🟢';
                else if (tx.score >= 60) scoreEmoji = '🟡';
                else if (tx.score >= 40) scoreEmoji = '🟠';
                else if (tx.score) scoreEmoji = '🔴';
                
                return (
                  <View key={i} style={styles.transactionItem}>
                    <View style={styles.txLeft}>
                      <Text style={styles.txMerchant}>{tx.merchant}</Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={styles.txScore}>{scoreEmoji} {tx.score || '—'}</Text>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: tx.amount > 0 ? '#ff6b6b' : '#00d9ff' },
                        ]}
                      >
                        {tx.amount > 0 ? '-' : '+'}${Math.abs(tx.amount)}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noData}>No transactions yet</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // SETTINGS SCREEN
  if (screen === 'settings') {
    return (
      <View style={styles.container}>
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => setScreen('dashboard')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
          {updateMessage ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{updateMessage}</Text>
            </View>
          ) : null}

          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>Password</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>New password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#666"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
            <TouchableOpacity style={styles.settingButton} onPress={updatePassword}>
              <Text style={styles.settingButtonText}>Update password</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>Financial info</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Monthly income (USD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 3500"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={settingsIncome}
                onChangeText={setSettingsIncome}
              />
            </View>
            <TouchableOpacity style={styles.settingButton} onPress={updateIncome}>
              <Text style={styles.settingButtonText}>Update income</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleLogout}
          >
            <Text style={styles.dangerButtonText}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  welcomeContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 40,
  },
  authContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  featureEmoji: {
    fontSize: 28,
    width: 40,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#888',
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0a0a0a',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  backButtonSmall: {
    marginBottom: 24,
  },
  backButtonSmallText: {
    fontSize: 16,
    color: '#00d9ff',
    fontWeight: '700',
  },
  authHeader: {
    marginBottom: 32,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2a2a2a',
  },
  stepDotActive: {
    backgroundColor: '#00d9ff',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#2e1a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  loginButtonText: {
    color: '#0a0a0a',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonLoading: {
    opacity: 0.6,
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#1a3a3a',
    borderColor: '#00d9ff',
  },
  optionButtonText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 16,
  },
  optionButtonTextSelected: {
    color: '#00d9ff',
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00d9ff',
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#888',
  },
  dashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  dashGreeting: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#00d9ff',
    letterSpacing: -1,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 24,
  },
  dashContent: {
    flex: 1,
    padding: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statMeta: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  budgetCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  budgetPercent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00d9ff',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 100,
  },
  budgetRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetRangeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  txMerchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  txDate: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
  },
  logoutButton: {
    borderWidth: 2,
    borderColor: '#ff6b6b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  logoutText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '700',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    fontSize: 16,
    color: '#00d9ff',
    fontWeight: '700',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  settingsContent: {
    flex: 1,
    padding: 24,
  },
  messageBox: {
    backgroundColor: '#1a2e22',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#00d9ff',
  },
  messageText: {
    color: '#00d9ff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingSection: {
    marginBottom: 32,
  },
  settingSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingButton: {
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  settingButtonText: {
    color: '#0a0a0a',
    fontWeight: '700',
    fontSize: 15,
  },
  dangerButton: {
    borderWidth: 2,
    borderColor: '#ff6b6b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 40,
  },
  dangerButtonText: {
    color: '#ff6b6b',
    fontWeight: '700',
    fontSize: 16,
  },
  txLeft: {
    flex: 1,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00d9ff',
    marginBottom: 4,
  },
});