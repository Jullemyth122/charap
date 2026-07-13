import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ElevenlabsService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  constructor() {}

  /**
   * Starts recording audio from the user's microphone.
   * Calls the onVisualizerData callback with frequency byte data for rendering a waveform.
   */
  async startRecording(onVisualizerData?: (data: Uint8Array) => void): Promise<void> {
    this.audioChunks = [];
    
    // Request microphone access
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Setup MediaRecorder
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/ogg';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/mp4';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = ''; // fallback to default
    }

    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Setup Web Audio API for visualizer
    if (onVisualizerData) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        onVisualizerData(dataArray);
        this.animationFrameId = requestAnimationFrame(draw);
      };
      
      draw();
    }

    this.mediaRecorder.start(100); // chunk every 100ms
  }

  /**
   * Stops recording, releases the microphone, and transcribes the audio using ElevenLabs Scribe REST API.
   */
  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        // Clean up visualizer resources
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        if (this.audioContext) {
          this.audioContext.close();
          this.audioContext = null;
        }
        this.analyser = null;

        // Stop all media stream tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        // Combine chunks into a single audio Blob
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        try {
          console.log(`Transcribing audio blob of size ${audioBlob.size} bytes using ElevenLabs Speech-to-Text REST API...`);
          const text = await this.transcribeDirect(audioBlob);
          resolve(text);
        } catch (error: any) {
          console.error('Error during ElevenLabs Speech-to-Text transcription:', error);
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Directly calls the ElevenLabs Speech-to-Text REST API.
   * This avoids importing Node.js-specific modules found in the ElevenLabs SDK,
   * guaranteeing absolute compatibility with Angular's browser bundler.
   */
  private async transcribeDirect(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model_id', 'scribe_v2');
    formData.append('tag_audio_events', 'true');

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': environment.elevenlabsApiKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs STT error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.text || '';
  }
}
