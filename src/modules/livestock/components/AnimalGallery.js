import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native'
import { Portal, Modal, IconButton, Text, useTheme } from 'react-native-paper'
// expo-image: caché en disco + decodificación al tamaño de la vista — las fotos
// del backend cargan una sola vez por URL y luego salen del caché al instante.
import { Image } from 'expo-image'
import { mediaSource } from '@/utils/format'

/**
 * Animal photo gallery: main image + thumbnail strip + tap-to-zoom lightbox.
 * Mirrors AnimalGallery.vue. photos: [{id, image, caption}].
 */
export default function AnimalGallery({ photos = [], fallbackIcon = 'cow' }) {
  const theme = useTheme()
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const items = (photos || []).map((p) => ({ key: p.id, caption: p.caption, source: mediaSource(p.image) }))

  if (!items.length) {
    return (
      <View style={[styles.empty, { borderColor: theme.colors.outline }]}>
        <IconButton icon={fallbackIcon} size={46} iconColor={theme.colors.primary} />
        <Text variant="bodySmall" style={{ color: theme.hs.palette.muted }}>
          Sin fotos todavía
        </Text>
      </View>
    )
  }

  const current = items[active]

  return (
    <View>
      <Pressable onPress={() => setLightbox(true)} style={[styles.main, { borderColor: theme.colors.outline }]}>
        <Image source={current.source} style={styles.mainImg} contentFit="cover" transition={150} />
      </Pressable>

      {items.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs}>
          {items.map((item, i) => (
            <Pressable
              key={item.key}
              onPress={() => setActive(i)}
              style={[styles.thumb, i === active && { borderColor: theme.colors.primary }]}
            >
              <Image source={item.source} style={styles.thumbImg} contentFit="cover" transition={100} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Portal>
        <Modal visible={lightbox} onDismiss={() => setLightbox(false)} contentContainerStyle={styles.lightbox}>
          <IconButton icon="close" iconColor="#fff" style={styles.lbClose} onPress={() => setLightbox(false)} />
          <Image source={current.source} style={styles.lbImg} contentFit="contain" transition={150} />
          <View style={styles.lbBar}>
            <Text style={styles.lbCaption}>{current.caption || ''}</Text>
            <Text style={styles.lbCount}>
              {active + 1} / {items.length}
            </Text>
          </View>
          {items.length > 1 ? (
            <View style={styles.lbNav}>
              <IconButton
                icon="chevron-left"
                iconColor="#fff"
                size={32}
                onPress={() => setActive((active - 1 + items.length) % items.length)}
              />
              <IconButton
                icon="chevron-right"
                iconColor="#fff"
                size={32}
                onPress={() => setActive((active + 1) % items.length)}
              />
            </View>
          ) : null}
        </Modal>
      </Portal>
    </View>
  )
}

const W = Dimensions.get('window').width

const styles = StyleSheet.create({
  main: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  mainImg: { width: '100%', aspectRatio: 4 / 3, backgroundColor: 'rgba(46,125,50,0.04)' },
  thumbs: { marginTop: 10 },
  thumb: { width: 62, height: 62, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', marginRight: 8, opacity: 0.85 },
  thumbImg: { width: '100%', height: '100%' },
  empty: {
    aspectRatio: 4 / 3,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46,125,50,0.03)',
  },
  lightbox: { flex: 1, backgroundColor: 'rgba(15,20,16,0.96)', justifyContent: 'center' },
  lbClose: { position: 'absolute', top: 30, right: 8, zIndex: 2 },
  lbImg: { width: W, height: '70%' },
  lbBar: { position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  lbCaption: { color: '#fff', flex: 1 },
  lbCount: { color: '#fff', opacity: 0.8 },
  lbNav: { position: 'absolute', top: '48%', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
})
