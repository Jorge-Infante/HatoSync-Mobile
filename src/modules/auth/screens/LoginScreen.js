import React, { useState, useRef } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { Text, TextInput, Button, HelperText, useTheme } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'
import { login } from '@/modules/auth/store/authSlice'
import { getErrorMessage } from '@/api/errors'

export default function LoginScreen() {
  const theme = useTheme()
  const dispatch = useDispatch()
  const scrollRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading

  async function onSubmit() {
    setError('')
    setLoading(true)
    try {
      await dispatch(login({ email: email.trim(), password }))
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo iniciar sesión'))
    } finally {
      setLoading(false)
    }
  }

  // Bring the lower fields above the keyboard on focus (reliable on Android)
  function scrollDown() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={[styles.stamp, { borderColor: theme.colors.primary }]}>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                HS
              </Text>
            </View>
            <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.secondary }]}>
              HatoSync
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.hs.palette.muted }}>
              Gestión ganadera de campo
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              left={<TextInput.Icon icon="email-outline" />}
            />
            <TextInput
              mode="outlined"
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.field}
              onFocus={scrollDown}
              returnKeyType="go"
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowPassword((v) => !v)}
                />
              }
              onSubmitEditing={canSubmit ? onSubmit : undefined}
            />

            {error ? (
              <HelperText type="error" visible style={styles.error}>
                {error}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={onSubmit}
              loading={loading}
              disabled={!canSubmit}
              style={styles.submit}
              contentStyle={styles.submitContent}
            >
              Entrar
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 },
  brand: { alignItems: 'center', marginBottom: 40 },
  stamp: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontWeight: '700', marginBottom: 2 },
  form: { width: '100%' },
  field: { marginTop: 14 },
  error: { marginTop: 4 },
  submit: { marginTop: 20, borderRadius: 12 },
  submitContent: { paddingVertical: 6 },
})
