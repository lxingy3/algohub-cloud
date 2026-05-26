import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Shield, Send, Type, Mic, Video, Play, Pause, Trash2, Copy, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { getAlgorithms, addStory } from "@/lib/localData";
import { algorithmsData } from "../components/data/algorithmsData";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatStoryId(id) {
  const short = id.split('-').pop()?.slice(0, 6).toUpperCase() || id.slice(-6).toUpperCase();
  return `#STG-${short}`;
}

const initialFormData = {
  name: '',
  city: '',
  zipCode: '',
  referralSource: '',
  algorithmId: '',
  storyType: 'text',
  storyNarrative: '',
  storyVoiceBlob: null,
  storyVideoBlob: null,
  publicPosting: false,
  acknowledgment: false
};

export default function ShareStory() {
  const [formData, setFormData] = useState(initialFormData);

  const [submittedStoryId, setSubmittedStoryId] = useState(null);
  const [recordingState, setRecordingState] = useState({ audio: 'idle', video: 'idle' });
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const algorithms = getAlgorithms(algorithmsData);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [audioUrl, videoUrl]);

  useEffect(() => {
    if (recordingState.video === 'recording' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [recordingState.video]);

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStartAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setFormData(prev => ({ ...prev, storyVoiceBlob: blob }));
        setAudioUrl(URL.createObjectURL(blob));
      };

      recorder.start();
      setRecordingState(s => ({ ...s, audio: 'recording' }));
      startTimer();
    } catch (err) {
      toast.error('Could not access microphone');
      console.error(err);
    }
  };

  const handleStopAudioRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingState(s => ({ ...s, audio: 'stopped' }));
      stopTimer();
    }
  };

  const handleStartVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        const blob = new Blob(chunks, { type: 'video/webm' });
        setFormData(prev => ({ ...prev, storyVideoBlob: blob }));
        setVideoUrl(URL.createObjectURL(blob));
      };

      recorder.start();
      setRecordingState(s => ({ ...s, video: 'recording' }));
      startTimer();
    } catch (err) {
      toast.error('Could not access camera');
      console.error(err);
    }
  };

  const handleStopVideoRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingState(s => ({ ...s, video: 'stopped' }));
      stopTimer();
    }
  };

  const handleDeleteAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setFormData(prev => ({ ...prev, storyVoiceBlob: null }));
    setRecordingState(s => ({ ...s, audio: 'idle' }));
  };

  const handleDeleteVideo = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setFormData(prev => ({ ...prev, storyVideoBlob: null }));
    setRecordingState(s => ({ ...s, video: 'idle' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.city?.trim()) {
      toast.error('Please enter your city');
      return;
    }

    if (!formData.acknowledgment) {
      toast.error('Please acknowledge that a reviewer may follow up');
      return;
    }

    const hasStoryContent =
      (formData.storyType === 'text' && formData.storyNarrative.trim()) ||
      (formData.storyType === 'voice' && formData.storyVoiceBlob) ||
      (formData.storyType === 'video' && formData.storyVideoBlob);

    if (!hasStoryContent) {
      toast.error('Please add your story (text, voice recording, or video)');
      return;
    }

    const resolvedCity = formData.city.trim();
    const algorithm = algorithms.find((a) => a.id === formData.algorithmId);
    const useCase = algorithm?.use_case || 'Other';

    let title = 'Community Story';
    let summary = '';
    let content = '';

    if (formData.storyType === 'text') {
      const text = formData.storyNarrative.trim();
      title = text.length > 50 ? `${text.slice(0, 47)}...` : text || title;
      summary = text.length > 150 ? `${text.slice(0, 147)}...` : text;
      content = text;
    } else if (formData.storyType === 'voice') {
      title = 'Voice Story';
      summary = 'A community member shared their experience via voice recording.';
      content = '*[Audio recording submitted]*\n\nA community member shared their experience about this algorithm via voice.';
    } else {
      title = 'Video Story';
      summary = 'A community member shared their experience via video recording.';
      content = '*[Video recording submitted]*\n\nA community member shared their experience about this algorithm via video.';
    }

    if (formData.name?.trim()) {
      title = `${formData.name.trim()}'s Story`;
    }

    const storyData = {
      title,
      summary,
      content,
      city: resolvedCity,
      use_case: useCase,
      page_type: 'Stories',
      author_name: formData.name || 'Anonymous',
      algorithm_id: formData.algorithmId,
      referral_source: formData.referralSource,
      zip_code: formData.zipCode,
      public_posting: formData.publicPosting,
      story_type: formData.storyType
    };

    const newStory = addStory(storyData);
    handleDeleteAudio();
    handleDeleteVideo();
    setFormData({
      name: '',
      city: '',
      zipCode: '',
      referralSource: '',
      algorithmId: '',
      storyType: 'text',
      storyNarrative: '',
      storyVoiceBlob: null,
      storyVideoBlob: null,
      publicPosting: false,
      acknowledgment: false
    });
    setSubmittedStoryId(newStory.id);
  };

  const handleCopyId = () => {
    const displayId = formatStoryId(submittedStoryId);
    navigator.clipboard.writeText(displayId).then(() => {
      toast.success('Story ID copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const handleSubmitAnother = () => {
    setSubmittedStoryId(null);
    setFormData(initialFormData);
    setRecordingState({ audio: 'idle', video: 'idle' });
    setRecordingTime(0);
    setAudioUrl(null);
    setVideoUrl(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { id: 'text', label: 'Text', icon: Type },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'video', label: 'Video', icon: Video }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100">
      <section className="relative overflow-hidden bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a] border-b border-white/15">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Share Your Story</h1>
          <p className="text-yellow-100/80">
            Help us understand how algorithms affect people in public services.
          </p>
        </div>
      </section>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {submittedStoryId ? (
          /* Confirmation Card */
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Thank you for sharing your story with us!
            </h2>
            <p className="text-gray-600 mb-6">
              Story ID: <span className="font-mono font-semibold text-gray-900">{formatStoryId(submittedStoryId)}</span>
            </p>
            <div className="text-left bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
              <p className="font-medium text-gray-900 mb-3">To follow up on your story, contact:</p>
              <ul className="space-y-2 text-gray-700">
                <li>• [Partner Organization] - (412) XXX-XXXX</li>
                <li>• stories@yoursite.org</li>
              </ul>
              <p className="text-sm text-gray-600 mt-4">
                Have your Story ID ready when you reach out.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleCopyId}
                className="flex items-center justify-center gap-2 border-gray-300"
              >
                <Copy className="w-4 h-4" />
                Copy ID
              </Button>
              <Button
                onClick={handleSubmitAnother}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Submit Another Story
              </Button>
            </div>
          </div>
        ) : (
          <>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-8">
          {/* 1. What Happened */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 pb-2 border-b border-gray-200">
              What Happened?
            </h2>
            <div>
              <Label htmlFor="algorithmId">Select an algorithm related to your experience</Label>
              <Select
                value={formData.algorithmId}
                onValueChange={(value) => handleChange('algorithmId', value)}
              >
                <SelectTrigger className="!border-gray-200 focus:!border-gray-300 focus:!ring-1 focus:!ring-gray-300/70">
                  <SelectValue placeholder="Select an algorithm from the list" />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((algo) => (
                    <SelectItem key={algo.id} value={algo.id}>
                      {algo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 2. Tell us your story */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 pb-2 border-b border-gray-200">
              Tell us your story
            </h2>
            <div>
              <Label>Share your experience</Label>
              <div className="mt-2">
                <div className="flex gap-2 border-b border-gray-200 mb-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleChange('storyType', tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        formData.storyType === tab.id
                          ? 'border-amber-600 text-amber-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Text */}
                {formData.storyType === 'text' && (
                  <Textarea
                    value={formData.storyNarrative}
                    onChange={(e) => handleChange('storyNarrative', e.target.value)}
                    placeholder="Please share the details of your experience..."
                    rows={8}
                    className="resize-none"
                  />
                )}

                {/* Tab 2: Voice */}
                {formData.storyType === 'voice' && (
                  <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                    {recordingState.audio === 'idle' && !audioUrl && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Button
                          type="button"
                          size="lg"
                          onClick={handleStartAudioRecording}
                          className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 text-lg"
                        >
                          <Mic className="w-6 h-6 mr-2" />
                          Start Recording
                        </Button>
                      </div>
                    )}

                    {recordingState.audio === 'recording' && (
                      <div className="flex flex-col items-center gap-4 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</span>
                        </div>
                        <div className="flex gap-1 h-12 items-end">
                          {[...Array(12)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-yellow-500 rounded animate-pulse"
                              style={{
                                height: `${20 + Math.random() * 80}%`,
                                animationDelay: `${i * 0.05}s`
                              }}
                            />
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleStopAudioRecording}
                        >
                          Stop Recording
                        </Button>
                      </div>
                    )}

                    {audioUrl && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
                          <audio ref={audioRef} src={audioUrl} controls className="flex-1" />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => audioRef.current?.play()}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => audioRef.current?.pause()}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={handleDeleteAudio}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete & Re-record
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Video */}
                {formData.storyType === 'video' && (
                  <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                    {recordingState.video === 'idle' && !videoUrl && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Button
                          type="button"
                          size="lg"
                          onClick={handleStartVideoRecording}
                          className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 text-lg"
                        >
                          <Video className="w-6 h-6 mr-2" />
                          Start Recording
                        </Button>
                      </div>
                    )}

                    {recordingState.video === 'recording' && (
                      <div className="flex flex-col items-center gap-4 py-6">
                        <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 text-white px-3 py-1 rounded">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="font-mono font-bold">{formatTime(recordingTime)}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleStopVideoRecording}
                        >
                          Stop Recording
                        </Button>
                      </div>
                    )}

                    {videoUrl && (
                      <div className="space-y-4">
                        <div className="rounded-lg overflow-hidden border bg-black">
                          <video ref={videoRef} src={videoUrl} controls className="w-full" />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => videoRef.current?.play()}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={handleDeleteVideo}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete & Re-record
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. About You */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 pb-2 border-b border-gray-200">
              About You
            </h2>
            <div>
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="city">City <span className="text-red-500">(Required)</span></Label>
              <Input
                id="city"
                required
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="e.g. Pittsburgh, Philadelphia"
              />
            </div>
            <div>
              <Label htmlFor="zipCode">Zip Code (Optional)</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
                placeholder="15201"
                maxLength={5}
              />
            </div>
          </div>

          {/* 4. How did you hear about us */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 pb-2 border-b border-gray-200">
              How did you hear about us?
            </h2>
            <div>
              <Label htmlFor="referralSource">Organization or referral source</Label>
              <Input
                id="referralSource"
                value={formData.referralSource}
                onChange={(e) => handleChange('referralSource', e.target.value)}
                placeholder="Organization name or how you found us"
              />
            </div>
          </div>

          {/* 5. Consent & Privacy */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Shield className="w-5 h-5 text-amber-700" />
              <h2 className="text-xl font-semibold text-gray-900">Consent & Privacy</h2>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex-1">
                  <Label htmlFor="publicPosting" className="text-base font-medium">
                    Can this story be shared publicly?
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Note: All identifying details will be removed before posting
                  </p>
                </div>
                <Switch
                  id="publicPosting"
                  checked={formData.publicPosting}
                  onCheckedChange={(checked) => handleChange('publicPosting', checked)}
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledgment"
                checked={formData.acknowledgment}
                onCheckedChange={(checked) => handleChange('acknowledgment', checked)}
                className="mt-1"
              />
              <Label htmlFor="acknowledgment" className="text-sm cursor-pointer">
                I understand and agree that a community reviewer may follow up with me regarding this story *
              </Label>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              size="lg"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900"
            >
              <Send className="w-4 h-4 mr-2" />
              Share Your Story
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Your privacy is important to us. We will handle your information with care.</p>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
