import { NextRequest, NextResponse } from "next/server";

interface Voice {
  id: string;
  name: string;
  description: string;
}

interface GenerateVoiceRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

interface GenerateVoiceResponse {
  audioUrl: string;
  duration: number;
  voiceId: string;
  status: string;
  message: string;
}

interface VoicesResponse {
  voices: Voice[];
  status: string;
}

const AVAILABLE_VOICES: Voice[] = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    description: "Calm, clear female voice",
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    description: "Strong, confident female voice",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    description: "Soft, warm female voice",
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    description: "Well-rounded male voice",
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    description: "Emotional young female voice",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    description: "Deep, authoritative male voice",
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    description: "Crisp, American male voice",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    description: "Deep, narrative male voice",
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    description: "Raspy, authentic male voice",
  },
];

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL_ID = "eleven_monolingual_v1";
const DEFAULT_STABILITY = 0.5;
const DEFAULT_SIMILARITY_BOOST = 0.75;

function estimateDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const wordsPerMinute = 150;
  return Math.ceil((wordCount / wordsPerMinute) * 60);
}

async function generateVoiceWithAPI(
  text: string,
  voiceId: string,
  modelId: string,
  stability: number,
  similarityBoost: number
): Promise<GenerateVoiceResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    const estimatedDuration = estimateDuration(text);
    return {
      audioUrl: "/placeholder-audio.mp3",
      duration: estimatedDuration,
      voiceId: "placeholder",
      status: "simulated",
      message:
        "ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to .env.local",
    };
  }

  const requestBody = {
    text,
    model_id: modelId,
    voice_settings: {
      stability,
      similarity_boost: similarityBoost,
    },
  };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ElevenLabs API error: ${response.status} - ${errorText}`
    );
  }

  await response.arrayBuffer();

  const estimatedDuration = estimateDuration(text);

  return {
    audioUrl: `/api/content-items/${voiceId}/audio`,
    duration: estimatedDuration,
    voiceId,
    status: "success",
    message: "Voice generated successfully",
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<GenerateVoiceResponse>> {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        audioUrl: "",
        duration: 0,
        voiceId: "",
        status: "error",
        message: "Content item ID is required",
      },
      { status: 400 }
    );
  }

  let requestBody: GenerateVoiceRequest;
  try {
    requestBody = (await request.json()) as GenerateVoiceRequest;
  } catch {
    return NextResponse.json(
      {
        audioUrl: "",
        duration: 0,
        voiceId: "",
        status: "error",
        message: "Invalid JSON in request body",
      },
      { status: 400 }
    );
  }

  const {
    text,
    voiceId = DEFAULT_VOICE_ID,
    modelId = DEFAULT_MODEL_ID,
    stability = DEFAULT_STABILITY,
    similarityBoost = DEFAULT_SIMILARITY_BOOST,
  } = requestBody;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      {
        audioUrl: "",
        duration: 0,
        voiceId: "",
        status: "error",
        message: "Text field is required and must be a non-empty string",
      },
      { status: 400 }
    );
  }

  if (stability < 0 || stability > 1 || similarityBoost < 0 || similarityBoost > 1) {
    return NextResponse.json(
      {
        audioUrl: "",
        duration: 0,
        voiceId: "",
        status: "error",
        message: "Stability and similarityBoost must be between 0 and 1",
      },
      { status: 400 }
    );
  }

  try {
    const result = await generateVoiceWithAPI(
      text,
      voiceId,
      modelId,
      stability,
      similarityBoost
    );
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        audioUrl: "",
        duration: 0,
        voiceId: "",
        status: "error",
        message: `Failed to generate voice: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<VoicesResponse>> {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        voices: [],
        status: "error",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    voices: AVAILABLE_VOICES,
    status: "success",
  });
}
