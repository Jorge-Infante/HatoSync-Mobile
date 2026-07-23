import React, { useState } from 'react'
import { Menu, IconButton, Divider } from 'react-native-paper'

/**
 * Per-animal actions menu (the RN mirror of AnimalActionsMenu.vue).
 * Reproduction actions show only for females; "Destetar" is disabled without a
 * calf at side.
 */
export default function AnimalActionsMenu({ animal, onDetail, onEdit, onDelete, onBirth, onWean, onEvents, onGenealogy, onWeight, onTreatment, onInactivate }) {
  const [visible, setVisible] = useState(false)
  const isFemale = animal.sex === 'FEMALE'
  const hasCalf = Boolean(animal.reproduction && animal.reproduction.calf_at_side)
  const canExit = animal.is_active !== false && !animal.is_external

  const close = () => setVisible(false)
  const run = (fn) => () => {
    close()
    fn && fn(animal)
  }

  return (
    <Menu
      visible={visible}
      onDismiss={close}
      anchor={<IconButton icon="dots-vertical" size={20} onPress={() => setVisible(true)} />}
    >
      <Menu.Item leadingIcon="card-account-details-outline" title="Ver detalle" onPress={run(onDetail)} />
      <Divider />
      {isFemale ? (
        <>
          <Menu.Item leadingIcon="baby-bottle-outline" title="Registrar parto" onPress={run(onBirth)} />
          <Menu.Item leadingIcon="link-variant-off" title="Destetar cría" disabled={!hasCalf} onPress={run(onWean)} />
          <Menu.Item leadingIcon="history" title="Historial y eventos" onPress={run(onEvents)} />
          <Divider />
        </>
      ) : null}
      <Menu.Item leadingIcon="medical-bag" title="Nuevo tratamiento" onPress={run(onTreatment)} />
      <Menu.Item leadingIcon="scale" title="Registrar peso" onPress={run(onWeight)} />
      <Menu.Item leadingIcon="family-tree" title="Genealogía" onPress={run(onGenealogy)} />
      <Menu.Item leadingIcon="pencil-outline" title="Editar" onPress={run(onEdit)} />
      {canExit ? (
        // Salida con causa (muerte, venta…): conserva el historial — lo normal.
        // "Eliminar" borra el registro por completo (errores de captura).
        <Menu.Item leadingIcon="logout-variant" title="Sacar del hato" onPress={run(onInactivate)} />
      ) : null}
      <Menu.Item leadingIcon="delete-outline" title="Eliminar" onPress={run(onDelete)} titleStyle={{ color: '#B3402F' }} />
    </Menu>
  )
}
