import React, { useState, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { TextInput, HelperText, Checkbox, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import FormModal from '@/modules/shared/components/FormModal'
import PickerField from '@/modules/shared/components/PickerField'
import { createItem, updateItem } from '@/modules/shared/store/sharedThunks'
import { getErrorMessage } from '@/api/errors'

const ROLES = [
  { label: 'Administrador', value: 'ADMIN' },
  { label: 'Empleado', value: 'EMPLOYEE' },
  { label: 'Socio', value: 'PARTNER' },
]

const EMAIL_RE = /.+@.+\..+/

/**
 * Add a member — by default creating their user (full_name, email, phone,
 * password); the "Usuario existente" checkbox switches to picking a user from
 * the user's other farms instead — or edit a member: their user data + role
 * (password optional to reset it).
 */
export default function MemberFormModal({ visible, member, candidates = [], onDismiss, onSaved }) {
  const dispatch = useDispatch()
  const isEdit = !!member

  const [existingUser, setExistingUser] = useState(false)
  const [userId, setUserId] = useState(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setExistingUser(false)
      setUserId(null)
      setFullName(member ? member.user.full_name : '')
      setEmail(member ? member.user.email : '')
      setPhone(member ? member.user.phone || '' : '')
      setPassword('')
      setRole(member ? member.role : null)
      setError('')
    }
  }, [visible, member])

  function validate() {
    if (!isEdit && existingUser) {
      if (!userId) return 'Selecciona un usuario'
    } else {
      if (!fullName.trim()) return 'El nombre es requerido'
      if (!EMAIL_RE.test(email.trim())) return 'Correo inválido'
      if (!isEdit && password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres'
      if (isEdit && password && password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres'
    }
    if (!role) return 'Selecciona un rol'
    return ''
  }

  function buildPayload() {
    if (isEdit) {
      const data = { full_name: fullName.trim(), email: email.trim(), phone: phone.trim(), role }
      if (password) data.password = password
      return data
    }
    if (existingUser) return { user_id: userId, role }
    return { email: email.trim(), full_name: fullName.trim(), phone: phone.trim(), password, role }
  }

  async function submit() {
    const problem = validate()
    if (problem) return setError(problem)
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await dispatch(updateItem({ module: 'farms', nameState: 'members', url: `/farms/members/${member.id}/`, data: buildPayload() }))
      } else {
        await dispatch(createItem({ module: 'farms', nameState: 'members', url: '/farms/members/', data: buildPayload() }))
      }
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el miembro'))
    } finally {
      setSaving(false)
    }
  }

  const showUserFields = isEdit || !existingUser

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar miembro' : 'Agregar miembro'}
      icon={isEdit ? 'account-edit-outline' : 'account-plus-outline'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar' : 'Agregar'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      {!showUserFields ? (
        <PickerField
          label="Usuario *"
          value={userId}
          options={candidates.map((c) => ({ label: c.label, value: c.id }))}
          onChange={setUserId}
          searchable
          noDataText="No hay usuarios disponibles en tus otras fincas"
          helperText="Solo usuarios que ya pertenecen a alguna de tus fincas"
          style={styles.field}
        />
      ) : (
        <>
          <TextInput mode="outlined" label="Nombre completo *" value={fullName} onChangeText={setFullName} style={styles.field} />
          <TextInput
            mode="outlined"
            label="Correo electrónico *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.field}
          />
          <TextInput mode="outlined" label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.field} />
          <TextInput
            mode="outlined"
            label={isEdit ? 'Nueva contraseña' : 'Contraseña *'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={isEdit ? null : styles.field}
          />
          {isEdit ? (
            <Text variant="bodySmall" style={styles.hint}>
              Déjala en blanco para no cambiarla
            </Text>
          ) : null}
        </>
      )}

      <PickerField label="Rol *" value={role} options={ROLES} onChange={setRole} style={styles.field} />

      {!isEdit ? (
        <Checkbox.Item
          label="Usuario existente"
          status={existingUser ? 'checked' : 'unchecked'}
          onPress={() => setExistingUser((v) => !v)}
          position="leading"
          labelVariant="bodyMedium"
          style={styles.checkbox}
        />
      ) : null}
    </FormModal>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  hint: { opacity: 0.7, marginBottom: 12, marginTop: 4 },
  checkbox: { paddingHorizontal: 0 },
})
