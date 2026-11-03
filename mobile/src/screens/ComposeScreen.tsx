import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { LocalImage } from '../types/report';
import { takePhoto, pickImagesFromGallery } from '../core/images/picker';
import { uploadQueueManager } from '../core/queue/UploadQueueManager';

interface Props {
  onReportQueued: () => void;
}

export const ComposeScreen: React.FC<Props> = ({ onReportQueued }) => {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<LocalImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTakePhoto = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 images allowed per report.');
      return;
    }
    const photo = await takePhoto();
    if (photo) {
      setImages((prev) => [...prev, photo].slice(0, 5));
    }
  };

  const handlePickGallery = async () => {
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      Alert.alert('Limit Reached', 'Maximum 5 images allowed per report.');
      return;
    }
    const picked = await pickImagesFromGallery(remaining);
    if (picked.length > 0) {
      setImages((prev) => [...prev, ...picked].slice(0, 5));
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      Alert.alert('Description Required', 'Please enter a description for this report.');
      return;
    }
    if (images.length < 1) {
      Alert.alert('Photo Required', 'Please attach at least 1 photo (maximum 5).');
      return;
    }
    if (images.length > 5) {
      Alert.alert('Too Many Photos', 'A report cannot exceed 5 photos.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Enqueue immediately to persistent disk
      await uploadQueueManager.enqueue(trimmed, images);

      // Clear form so inspector can start next report immediately
      setDescription('');
      setImages([]);

      Alert.alert(
        'Report Saved to Queue',
        'Your report is securely stored on disk and will upload automatically, even if the connection drops or app is closed.',
        [{ text: 'View Queue', onPress: onReportQueued }]
      );
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Could not queue report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Field Report</Text>
      <Text style={styles.subtitle}>Compose inspector notes and 1–5 site photographs.</Text>

      {/* Description Field */}
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.requiredBadge}>Required</Text>
        </View>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          placeholder="Enter detailed observations, defects, or inspection notes..."
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
        />
        <Text style={styles.charCount}>{description.length} characters</Text>
      </View>

      {/* Images Section */}
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Photographs (1–5)</Text>
          <Text style={styles.counterBadge}>{images.length} / 5</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, images.length >= 5 && styles.disabledButton]}
            onPress={handleTakePhoto}
            disabled={images.length >= 5}
          >
            <Text style={styles.actionButtonText}>📷 Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton, images.length >= 5 && styles.disabledButton]}
            onPress={handlePickGallery}
            disabled={images.length >= 5}
          >
            <Text style={styles.actionButtonText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Thumbnail Preview Grid */}
        <View style={styles.imageGrid}>
          {images.map((img, idx) => (
            <View key={img.id || idx} style={styles.imageCard}>
              <Image source={{ uri: img.uri }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveImage(img.id)}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.fileSizeText}>
                {img.fileSize > 0
                  ? `${(img.fileSize / (1024 * 1024)).toFixed(1)} MB`
                  : 'Photo'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!description.trim() || images.length === 0 || isSubmitting) && styles.disabledSubmit,
        ]}
        onPress={handleSubmit}
        disabled={!description.trim() || images.length === 0 || isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Saving to Queue...' : 'Save & Queue Report'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  requiredBadge: { fontSize: 11, fontWeight: '700', color: '#DC2626', textTransform: 'uppercase' },
  counterBadge: { fontSize: 12, fontWeight: '600', color: '#475569' },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'right' },
  buttonRow: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  actionButton: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  galleryButton: { backgroundColor: '#475569' },
  actionButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  disabledButton: { opacity: 0.5 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  imageCard: { position: 'relative', width: 90, height: 90, borderRadius: 8, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%', backgroundColor: '#E2E8F0' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  fileSizeText: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#FFFFFF',
    fontSize: 9,
    textAlign: 'center',
    borderRadius: 4,
  },
  submitButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledSubmit: { backgroundColor: '#94A3B8' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

