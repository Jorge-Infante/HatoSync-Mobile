import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, Text, HelperText, Button, IconButton, Divider, useTheme } from 'react-native-paper'
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

const emptyForm = () => ({ name: '', department: '', city: '', address: '', phone: '', email: '', legal_name: '', tax_id: '' })
const emptyMember = () => ({ full_name: '', email: '', password: '', role: null, phone: '' })
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null))

export default function FarmFormModal({ visible, farm, onDismiss, onSaved }) {
  const theme = useTheme()
  const dispatch = useDispatch()
  const isEdit = !!farm

  const [form, setForm] = useState(emptyForm())
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setForm(
      farm
        ? {
            name: farm.name || '',
            department: farm.department || '',
            city: farm.city || '',
            address: farm.address || '',
            phone: farm.phone || '',
            email: farm.email || '',
            legal_name: farm.legal_name || '',
            tax_id: farm.tax_id || '',
          }
        : emptyForm()
    )
    setMembers([])
    setError('')
  }, [visible, farm])

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setMemberField = (i, key, value) => setMembers((m) => m.map((mem, idx) => (idx === i ? { ...mem, [key]: value } : mem)))

  async function submit() {
    if (!form.name.trim() || !form.department.trim() || !form.city.trim() || !form.address.trim() || !form.phone.trim()) {
      return setError('Nombre, departamento, ciudad, dirección y teléfono son requeridos')
    }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await dispatch(updateItem({ module: 'farms', nameState: 'farms', url: `/farms/${farm.id}/`, data: form }))
      } else {
        const data = clean(form)
        if (members.length) data.members = members.map(clean)
        await dispatch(createItem({ module: 'farms', nameState: 'farms', url: '/farms/setup/', data }))
      }
      onSaved && onSaved({ isEdit })
      onDismiss()
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar la finca'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      visible={visible}
      onDismiss={onDismiss}
      title={isEdit ? 'Editar finca' : 'Nueva finca'}
      icon={isEdit ? 'pencil-outline' : 'plus'}
      onSubmit={submit}
      submitLabel={isEdit ? 'Guardar cambios' : 'Crear finca'}
      loading={saving}
    >
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}

      <Text variant="labelLarge" style={styles.section}>
        Datos de la finca
      </Text>
      <TextInput mode="outlined" label="Nombre *" value={form.name} onChangeText={(v) => setField('name', v)} style={styles.field} />
      <TextInput mode="outlined" label="Departamento *" value={form.department} onChangeText={(v) => setField('department', v)} style={styles.field} />
      <TextInput mode="outlined" label="Ciudad *" value={form.city} onChangeText={(v) => setField('city', v)} style={styles.field} />
      <TextInput mode="outlined" label="Dirección *" value={form.address} onChangeText={(v) => setField('address', v)} style={styles.field} />
      <TextInput mode="outlined" label="Teléfono *" value={form.phone} onChangeText={(v) => setField('phone', v)} keyboardType="phone-pad" style={styles.field} />
      <TextInput mode="outlined" label="Correo (opcional)" value={form.email} onChangeText={(v) => setField('email', v)} keyboardType="email-address" autoCapitalize="none" style={styles.field} />
      <TextInput mode="outlined" label="Razón social (opcional)" value={form.legal_name} onChangeText={(v) => setField('legal_name', v)} style={styles.field} />
      <TextInput mode="outlined" label="NIT (opcional)" value={form.tax_id} onChangeText={(v) => setField('tax_id', v)} style={styles.field} />

      {!isEdit ? (
        <>
          <Divider style={styles.divider} />
          <Text variant="labelLarge" style={styles.section}>
            Miembros (opcional)
          </Text>
          <Text variant="bodySmall" style={styles.hint}>
            Tú quedarás como propietario automáticamente. Cada miembro se crea como usuario nuevo.
          </Text>
          {members.map((member, i) => (
            <View key={i} style={[styles.memberCard, { borderColor: theme.colors.outline }]}>
              <View style={styles.memberHeader}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                  Miembro {i + 1}
                </Text>
                <IconButton icon="close" size={18} onPress={() => setMembers((m) => m.filter((_, idx) => idx !== i))} />
              </View>
              <TextInput mode="outlined" label="Nombre completo *" value={member.full_name} onChangeText={(v) => setMemberField(i, 'full_name', v)} style={styles.field} />
              <TextInput mode="outlined" label="Correo *" value={member.email} onChangeText={(v) => setMemberField(i, 'email', v)} keyboardType="email-address" autoCapitalize="none" style={styles.field} />
              <TextInput mode="outlined" label="Contraseña *" value={member.password} onChangeText={(v) => setMemberField(i, 'password', v)} secureTextEntry style={styles.field} />
              <PickerField label="Rol *" value={member.role} options={ROLES} onChange={(v) => setMemberField(i, 'role', v)} style={styles.field} />
              <TextInput mode="outlined" label="Teléfono (opcional)" value={member.phone} onChangeText={(v) => setMemberField(i, 'phone', v)} keyboardType="phone-pad" style={styles.field} />
            </View>
          ))}
          <Button mode="contained-tonal" icon="account-plus-outline" onPress={() => setMembers((m) => [...m, emptyMember()])}>
            Agregar miembro
          </Button>
        </>
      ) : null}
    </FormModal>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: 10, fontWeight: '600' },
  field: { marginBottom: 12 },
  divider: { marginVertical: 12 },
  hint: { opacity: 0.7, marginBottom: 12 },
  memberCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
