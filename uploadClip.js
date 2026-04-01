import { supabase } from './supabase';

export async function uploadClip({ uri, userId, clipNumber, label, script }) {
  // 1. Create a unique filename
  const fileName = `${userId}/clip${clipNumber}_${Date.now()}.mp4`;

  // 2. Read the file and upload to Supabase Storage
  const response = await fetch(uri);
  const blob = await response.blob();

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('clips')
    .upload(fileName, blob, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (uploadError) {
    console.log('Upload error:', uploadError);
    throw new Error('Failed to upload video: ' + uploadError.message);
  }

  // 3. Get the public URL for the uploaded video
  const { data: urlData } = supabase.storage
    .from('clips')
    .getPublicUrl(fileName);

  const videoUrl = urlData.publicUrl;

  // 4. Save clip info to the database
  const { error: dbError } = await supabase
    .from('clips')
    .upsert({
      user_id: userId,
      clip_number: clipNumber,
      label: label,
      script: script,
      video_url: videoUrl,
    }, {
      onConflict: 'user_id,clip_number',
    });

  if (dbError) {
    console.log('Database error:', dbError);
    throw new Error('Failed to save clip info: ' + dbError.message);
  }

  return videoUrl;
}