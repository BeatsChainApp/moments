import { supabase } from '../config/supabase.js';
import { getMedia, downloadMedia } from '../config/whatsapp.js';
import { v4 as uuidv4 } from 'uuid';

export const processMedia = async (messageId, mediaId, mediaType) => {
  try {
    // Get media URL from WhatsApp
    const mediaInfo = await getMedia(mediaId);
    const mediaStream = await downloadMedia(mediaInfo.url);
    
    // Determine bucket based on media type
    const bucketMap = {
      'image': 'images',
      'audio': 'audio', 
      'video': 'videos',
      'document': 'documents'
    };
    
    const bucket = bucketMap[mediaType] || 'documents';
    const fileName = `${uuidv4()}.${getFileExtension(mediaInfo.mime_type)}`;
    const filePath = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, mediaStream, {
        contentType: mediaInfo.mime_type,
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // Store media metadata
    const { data: mediaRecord, error: dbError } = await supabase
      .from('media')
      .insert({
        message_id: messageId,
        whatsapp_media_id: mediaId,
        media_type: mediaType,
        original_url: mediaInfo.url,
        storage_path: filePath,
        file_size: mediaInfo.file_size,
        mime_type: mediaInfo.mime_type
      })
      .select()
      .single();
    
    if (dbError) throw dbError;
    
    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return {
      mediaRecord,
      publicUrl: publicUrl.publicUrl,
      bucket,
      filePath
    };
    
  } catch (error) {
    console.error('Media processing error:', error);
    
    // Log failure but don't block message processing
    await supabase.from('flags').insert({
      message_id: messageId,
      flag_type: 'media_processing_failed',
      severity: 'medium',
      action_taken: 'logged',
      notes: error.message
    });
    
    return null;
  }
};

const getFileExtension = (mimeType) => {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'application/pdf': 'pdf'
  };
  return extensions[mimeType] || 'bin';
};